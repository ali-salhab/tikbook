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

// Gift upload configuration (Images, Videos, Lottie JSON, 3D Models, and Audio)
const giftUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes =
      /jpeg|jpg|png|gif|webp|json|mp4|mov|avi|mkv|glb|gltf|mp3|wav|ogg|m4a/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");
    const isJson =
      file.mimetype === "application/json" ||
      file.originalname.endsWith(".json");
    const is3D =
      file.originalname.endsWith(".glb") || file.originalname.endsWith(".gltf");

    if (extname || isImage || isJson || isVideo || isAudio || is3D) {
      return cb(null, true);
    }
    return cb(
      new Error(
        "الملف يجب أن يكون صورة، فيديو، صوت، ملف 3D (GLB/GLTF)، أو ملف Lottie (JSON)!",
      ),
    );
  },
});

// Status upload — accepts both images AND videos in the "image" field
const statusUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (videos can be large)
  },
  fileFilter: function (req, file, cb) {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    if (isImage || isVideo) return cb(null, true);
    return cb(new Error("الملف يجب أن يكون صورة أو فيديو!"));
  },
});

// General admin upload — accepts images, lottie JSON, audio, video
const adminUpload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: function (req, file, cb) {
    const isImage = file.mimetype.startsWith("image/");
    const isAudio = file.mimetype.startsWith("audio/");
    const isVideo = file.mimetype.startsWith("video/");
    const isJson =
      file.mimetype === "application/json" ||
      file.originalname.toLowerCase().endsWith(".json");
    if (isImage || isAudio || isVideo || isJson) return cb(null, true);
    return cb(new Error("نوع الملف غير مدعوم"));
  },
});

module.exports = {
  imageUpload,
  videoUpload,
  giftUpload,
  statusUpload,
  adminUpload,
};
