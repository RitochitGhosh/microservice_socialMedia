const Media = require("../models/Media.model");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");


const uploadMedia = async (req, res) => {
    logger.info("UPLOAD_MEDIA_CONTROLLER: endpoint hit");

    try {
        if (!req.file) {
            logger.error("No file found. Please add a file and try again");
            return res.status(400).json({
                success: false,
                message: "No file found. Please add a file and try again",
            });
        }

        const { originalname, mimetype, buffer } = req.file;
        const userId = req.user.userId;

        logger.info(`File details: name= ${originalname}, type= ${mimetype}`);
        logger.info("Uploading to cloudinary starting...");

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

        logger.info(`Cloudinary upload successfully. Public Id: - ${cloudinaryUploadResult.public_id}`);

        const newlyCreatedMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName: originalname,
            mimeType: mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId,
        });

        await newlyCreatedMedia.save();

        res.status(201).json({
            success: true,
            mediaId: newlyCreatedMedia._id,
            url: newlyCreatedMedia.url,
            message: "Media upload is successfull"
        })
    } catch (error) {
        logger.error("UPLOAD_MEDIA_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Error creating media",
        });
    }
}

const getAllMedia = async (req, res) => {
    logger.info("GET_ALL_MEDIA_CONTROLLER: endpoint reached");

    try {
        const results = await Media.find({});

        res.json({ results });

    } catch (error) {
        logger.error("GET_ALL_MEDIA_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Error fetching medias",
        });
    }
}

module.exports = {
    uploadMedia,
    getAllMedia,
}
