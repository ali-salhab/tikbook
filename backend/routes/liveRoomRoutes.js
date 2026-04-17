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
  rejectHandRaise,
  makeSpeaker,
  removeSpeaker,
  toggleMute,
  getMyLiveRooms,
  endLiveRoom,
  kickUser,
  banUser,
  unbanUser,
  assignModerator,
  removeModerator,
  controlMusic,
  getAgoraToken,
  updateRoomSettings,
  forceMute,
} = require("../controllers/liveRoomController");
const { protect } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", getActiveLiveRooms);
router.get("/:roomId", getLiveRoom);

// Protected routes
router.post(
  "/create",
  protect,
  imageUpload.single("coverImage"),
  createLiveRoom,
);
router.post("/:roomId/join", protect, joinLiveRoom);
router.post("/:roomId/leave", protect, leaveLiveRoom);
router.post("/:roomId/raise-hand", protect, raiseHand);
router.post("/:roomId/lower-hand", protect, lowerHand);
router.post("/:roomId/reject-hand/:userId", protect, rejectHandRaise);
router.post("/:roomId/make-speaker", protect, makeSpeaker);
router.post("/:roomId/make-speaker/:userId", protect, makeSpeaker);
router.post("/:roomId/remove-speaker", protect, removeSpeaker);
router.post("/:roomId/toggle-mute", protect, toggleMute);
router.post("/:roomId/force-mute", protect, forceMute);
router.post("/:roomId/end", protect, endLiveRoom);
router.get("/my/rooms", protect, getMyLiveRooms);

// Room management (host/moderator)
router.post("/:roomId/kick", protect, kickUser);
router.post("/:roomId/ban", protect, banUser);
router.post("/:roomId/unban", protect, unbanUser);
router.post("/:roomId/assign-moderator", protect, assignModerator);
router.post("/:roomId/remove-moderator", protect, removeModerator);

// Music control (host only)
router.post("/:roomId/music", protect, controlMusic);

// Room settings (host only)
router.patch("/:roomId/settings", protect, updateRoomSettings);

// Agora token
router.post("/agora-token", protect, getAgoraToken);

module.exports = router;
