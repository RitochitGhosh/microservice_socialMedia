const mongoose = require("mongoose");

const logger = require("../utils/logger");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        logger.info("MongoDB connected successfully");
    } catch (error) {
        logger.error("MONGODB_CONNECTION_ERROR: ", error);
        process.exit(1);
    }
}

module.exports = connectDB;