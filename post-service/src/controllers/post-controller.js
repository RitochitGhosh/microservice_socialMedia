const Post = require("../models/Post.model");
const Media = require("../models/Media.model");
const logger = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");
const { publishEvent } = require("../utils/rabbitmq");

const invalidatePostCache = async (req, input) => {
    // invalidate on respective post deletion
    const cachedKey = `post:${input}`;
    await req.redisClient.del(cachedKey);

    // invalidate all posts on new post creation
    const keys = await req.redisClient.keys("posts:*");
    if (keys.length > 0) {
        await req.redisClient.del(keys);
    }
}

const createPost = async (req, res) => {
    logger.info("CREATE_POST_CONTROLLER: endpoint reached");

    try {
        const { error } = validateCreatePost(req.body);
        if (error) {
            logger.warn("Validation error: ", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: req.details[0].message,
            });
        }

        const { content, mediaIds } = req.body;
        const post = new Post({
            user: req.user.userId,
            content: content,
            mediaIds: mediaIds || [],
        });
        await post.save();

        await publishEvent("post.created", {
            postId: post._id.toString(),
            userId: req.user.userId,
            content: post.content,
            createdAt: post.createdAt,
        });

        await invalidatePostCache(req, post._id.toString());

        logger.info("Post created successfully", post);
        res.status(201).json({
            success: true,
            message: "Post created successfully",
        });

    } catch (error) {
        logger.error("CREATE_POST_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const getAllPosts = async (req, res) => {
    logger.info("GET_ALL_POST_CONTROLLER: endpoint reached");

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;
        // Try to fetch posts from redis cache
        const cachedPosts = await req.redisClient.get(cacheKey);
        logger.info(`Cached key: ${cacheKey}`);

        if (cachedPosts) {
            logger.info(`Cache hit for key: ${cacheKey}`);
            return res.json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find({})
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit)
            .populate("mediaIds", "url publicId originalName mimeType"); // only return required fields


        const totalNoOfPosts = await Post.countDocuments();

        const result = {
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalNoOfPosts / limit),
            totalPosts: totalNoOfPosts,
        };

        // save posts in redis cache
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result)); // key, duration(secs) -> 5m, data (String)

        logger.info(`Cache set for key: ${cacheKey}`);
        res.json(result);

    } catch (error) {
        logger.error("GET_ALL_POST_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const getPost = async (req, res) => {
    logger.info("GET_POST_CONTROLLER: endpoint reached");

    try {
        const postId = req.params.id;
        const cacheKey = `post:${postId}`;

        const cachedPost = await req.redisClient.get(cacheKey);

        if (cachedPost) {
            logger.info(`Cache hit for key: ${cacheKey}`);
            return res.json(JSON.parse(cachedPost))
        }

        const post = await Post.findById(postId)
            .populate({
                path: "mediaIds",
                model: "Media",
                select: "url publicId mimeType originalName -_id",
            });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        await req.redisClient.setex(cacheKey, 3600, JSON.stringify(post));

        logger.info(`Cache set for key: ${cacheKey}`);
        res.json(post);
    } catch (error) {
        logger.error("GET_POST_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const deletePost = async (req, res) => {
    try {
        const post = await Post.findOneAndDelete({
            _id: req.params.id,
            user: req.user.userId,
        });

        if (!post) {
            logger.warn("Post not found");
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }

        // publish post delete method
        await publishEvent('post.deleted', {
            postId: post._id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds,
        });

        await invalidatePostCache(req, req.params.id);
        logger.info(`Cache removed for key: post:${req.params.id}`);

        res.json({
            success: true,
            message: "Post and associated media deleted successfully",
        });

    } catch (error) {
        logger.error("DELETE_POST_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Error deleting post",
        });
    }
};


module.exports = {
    createPost,
    getAllPosts,
    getPost,
    deletePost,
}
