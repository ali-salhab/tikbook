const Notification = require("../models/Notification");

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate("fromUser", "username profileImage")
      .populate("video", "videoUrl")
      .sort({ createdAt: -1 });

    console.log(
      `📧 Fetched ${notifications.length} notifications for user ${req.user._id}`,
    );
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });
    console.log(`📊 Unread count for user ${req.user._id}: ${count}`);
    res.json({ count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true },
    );
    console.log(
      `✅ Marked ${result.modifiedCount} notifications as read for user ${req.user._id}`,
    );
    res.json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead };
