const express = require("express");
const {
  getVideos,
  createVideo,
  likeVideo,
  commentVideo,
  getUserVideos,
  getVideoComments,
} = require("../controllers/videoController");
const { protect } = require("../middleware/authMiddleware");
const { videoUpload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router
  .route("/")
  .get(getVideos)
  .post(
    protect,
    videoUpload.fields([
      { name: "video", maxCount: 1 },
      { name: "sound", maxCount: 1 },
    ]),
    createVideo
  );
router.route("/user/:id").get(getUserVideos);
router.route("/:id/like").put(protect, likeVideo);
router.route("/:id/comment").post(protect, commentVideo);
router.route("/:id/comments").get(getVideoComments);

module.exports = router;
