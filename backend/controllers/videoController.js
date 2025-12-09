const Video = require("../models/Video");
const Notification = require("../models/Notification");
const { sendNotificationToUser } = require("./pushNotificationController");
const { uploadFileToStorage } = require("../services/firebaseService");
const fs = require("fs");
const path = require("path");

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
const getVideos = async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate("user", "username profileImage")
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
    const videoFile = req.files && req.files.video ? req.files.video[0] : null;
    const soundFile = req.files && req.files.sound ? req.files.sound[0] : null;

    if (!videoFile) {
      return res.status(400).json({ message: "لم يتم رفع أي فيديو" });
    }

    const { description } = req.body;

    if (!description || description.trim() === "") {
      return res.status(400).json({ message: "الوصف مطلوب" });
    }

    // Upload video to Firebase
    let videoUrl = videoFile.path;
    try {
      const videoDest = `videos/${req.user._id}/${Date.now()}_${path.basename(
        videoFile.originalname
      )}`;
      const uploadedUrl = await uploadFileToStorage(videoFile.path, videoDest);
      if (uploadedUrl) {
        videoUrl = uploadedUrl;
        try {
          fs.unlinkSync(videoFile.path);
        } catch (e) {
          console.error("Error deleting local video:", e);
        }
      }
    } catch (error) {
      console.error("Video upload to Firebase failed:", error);
    }

    const videoData = {
      user: req.user._id,
      videoUrl: videoUrl,
      description: description.trim(),
      privacy: req.body.privacy || "public",
      allowComments: req.body.allowComments === "true",
      allowDuet: req.body.allowDuet === "true",
      allowStitch: req.body.allowStitch === "true",
    };

    // Attach sound info if provided
    if (soundFile) {
      let soundUrl = soundFile.path;
      try {
        const soundDest = `sounds/${req.user._id}/${Date.now()}_${path.basename(
          soundFile.originalname
        )}`;
        const uploadedSoundUrl = await uploadFileToStorage(
          soundFile.path,
          soundDest
        );
        if (uploadedSoundUrl) {
          soundUrl = uploadedSoundUrl;
          try {
            fs.unlinkSync(soundFile.path);
          } catch (e) {
            console.error("Error deleting local sound:", e);
          }
        }
      } catch (error) {
        console.error("Sound upload to Firebase failed:", error);
      }

      videoData.sound = {
        name: soundFile.originalname || soundFile.filename,
        url: soundUrl,
        path: soundUrl, // Keep path same as url for consistency
      };
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
          (id) => id.toString() !== req.user._id.toString()
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
            { type: "like", videoId: video._id.toString() }
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
    const { text } = req.body;
    const video = await Video.findById(req.params.id).populate("user");

    if (video) {
      const comment = {
        user: req.user._id,
        text,
      };

      video.comments.push(comment);
      await video.save();

      // Create notification and send push notification
      if (video.user._id.toString() !== req.user._id.toString()) {
        const notification = new Notification({
          user: video.user._id,
          type: "comment",
          fromUser: req.user._id,
          video: video._id,
        });
        await notification.save();

        // Send push notification
        await sendNotificationToUser(
          video.user._id,
          "تعليق جديد",
          `علّق @${req.user.username}: ${text.substring(0, 50)}`,
          { type: "comment", videoId: video._id.toString() }
        );
      }

      res.status(201).json(video.comments);
    } else {
      res.status(404).json({ message: "Video not found" });
    }
  } catch (error) {
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
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(sortedComments);
  } catch (error) {
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
};
