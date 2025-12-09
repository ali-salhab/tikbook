const express = require("express");
const {
  getUserProfile,
  followUser,
  unfollowUser,
  updateUserProfile,
  getAllUsers,
  updateFcmToken,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAllUsers);
router.put("/fcm-token", protect, updateFcmToken);
router.get("/:id", getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/:id/follow", protect, followUser);
router.put("/:id/unfollow", protect, unfollowUser);

module.exports = router;
