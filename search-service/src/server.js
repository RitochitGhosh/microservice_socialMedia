require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const searchRoutes = require("./routes/search.routes");
const {
  handlePostCreated,
  handlePostDeleted,
} = require("./eventhandlers/search-event-handler");
const connectDB = require("./database/db");
const redisClient =require("./config/redis-config");

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(helmet());
app.use(express.json());

//connect to mongodb
connectDB();

app.use("/api/search", (req, res, next) => {
  req.redisClient = redisClient;
  next();
}, searchRoutes)

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});


app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    //consume the events / subscribe to the events
    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Search service is running on port: ${PORT}`);
    });
  } catch (e) {
    logger.error(e, "Failed to start search service");
    process.exit(1);
  }
}

startServer();