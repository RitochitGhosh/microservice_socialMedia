const { RateLimiterRedis } = require("rate-limiter-flexible");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const redisClient  = require("./redis-config");

const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "middleware",
    points: 5,
    duration: 1,
});

const redisRateLimiter = async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip);
        next();
    } catch (err) {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests, please try again later.",
        });
    }
}

// IP based rate limiter for sensitive endpoints
const sensitiveRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests"
        });
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    }),
});


module.exports = {
    redisRateLimiter,
    sensitiveRateLimiter,
}
