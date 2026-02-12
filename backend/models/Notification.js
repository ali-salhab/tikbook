const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String, // 'like', 'comment', 'follow', 'admin', 'admin_broadcast', 'system', 'announcement', 'promo', 'update'
      required: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Changed to false to allow system/admin notifications
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    title: {
      type: String,
      required: false, // Optional title for admin/system notifications
    },
    message: {
      type: String,
      required: false, // Optional message for admin/system notifications
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
