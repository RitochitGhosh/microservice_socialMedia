const RefreshToken = require("../models/RefreshToken.model");
const User = require("../models/User.model");

const logger = require("../utils/logger");
const { validateRegistration, validatelogin } = require("../utils/validation");
const generateTokens = require("../utils/generateToken");

// user registration
const registerUser = async (req, res) => {
    logger.info("REGISTER_USER_CONTROLLER: endpoint reached");

    try {
        const { error } = validateRegistration(req.body);
        if (error) {
            logger.warn("Validation error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const { username, email, password } = req.body;

        let existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            logger.warn("User already exists");
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        const user = new User({
            username,
            email,
            password
        });
        await user.save();

        logger.warn("User saved successfully", user._id);
        const { accessToken, refreshToken } = await generateTokens(user);

        res.status(201).json({
            success: true,
            message: "User registered successfully!",
            accessToken,
            refreshToken,
        });
    } catch (error) {
        logger.error("REGISTRATION_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

// user login
const loginUser = async (req, res) => {
    logger.info("LOGIN_USER_CONTROLLER: endpoint reached");

    try {
        const { error } = validatelogin(req.body);
        if (error) {
            logger.warn("Validation error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            logger.warn("User not found");
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            logger.warn("Invalid password");
            return res.status(400).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        logger.warn("User logged in successfully", user._id);
        const { accessToken, refreshToken } = await generateTokens(user);

        res.status(200).json({
            success: true,
            message: "User logged in successfully!",
            accessToken,
            refreshToken,
            userId: user._id,
        });
    } catch (error) {
        logger.error("LOGIN_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

// refresh token
const refreshTokenController = async (req, res) => {
  logger.info("REFRESH_TOKEN_CONTROLLER: endpoint hit");

  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({ success: false, message: "Refresh token missing" });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      logger.warn("Invalid refresh token");
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    if (new Date(storedToken.expiresAt) < new Date()) {
      await RefreshToken.deleteOne({ token: refreshToken });
      logger.warn("Expired refresh token deleted");
      return res.status(401).json({ success: false, message: "Expired refresh token" });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      await RefreshToken.deleteOne({ token: refreshToken });
      logger.warn("User not found for refresh token");
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Delete old token first to prevent reuse
    await RefreshToken.deleteOne({ token: refreshToken });

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("REFRESH_TOKEN_ERROR:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// logout
const logoutUser = async (req, res) => {
    logger.info("LOGOUT_CONTROLLER: endpoint hit");

    try {

        const { refreshToken } = req.body;
        if (!refreshToken) {
            logger.warn("Refrsh Token missing");
            return res.status(400).json({
                success: false,
                message: "Refresh Token missing"
            });
        }

        await RefreshToken.deleteOne({ token: refreshToken });
        logger.info("Refresh token deleted for logout");

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        logger.error("REFRESHTOKEN_ERROR: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

module.exports = {
    registerUser,
    loginUser,
    refreshTokenController,
    logoutUser,
}
