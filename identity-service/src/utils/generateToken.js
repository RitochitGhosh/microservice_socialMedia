const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const RefreshToken = require("../models/RefreshToken.model");

const generateTokens = async (user) => {
    // Delete all old refresh tokens for this user
    await RefreshToken.deleteMany({ user: user._id });

    const accessToken = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "60m" }, // TODO: "15m"
    );

    const refreshToken = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt,
    });

    return { accessToken, refreshToken };
};

module.exports = generateTokens;