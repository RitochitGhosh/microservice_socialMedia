require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");


const connectDB = require("./database/db");
const mediaRoutes = require("./routes/media-service");
const logger = require("./utils/logger");
const errorHandler = require("./middlewares/errorHandler");
const { sensitiveRateLimiter } = require("./config/rate-limiter-config");
const { requestLogger } = require("../../post-service/src/middlewares/custom-middleware");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const { handlePostDeleted } = require("./eventHandlers/handle-post-deleted");

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(requestLogger);

connectDB();

app.use("/api/media/upload", sensitiveRateLimiter(15));
app.use("/api/media/get", sensitiveRateLimiter(50));


app.use("/api/media", mediaRoutes);


app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    // consume all the events
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Media service running on port: ${PORT}`);
    });

  } catch (error) {
    logger.error("Failed to start server ", error);
    process.exit(1);
  }
}

startServer();

// unhandled proise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});