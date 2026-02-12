const express = require("express");
const router = express.Router();
const {
  createLiveRoom,
  getActiveLiveRooms,
  getLiveRoom,
  joinLiveRoom,
  leaveLiveRoom,
  raiseHand,
  lowerHand,
  makeSpeaker,
  removeSpeaker,
  toggleMute,
  getMyLiveRooms,
  endLiveRoom,
} = require("../controllers/liveRoomController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getActiveLiveRooms);
router.get("/:roomId", getLiveRoom);

// Protected routes
router.post("/create", protect, createLiveRoom);
router.post("/:roomId/join", protect, joinLiveRoom);
router.post("/:roomId/leave", protect, leaveLiveRoom);
router.post("/:roomId/raise-hand", protect, raiseHand);
router.post("/:roomId/lower-hand", protect, lowerHand);
router.post("/:roomId/make-speaker", protect, makeSpeaker);
router.post("/:roomId/remove-speaker", protect, removeSpeaker);
router.post("/:roomId/toggle-mute", protect, toggleMute);
router.post("/:roomId/end", protect, endLiveRoom);
router.get("/my/rooms", protect, getMyLiveRooms);

module.exports = router;
