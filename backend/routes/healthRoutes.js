const express = require("express");
const router = express.Router();

// @desc    Check server health and configuration
// @route   GET /api/health
// @access  Public
router.get("/", (req, res) => {
    const health = {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        mongodb: !!process.env.MONGO_URI ? "Configured" : "Missing",
        cloudinary: {
            cloudName: !!process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Missing",
            apiKey: !!process.env.CLOUDINARY_API_KEY ? "Set" : "Missing",
            apiSecret: !!process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing",
        },
        agora: {
            appId: !!process.env.AGORA_APP_ID ? "Set" : "Missing",
            certificate: !!process.env.AGORA_APP_CERTIFICATE ? "Set" : "Missing",
        },
    };

    res.json(health);
});

module.exports = router;
