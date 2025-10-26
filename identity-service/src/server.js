require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const Redis = require("ioredis");

const connectDB = require("./database/db");
const { configureCors } = require("./config/cors-config");
const logger = require("./utils/logger");
const { requestLogger } = require("./middlewares/custom-middleware");
const { redisRateLimiter, sensitiveRateLimiter } = require("./config/rate-limiter-config");
const AuthRoutes = require("./routes/identity-service");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;

// connect to db
connectDB();

// middlewares
app.use(helmet());
app.use(configureCors());
app.use(express.json());

app.use(requestLogger);

// DDos protection and rate limiting
app.use(redisRateLimiter);

app.use("/api/auth/register", sensitiveRateLimiter);
app.use("/api/auth/login", sensitiveRateLimiter);


// Routes
app.use("/api/auth", AuthRoutes);



// Error handler
app.use(errorHandler);


app.listen(PORT, () => {
    logger.info(`Identity service running on port ${PORT}`);
});

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});
