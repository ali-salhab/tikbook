const Notification = require("../models/Notification");

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const hasPagination = req.query.page || req.query.limit;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "15", 10), 1),
      50,
    );

    const query = Notification.find({ user: req.user._id })
      .populate("fromUser", "username profileImage")
      .populate("video", "videoUrl")
      .sort({ createdAt: -1 });

    if (hasPagination) {
      query.skip((page - 1) * limit).limit(limit);
    }

    const notifications = await query;

    console.log(
      `📧 Fetched ${notifications.length} notifications for user ${req.user._id}${hasPagination ? ` (page ${page}, limit ${limit})` : ""}`,
    );

    if (hasPagination) {
      const total = await Notification.countDocuments({ user: req.user._id });
      return res.json({
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      });
    }

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

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markOneAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true },
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Error marking single notification as read:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markOneAsRead };
