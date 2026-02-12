const Video = require("../models/Video");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendNotificationToUser } = require("./pushNotificationController");
// const { uploadFileToStorage } = require("../services/firebaseService"); // Sending to Cloudinary now
const { uploadToCloudinary } = require("../services/cloudinaryService");
const fs = require("fs");
const path = require("path");

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
const getVideos = async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload a video
// @route   POST /api/videos
// @access  Private
const createVideo = async (req, res) => {
  try {
    console.log("=== Video Upload Request ===");
    console.log("Body:", req.body);
    console.log("Files:", req.files);
    console.log("User:", req.user?._id);

    // Multer with fields will put files in req.files as arrays keyed by fieldname
    const mediaFiles = (req.files && req.files.video) || [];
    const soundFile = req.files && req.files.sound ? req.files.sound[0] : null;

    if (!mediaFiles.length) {
      return res.status(400).json({ message: "لم يتم رفع أي ملف وسائط" });
    }

    const { description } = req.body;

    if (!description || description.trim() === "") {
      return res.status(400).json({ message: "الوصف مطلوب" });
    }

    // Validate file size (100MB per file)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    for (const file of mediaFiles) {
      if (file.size > maxSize) {
        return res.status(400).json({
          message: `حجم الملف كبير جداً (${file.originalname}). الحد الأقصى 100 ميجابايت`,
        });
      }
    }

    // Upload media files to Cloudinary
    let mediaResults = [];
    try {
      // Check Cloudinary configuration
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        console.error("❌ Cloudinary credentials missing!");
        throw new Error(
          "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.",
        );
      }

      // Check if credentials are still placeholders
      if (
        process.env.CLOUDINARY_CLOUD_NAME.includes("your_") ||
        process.env.CLOUDINARY_API_KEY.includes("your_") ||
        process.env.CLOUDINARY_API_SECRET.includes("your_")
      ) {
        console.error("❌ Cloudinary credentials are placeholders!");
        throw new Error(
          "Cloudinary credentials are still placeholder values. Please update them with actual values from Cloudinary dashboard.",
        );
      }

      for (const file of mediaFiles) {
        console.log("📤 Uploading media to Cloudinary...");
        console.log("   File path:", file.path);
        console.log(
          "   File size:",
          (file.size / 1024 / 1024).toFixed(2),
          "MB",
        );

        const url = await uploadToCloudinary(file.path, "videos", "auto");
        const isImage = file.mimetype?.startsWith("image/");
        mediaResults.push({
          url,
          type: isImage ? "image" : "video",
        });

        // Cleanup local file
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log("🗑️  Deleted local file:", file.path);
          }
        } catch (e) {
          console.error("⚠️  Error deleting local media:", e.message);
        }
      }
    } catch (error) {
      console.error("❌ Media upload failed:", error);

      // Cleanup any remaining temp files
      for (const file of mediaFiles) {
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (e) {
          console.error("⚠️  Error cleaning up file:", e.message);
        }
      }

      // Return specific error message
      let errorMessage = "فشل رفع الوسائط";

      if (error.message.includes("not configured")) {
        errorMessage = "Cloudinary غير مكون. تحقق من إعدادات الخادم";
      } else if (error.message.includes("placeholder")) {
        errorMessage = "Cloudinary يحتاج إلى بيانات اعتماد حقيقية";
      } else if (error.http_code === 401) {
        errorMessage = "بيانات اعتماد Cloudinary غير صحيحة";
      } else if (error.message.includes("timeout")) {
        errorMessage = "انتهت مهلة الرفع. حاول مرة أخرى";
      }

      return res.status(500).json({
        message: errorMessage,
        error: error.message,
      });
    }

    const videoData = {
      user: req.user._id,
      videoUrl: mediaResults[0]?.url, // preserve existing clients
      media: mediaResults,
      description: description.trim(),
      privacy: req.body.privacy || "public",
      allowComments: req.body.allowComments === "true",
      allowDuet: req.body.allowDuet === "true",
      allowStitch: req.body.allowStitch === "true",
    };

    // Attach sound info if provided
    if (soundFile) {
      let soundUrl = null;
      try {
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
          throw new Error("Cloudinary is not configured for sound upload.");
        }

        // Upload to Cloudinary
        console.log("📤 Uploading sound to Cloudinary...");
        soundUrl = await uploadToCloudinary(soundFile.path, "sounds", "auto");
        console.log("✅ Uploaded sound to Cloudinary:", soundUrl);

        // Cleanup local file
        try {
          if (fs.existsSync(soundFile.path)) fs.unlinkSync(soundFile.path);
        } catch (e) {
          console.error("Error deleting local sound:", e);
        }
      } catch (error) {
        console.error("Sound upload failed:", error);
        // Sound is optional, so we continue without it
      }

      if (soundUrl) {
        videoData.sound = {
          name: soundFile.originalname || soundFile.filename,
          url: soundUrl,
          path: soundUrl, // Keep path same as url for consistency
        };
      }
    }

    // Parse tags: accept JSON array or comma-separated string
    if (req.body.tags) {
      try {
        let parsedTags = req.body.tags;
        if (typeof parsedTags === "string") {
          // try JSON parse first
          try {
            parsedTags = JSON.parse(parsedTags);
          } catch (e) {
            // fallback to comma-separated
            parsedTags = parsedTags
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t);
          }
        }

        if (Array.isArray(parsedTags) && parsedTags.length > 0) {
          videoData.tags = parsedTags;
        }
      } catch (err) {
        console.warn("Failed to parse tags:", err);
      }
    }

    // Parse location: expect JSON string or object with { name, coords: { lat, lng } }
    if (req.body.location) {
      try {
        let loc = req.body.location;
        if (typeof loc === "string") {
          loc = JSON.parse(loc);
        }

        if (loc && (loc.name || loc.coords)) {
          videoData.location = {};
          if (loc.name) videoData.location.name = loc.name;
          if (loc.coords) {
            const lat = parseFloat(loc.coords.lat);
            const lng = parseFloat(loc.coords.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              videoData.location.coords = { lat, lng };
            }
          }
        }
      } catch (err) {
        console.warn("Failed to parse location:", err);
      }
    }

    const video = new Video(videoData);

    const createdVideo = await video.save();

    // Populate user data before sending response
    await createdVideo.populate("user", "username profileImage");

    // Notify all followers about the new video
    try {
      const user = await User.findById(req.user._id);
      if (user && user.followers && user.followers.length > 0) {
        // Create notifications for all followers
        const notifications = user.followers.map((followerId) => ({
          user: followerId,
          type: "new_video",
          fromUser: req.user._id,
          video: createdVideo._id,
        }));
        await Notification.insertMany(notifications);

        // Send push notifications to followers
        for (const followerId of user.followers) {
          await sendNotificationToUser(
            followerId,
            `${user.username} نشر فيديو جديد`,
            "فيديو جديد",
            { screen: "Home", videoId: createdVideo._id.toString() },
          );
        }
      }
    } catch (notifError) {
      console.error("Error sending follower notifications:", notifError);
      // Continue anyway, video was uploaded successfully
    }

    console.log("✅ Video created successfully:", createdVideo._id);
    res.status(201).json(createdVideo);
  } catch (error) {
    console.error("❌ Video upload error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like a video
// @route   PUT /api/videos/:id/like
// @access  Private
const likeVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate("user");

    if (video) {
      const isLiked = video.likes.includes(req.user._id);

      if (isLiked) {
        video.likes = video.likes.filter(
          (id) => id.toString() !== req.user._id.toString(),
        );
      } else {
        video.likes.push(req.user._id);

        // Create notification and send push notification
        if (video.user._id.toString() !== req.user._id.toString()) {
          const notification = new Notification({
            user: video.user._id,
            type: "like",
            fromUser: req.user._id,
            video: video._id,
          });
          await notification.save();

          // Send push notification
          await sendNotificationToUser(
            video.user._id,
            "إعجاب جديد",
            `أعجب @${req.user.username} بفيديوك`,
            { type: "like", videoId: video._id.toString() },
          );
        }
      }

      await video.save();
      res.json({ likes: video.likes, likesCount: video.likes.length });
    } else {
      res.status(404).json({ message: "Video not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Comment on a video
// @route   POST /api/videos/:id/comment
// @access  Private
const commentVideo = async (req, res) => {
  try {
    const { text, parentComment } = req.body;
    const video = await Video.findById(req.params.id).populate("user");

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Handle image upload if present
    let imageUrl = null;
    if (req.file) {
      const { uploadToCloudinary } = require("../services/cloudinaryService");
      const result = await uploadToCloudinary(req.file.path, "comments");
      imageUrl = result.url;
    }

    const comment = {
      user: req.user._id,
      text: text || " ", // Allow empty text if image is provided
      image: imageUrl,
      parentComment: parentComment || undefined,
    };

    video.comments.push(comment);
    await video.save();

    // Create notification (only if not commenting on own video)
    if (video.user._id.toString() !== req.user._id.toString()) {
      const notification = new Notification({
        user: video.user._id,
        type: "comment",
        fromUser: req.user._id,
        video: video._id,
      });
      await notification.save();

      // Send push notification
      const notificationText = parentComment
        ? `رد @${req.user.username} على تعليقك`
        : imageUrl
          ? `علّق @${req.user.username} بصورة`
          : `علّق @${req.user.username}: ${text.substring(0, 50)}`;

      await sendNotificationToUser(
        video.user._id,
        "تعليق جديد",
        notificationText,
        { type: "comment", videoId: video._id.toString() },
      );
    }

    // Populate the comments.user field before returning
    await video.populate("comments.user", "username profileImage");

    // Return only the new comment with populated user
    const newComment = video.comments[video.comments.length - 1];
    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user videos
// @route   GET /api/videos/user/:id
// @access  Public
const getUserVideos = async (req, res) => {
  try {
    const videos = await Video.find({ user: req.params.id })
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get comments for a video
// @route   GET /api/videos/:id/comments
// @access  Public
const getVideoComments = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate({
      path: "comments.user",
      select: "username profileImage",
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Sort comments by most recent first
    const sortedComments = video.comments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    res.json(sortedComments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get videos from followed users
// @route   GET /api/videos/following
// @access  Private
const getFollowingVideos = async (req, res) => {
  try {
    const User = require("../models/User");

    // Get current user with populated following list
    const user = await User.findById(req.user._id).select("following");

    if (!user || !user.following || user.following.length === 0) {
      return res.json([]);
    }

    // Get videos from followed users
    const videos = await Video.find({
      user: { $in: user.following },
    })
      .populate("user", "username profileImage")
      .populate("comments.user", "username profileImage")
      .sort({ createdAt: -1 })
      .limit(50); // Limit to latest 50 videos

    res.json(videos);
  } catch (error) {
    console.error("❌ Error fetching following videos:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/Unlike a comment
// @route   PUT /api/videos/:id/comments/:commentId/like
// @access  Private
const likeComment = async (req, res) => {
  try {
    const { id: videoId, commentId } = req.params;
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const comment = video.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const userLikedIndex = comment.likes.indexOf(req.user._id);

    if (userLikedIndex === -1) {
      // Like the comment
      comment.likes.push(req.user._id);
    } else {
      // Unlike the comment
      comment.likes.splice(userLikedIndex, 1);
    }

    await video.save();

    res.json({
      commentId: comment._id,
      likes: comment.likes,
      likesCount: comment.likes.length,
      isLiked: userLikedIndex === -1,
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/videos/:id/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const { id: videoId, commentId } = req.params;
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const comment = video.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is comment owner or video owner
    if (
      comment.user.toString() !== req.user._id.toString() &&
      video.user.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }

    // Remove comment using pull
    video.comments.pull(commentId);
    await video.save();

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getVideos,
  createVideo,
  likeVideo,
  commentVideo,
  getUserVideos,
  getVideoComments,
  getFollowingVideos,
  likeComment,
  deleteComment,
};
