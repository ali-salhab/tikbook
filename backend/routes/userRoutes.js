const express = require("express");
const {
  getUserProfile,
  followUser,
  unfollowUser,
  updateUserProfile,
  uploadProfileImage,
  getAllUsers,
  searchUsers,
  updateFcmToken,
  getSuggestedUsers,
  getMyConnections,
  getFollowersList,
  getFollowingList,
} = require("../controllers/userController");
const { protect, protectOptional } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", getAllUsers);
router.get("/search", searchUsers);
router.get("/suggestions", protect, getSuggestedUsers);
router.get("/my-connections", protect, getMyConnections);
router.put("/fcm-token", protect, updateFcmToken);
router.get("/:id/followers", protectOptional, getFollowersList);
router.get("/:id/following", protectOptional, getFollowingList);
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
