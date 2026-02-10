const express = require("express");
const {
  getNotifications,
  markAsRead,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getNotifications);
router.put("/mark-read", protect, markAsRead);

module.exports = router;
