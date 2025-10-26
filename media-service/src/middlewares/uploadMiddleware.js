const multer = require("multer");
const logger = require("../utils/logger");

// configure multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
}).single("file");

const uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            logger.error("Multer error while uploading: ", err);
            return res.status(400).json({
                success: false,
                message: "Multer error while uploading",
                error: err.message,
                stack: err.stack,
            });
        }
        else if (err) {
            logger.error("Unknown error occured while uploading:", err);
            return res.status(500).json({
                message: "Unknown error occured while uploading",
                error: err.message,
                stack: err.stack,
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file found!",
            });
        }

        next();
    });
}

module.exports = {
    uploadMiddleware,
}
