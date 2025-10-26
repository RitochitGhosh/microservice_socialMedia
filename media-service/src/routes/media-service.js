const express = require("express");
const multer = require("multer");

const { uploadMedia, getAllMedia } = require("../controllers/media-controller");
const { authenticateRequest } = require("../middlewares/authMiddleware");
const { uploadMiddleware } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.post("/upload", authenticateRequest, uploadMiddleware, uploadMedia);
router.get("/medias", authenticateRequest, getAllMedia);


module.exports = router;