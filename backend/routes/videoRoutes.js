const express = require("express");
const {
  getVideos,
  createVideo,
  likeVideo,
  commentVideo,
  getUserVideos,
  getVideoComments,
  getFollowingVideos,
  likeComment,
  deleteComment,
} = require("../controllers/videoController");
const { protect } = require("../middleware/authMiddleware");
const { videoUpload, imageUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router
  .route("/")
  .get(getVideos)
  .post(
    protect,
    videoUpload.fields([
      { name: "video", maxCount: 5 }, // allow multiple media files (video or image)
      { name: "sound", maxCount: 1 },
    ]),
    createVideo,
  );
router.route("/following").get(protect, getFollowingVideos);
router.route("/user/:id").get(getUserVideos);
router.route("/:id/like").put(protect, likeVideo);
router
  .route("/:id/comment")
  .post(protect, imageUpload.single("image"), commentVideo);
router.route("/:id/comments").get(getVideoComments);
router.route("/:id/comments/:commentId/like").put(protect, likeComment);
router.route("/:id/comments/:commentId").delete(protect, deleteComment);

module.exports = router;
