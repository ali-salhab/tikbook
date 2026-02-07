const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  generateLiveKitToken,
  listLiveKitRooms,
  endLiveKitRoom,
} = require("../controllers/livekitController");

const router = express.Router();

router.post("/token", protect, generateLiveKitToken);
router.get("/rooms", protect, listLiveKitRooms);
router.post("/end", protect, endLiveKitRoom);

module.exports = router;
