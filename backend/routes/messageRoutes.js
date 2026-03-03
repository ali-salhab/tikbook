const express = require("express");
const {
  getMessages,
  sendMessage,
  getConversations,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.route("/").post(protect, imageUpload.single("image"), sendMessage);
router.get("/conversations", protect, getConversations);
router.route("/:userId").get(protect, getMessages);

module.exports = router;
