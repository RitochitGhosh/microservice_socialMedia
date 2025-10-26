const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("../utils/logger");
const redisClient = require("./redis-config");

const rateLimitOptions = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`API_Gateway rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later."
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});

module.exports = {
    rateLimitOptions,
}
