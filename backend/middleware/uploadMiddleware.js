const multer = require("multer");
const path = require("path");

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

// Image upload configuration
const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = file.mimetype.startsWith("image/");

    if (extname && mimetype) {
      return cb(null, true);
    }
    return cb(new Error("الملف يجب أن يكون صورة!"));
  },
});

// Video upload configuration (for reuse)
const videoUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
  fileFilter: function (req, file, cb) {
    // Accept both video and image files in the "video" field
    if (file.fieldname === "video") {
      const filetypes = /mp4|mov|avi|mkv|3gp|jpeg|jpg|png|gif|webp/;
      const extname = filetypes.test(
        path.extname(file.originalname).toLowerCase(),
      );
      const isVideo = file.mimetype.startsWith("video/");
      const isImage = file.mimetype.startsWith("image/");

      if (extname || isVideo || isImage) return cb(null, true);
      return cb(new Error("الملف يجب أن يكون فيديو أو صورة!"));
    }

    if (file.fieldname === "sound") {
      const mimetype = file.mimetype.startsWith("audio/");
      if (mimetype) return cb(null, true);
      return cb(new Error("الملف يجب أن يكون ملف صوتي!"));
    }

    return cb(new Error("نوع الملف غير مدعوم"));
  },
});

// Gift upload configuration (Images, Videos, and Lottie JSON)
const giftUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for videos)
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp|json|mp4|mov|avi|mkv/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isJson =
      file.mimetype === "application/json" ||
      file.originalname.endsWith(".json");

    if (extname || isImage || isJson || isVideo) {
      return cb(null, true);
    }
    return cb(
      new Error("الملف يجب أن يكون صورة، فيديو، أو ملف Lottie (JSON)!"),
    );
  },
});

module.exports = {
  imageUpload,
  videoUpload,
  giftUpload,
};
