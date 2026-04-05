const User = require("../models/User");
const Video = require("../models/Video");
const Notification = require("../models/Notification");
const { sendNotificationToUser } = require("./pushNotificationController");

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Public
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("activeBadge")
      .populate("activeBackground");

    if (user) {
      // Get user's videos
      const videos = await Video.find({ user: req.params.id }).sort({
        createdAt: -1,
      });

      res.json({
        ...user.toObject(),
        videosCount: videos.length,
        followersCount: user.followers.length,
        followingCount: user.following.length,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Follow a user
// @route   PUT /api/users/:id/follow
// @access  Private
const followUser = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      const userToFollow = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user._id);

      if (!userToFollow) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!userToFollow.followers.includes(req.user._id)) {
        // Update follow relationships
        await userToFollow.updateOne({ $push: { followers: req.user._id } });
        await currentUser.updateOne({ $push: { following: req.params.id } });

        // Create notification (with error handling to not break follow action)
        try {
          const notification = new Notification({
            user: userToFollow._id,
            type: "follow",
            fromUser: req.user._id,
          });
          await notification.save();
          console.log(
            `✅ Follow notification created: ${currentUser.username} -> ${userToFollow.username}`,
          );
        } catch (notifError) {
          console.error("Error creating follow notification:", notifError);
        }

        // Send push notification (with error handling)
        try {
          await sendNotificationToUser(
            userToFollow._id,
            `${currentUser.username} بدأ في متابعتك`,
            "متابع جديد",
            { screen: "UserProfile", userId: req.user._id.toString() },
          );
          console.log(`✅ Push notification sent to ${userToFollow.username}`);
        } catch (pushError) {
          console.error("Error sending push notification:", pushError);
        }

        res.status(200).json({ message: "User followed" });
      } else {
        res.status(403).json({ message: "You already follow this user" });
      }
    } else {
      res.status(403).json({ message: "You cannot follow yourself" });
    }
  } catch (error) {
    console.error("Error in followUser:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unfollow a user
// @route   PUT /api/users/:id/unfollow
// @access  Private
const unfollowUser = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      const userToUnfollow = await User.findById(req.params.id);
      const currentUser = await User.findById(req.user._id);

      if (!userToUnfollow) {
        return res.status(404).json({ message: "User not found" });
      }

      if (userToUnfollow.followers.includes(req.user._id)) {
        await userToUnfollow.updateOne({ $pull: { followers: req.user._id } });
        await currentUser.updateOne({ $pull: { following: req.params.id } });
        res.status(200).json({ message: "User unfollowed" });
      } else {
        res.status(403).json({ message: "You dont follow this user" });
      }
    } else {
      res.status(403).json({ message: "You cannot unfollow yourself" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.bio = req.body.bio || user.bio;
      user.profileImage = req.body.profileImage || user.profileImage;

      // Update social links if provided
      if (req.body.socialLinks) {
        user.socialLinks = {
          instagram:
            req.body.socialLinks.instagram || user.socialLinks?.instagram || "",
          youtube:
            req.body.socialLinks.youtube || user.socialLinks?.youtube || "",
          twitter:
            req.body.socialLinks.twitter || user.socialLinks?.twitter || "",
        };
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage,
        bio: updatedUser.bio,
        socialLinks: updatedUser.socialLinks,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").limit(50);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search users by username or email
// @route   GET /api/users/search?q=...
// @access  Public
const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    const regex = new RegExp(q, "i");
    const users = await User.find({
      $or: [{ username: regex }, { email: regex }],
    })
      .select("_id username email profileImage vipLevel level")
      .limit(20);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload profile image
// @route   PUT /api/users/profile/image
// @access  Private
const uploadProfileImage = async (req, res) => {
  try {
    const {
      uploadImageToCloudinary,
    } = require("../services/cloudinaryService");
    const fs = require("fs");

    if (!req.file) {
      return res.status(400).json({ message: "لم يتم رفع أي صورة" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Upload to Cloudinary with optimization
    let profileImageUrl;
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        console.log("📤 Uploading profile image to Cloudinary...");
        profileImageUrl = await uploadImageToCloudinary(
          req.file.path,
          "profile_images",
          { width: 500, height: 500, quality: "auto:good" },
        );
        console.log("✅ Uploaded to Cloudinary:", profileImageUrl);
      } else {
        console.warn("⚠️ Cloudinary Config Missing! Using local file path.");
        profileImageUrl = req.file.path;
      }

      // Cleanup local file
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Error deleting local image:", e);
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      return res.status(500).json({ message: "فشل رفع الصورة" });
    }

    // Update user profile image
    user.profileImage = profileImageUrl;
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profileImage: updatedUser.profileImage,
      bio: updatedUser.bio,
      socialLinks: updatedUser.socialLinks,
    });
  } catch (error) {
    console.error("❌ Profile image upload error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update FCM Token
// @route   PUT /api/users/fcm-token
// @access  Private
const updateFcmToken = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.pushToken = token;
      user.fcmToken = token; // Save to both fields for compatibility
      await user.save();
      res.json({ message: "FCM Token updated" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error updating FCM token:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get suggested users (not yet followed by current user)
// @route   GET /api/user/suggestions
// @access  Private
const getSuggestedUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select("following");
    const excludeIds = [...(currentUser.following || []), req.user._id];

    const suggested = await User.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      { $addFields: { followersCount: { $size: "$followers" } } },
      { $sort: { followersCount: -1 } },
      { $limit: 20 },
      {
        $project: {
          username: 1,
          profileImage: 1,
          bio: 1,
          isVerified: 1,
          verificationBadge: 1,
          followersCount: 1,
        },
      },
    ]);

    res.json(suggested);
  } catch (error) {
    console.error("Error fetching suggested users:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user's followers and following with basic info
// @route   GET /api/users/my-connections
// @access  Private
const getMyConnections = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("followers following")
      .populate("followers", "_id username profileImage isOnline")
      .populate("following", "_id username profileImage isOnline");

    if (!user) return res.status(404).json({ message: "User not found" });

    // Combine followers + following, deduplicated
    const allIds = new Set();
    const connections = [];
    for (const u of [...(user.followers || []), ...(user.following || [])]) {
      const id = u._id.toString();
      if (!allIds.has(id)) {
        allIds.add(id);
        connections.push(u);
      }
    }

    res.json(connections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
