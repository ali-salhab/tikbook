const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markOneAsRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.put("/mark-read", protect, markAsRead);
router.put("/:id/read", protect, markOneAsRead);

module.exports = router;
