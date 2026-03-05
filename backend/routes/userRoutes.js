const express = require("express");
const {
  getUserProfile,
  followUser,
  unfollowUser,
  updateUserProfile,
  uploadProfileImage,
  getAllUsers,
  updateFcmToken,
  getSuggestedUsers,
  getMyConnections,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getAllUsers);
router.get("/suggestions", protect, getSuggestedUsers);
router.get("/my-connections", protect, getMyConnections);
router.put("/fcm-token", protect, updateFcmToken);
router.get("/:id", getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put(
  "/profile/image",
  protect,
  imageUpload.single("image"),
  uploadProfileImage,
);
router.put("/:id/follow", protect, followUser);
router.put("/:id/unfollow", protect, unfollowUser);

module.exports = router;
