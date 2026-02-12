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
const auth = require("../middleware/authMiddleware");

// Public routes
router.get("/", getActiveLiveRooms);
router.get("/:roomId", getLiveRoom);

// Protected routes
router.post("/create", auth, createLiveRoom);
router.post("/:roomId/join", auth, joinLiveRoom);
router.post("/:roomId/leave", auth, leaveLiveRoom);
router.post("/:roomId/raise-hand", auth, raiseHand);
router.post("/:roomId/lower-hand", auth, lowerHand);
router.post("/:roomId/make-speaker", auth, makeSpeaker);
router.post("/:roomId/remove-speaker", auth, removeSpeaker);
router.post("/:roomId/toggle-mute", auth, toggleMute);
router.post("/:roomId/end", auth, endLiveRoom);
router.get("/my/rooms", auth, getMyLiveRooms);

module.exports = router;
