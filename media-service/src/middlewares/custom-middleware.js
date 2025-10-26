const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
    const timeStamp = new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    logger.info(`[${timeStamp}]: Received ${req.method} request at ${req.url}`);
    // logger.info(`Request Body: ${req.body}`);

    next();
}


module.exports = {
    requestLogger,
}
