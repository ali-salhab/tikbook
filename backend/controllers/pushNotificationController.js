const User = require("../models/User");
const { sendPushNotification } = require("../services/firebaseService");

// Update user's push token
const updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.pushToken = pushToken;
    await user.save();

    res.json({ message: "Push token updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send notification to user
const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user || (!user.pushToken && !user.fcmToken)) {
      return null;
    }

    const token = user.fcmToken || user.pushToken;
    return await sendPushNotification(token, title, body, data);
  } catch (error) {
    console.error("Error sending notification to user:", error);
    return null;
  }
};

module.exports = {
  updatePushToken,
  sendNotificationToUser,
};
