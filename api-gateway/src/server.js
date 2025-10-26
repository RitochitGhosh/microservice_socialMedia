require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const proxy = require("express-http-proxy");

const { requestLogger, urlVersioning } = require("./middlewares/custom-middleware");
const { validateToken } = require("./middlewares/authMiddleware");
const { rateLimitOptions } = require("./config/rate-limiter-config");
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(requestLogger);
app.use(urlVersioning("v1"));

app.use(rateLimitOptions);

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/, "/api");
    },
    proxyErrorHandler: (err, req, res) => {
        logger.error(`PROXY_ERROR: ${err.message}`);
        res.status(500).json({
            success: false,
            message: `Internal server error`,
            error: err.message,
        });
    },
};

//setting up proxy for identity service
// localhost:3000/v1/auth/register -> localhost:3001/api/auth/register
app.use(
    "/v1/auth",
    proxy(process.env.IDENTITY_SERVICE_URL, {
        ...proxyOptions,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            proxyReqOpts.headers["Content-Type"] = "application/json";
            return proxyReqOpts;
        },
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            logger.info(`Response received from Identity service: ${proxyRes.statusCode}`);
            return proxyResData;
        }
    })
);

//setting up proxy for posts service
app.use(
    "/v1/posts",
    validateToken,
    proxy(process.env.POST_SERVICE_URL, {
        ...proxyOptions,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            proxyReqOpts.headers["Content-Type"] = "application/json";
            proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
            return proxyReqOpts;
        },
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            logger.info(`Response received from Posts service: ${proxyRes.statusCode}`);
            return proxyResData;
        }
    }),
);

//setting up proxy for media service
app.use(
    "/v1/media",
    validateToken,
    proxy(process.env.MEDIA_SERVICE_URL, {
        ...proxyOptions,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

            if (!srcReq.headers['content-type'].startsWith('multipart/form-data')) {
                proxyReqOpts.headers["Content-Type"] = "application/json";
            }

            return proxyReqOpts;
        },
        userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
            logger.info(`Response received from Media service: ${proxyRes.statusCode}`);
            return proxyResData;
        },
        parseReqBody: false,
    }),
);

app.listen(PORT, () => {
    logger.info(`API Gateway is running on port ${PORT}`);
    logger.info(`Identity service is running on: ${process.env.IDENTITY_SERVICE_URL}`);
    logger.info(`Post service is running on: ${process.env.POST_SERVICE_URL}`);
    logger.info(`Media service is running on: ${process.env.MEDIA_SERVICE_URL}`);
    logger.info(`Redis Url: ${process.env.REDIS_URL}`);
});

