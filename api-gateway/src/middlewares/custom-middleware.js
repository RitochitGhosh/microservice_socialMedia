const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
    const timeStamp = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    logger.info(`[${timeStamp}]: Received ${req.method} request at ${req.url}`);
    logger.info(`Request Body: ${req.body}`);

    next();
}

const urlVersioning = (version) => (req, res, next) => {
    if (req.path.startsWith(`/${version}`)) {
        next();
    }
    else {
        logger.error("API  version mismatch");
        res.status(404).json({
            success: false,
            error: "API  version is not supported",
        });
    }
};

module.exports = {
    requestLogger,
    urlVersioning,
}
