require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const logger = require("./utils/logger");
const connectDB = require("./database/db");
const { requestLogger } = require("./middlewares/custom-middleware");
const postRoutes = require("./routes/post-service");
const errorHandler = require("./middlewares/errorHandler");
const redisClient = require("./config/redis-config");
const { sensitiveRateLimiter } = require("./config/rate-limiter-config");
const { connectToRabbitMQ } = require("./utils/rabbitmq");


const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use(requestLogger);

// Connect to Database
connectDB();

// Protecting sensitive endpoint
app.use("/api/posts/create-post", sensitiveRateLimiter(15)); // TODO: 15
app.use("api/posts/posts", sensitiveRateLimiter(50));
app.use("api/posts/post/:id", sensitiveRateLimiter(50));
app.use("api/posts/deleete-post", sensitiveRateLimiter(30));

app.use("/api/posts", (req, res, next) => {
  req.redisClient = redisClient;
  next();
}, postRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    app.listen(PORT, () => {
      logger.info(`Post Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server ", error);
    process.exit(1);
  }
}

startServer();

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});