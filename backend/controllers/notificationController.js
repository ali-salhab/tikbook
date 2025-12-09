const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id })
        .populate('fromUser', 'username profileImage')
        .populate('video', 'videoUrl')
        .sort({ createdAt: -1 });

    res.json(notifications);
};

module.exports = { getNotifications };
