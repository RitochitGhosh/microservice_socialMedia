const Search = require("../models/Search.model");
const logger = require("../utils/logger");

const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit!");
  try {
    const { query } = req.query;

    const cacheKey = `search:${query}`;
    const cachedSearch = await req.redisClient.get(cacheKey); // finding cache
    logger.info(`Cached key: ${cacheKey}`);

    if (cachedSearch) {
      logger.info(`Cache hit for key: ${cacheKey}`);
      return res.json(JSON.parse(cachedSearch));
    }

    // cache miss
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    await req.redisClient.setex(cacheKey, 120, JSON.stringify(results)); // caching
    logger.info(`Cache set for key: ${cacheKey}`);

    res.json(results);
  } catch (e) {
    logger.error("Error while searching post", error);
    res.status(500).json({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };