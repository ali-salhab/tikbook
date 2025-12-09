const express = require("express");
const {
  getMessages,
  sendMessage,
  getConversations,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, sendMessage);
router.get("/conversations", protect, getConversations);
router.route("/:userId").get(protect, getMessages);

module.exports = router;
