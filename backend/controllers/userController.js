const User = require("../models/User");
const Video = require("../models/Video");

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Public
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

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
        await userToFollow.updateOne({ $push: { followers: req.user._id } });
        await currentUser.updateOne({ $push: { following: req.params.id } });
        res.status(200).json({ message: "User followed" });
      } else {
        res.status(403).json({ message: "You already follow this user" });
      }
    } else {
      res.status(403).json({ message: "You cannot follow yourself" });
    }
  } catch (error) {
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

module.exports = {
  getUserProfile,
  followUser,
  unfollowUser,
  updateUserProfile,
  getAllUsers,
  updateFcmToken,
};
