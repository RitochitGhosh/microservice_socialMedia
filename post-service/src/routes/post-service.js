const express = require("express");

const { authenticateRequest } = require("../middlewares/authMiddleware");

const {
    createPost,
    getAllPosts,
    getPost,
    deletePost,
} = require("../controllers/post-controller");


const router = express.Router();

// Auth middleware
router.use(authenticateRequest);

router.post("/create-post", createPost);
router.get("/posts", getAllPosts);
router.get("/:id", getPost);
router.delete("/:id", deletePost);


module.exports = router;
