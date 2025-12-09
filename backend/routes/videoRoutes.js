const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  getVideos,
  createVideo,
  likeVideo,
  commentVideo,
  getUserVideos,
  getVideoComments,
} = require("../controllers/videoController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow video for 'video' field and audio for 'sound' field
    if (file.fieldname === "video") {
      const filetypes = /mp4|mov|avi|mkv|3gp/;
      const extname = filetypes.test(
        path.extname(file.originalname).toLowerCase()
      );
      const mimetype = file.mimetype.startsWith("video/");
      if (extname || mimetype) return cb(null, true);
      return cb(new Error("الملف يجب أن يكون فيديو!"));
    }

    if (file.fieldname === "sound") {
      const mimetype = file.mimetype.startsWith("audio/");
      if (mimetype) return cb(null, true);
      return cb(new Error("الملف يجب أن يكون ملف صوتي!"));
    }

    // Default reject
    return cb(new Error("نوع الملف غير مدعوم"));
  },
});

router
  .route("/")
  .get(getVideos)
  .post(
    protect,
    upload.fields([
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
