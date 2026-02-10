const express = require("express");
const router = express.Router();
const {
  updatePushToken,
} = require("../controllers/pushNotificationController");
const { protect } = require("../middleware/authMiddleware");
const { sendPushNotification } = require("../services/firebaseService");

router.post("/token", protect, updatePushToken);

// Test endpoint to send notification
router.post("/test", protect, async (req, res) => {
  try {
    const { title, body, data } = req.body;
    const user = req.user;

    if (!user.pushToken && !user.fcmToken) {
      return res.status(400).json({
        message: "No push token found for this user",
        hint: "Make sure the app has registered a push token",
      });
    }

    const token = user.fcmToken || user.pushToken;
    const result = await sendPushNotification(
      token,
      title || "اشعار تجريبي من TikBook",
      body || "هذا اشعار تجريبي",
      data || {},
    );

    if (result) {
      res.json({
        success: true,
        message: "Test notification sent successfully",
        token: token,
        result: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send notification",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
