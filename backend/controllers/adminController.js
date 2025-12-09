const User = require("../models/User");
const Video = require("../models/Video");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Notification = require("../models/Notification");

// Helper: build a list of the last N months with formatted labels
const buildMonthsRange = (count = 6) => {
  const months = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i -= 1) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const label = `${ref.toLocaleString("en", { month: "short" })} ${year}`;

    months.push({ year, month, key, label });
  }

  return months;
};

const formatTopCreators = (items) =>
  items.map((item) => ({
    userId: item.userId,
    username: item.username,
    profileImage: item.profileImage,
    videosCount: item.videosCount,
    totalLikes: item.totalLikes,
    totalViews: item.totalViews,
    followersCount: item.followersCount,
  }));

const formatTopFollowed = (items) =>
  items.map((item) => ({
    userId: item._id,
    username: item.username,
    profileImage: item.profileImage,
    followersCount: item.followersCount,
    followingCount: item.followingCount,
    createdAt: item.createdAt,
  }));

const formatTopVideos = (items) =>
  items.map((item) => ({
    videoId: item.videoId,
    videoUrl: item.videoUrl,
    description: item.description,
    likesCount: item.likesCount,
    commentsCount: item.commentsCount,
    views: item.views,
    createdAt: item.createdAt,
    username: item.username,
    userId: item.userId,
  }));

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const monthsRange = buildMonthsRange(6);
    const earliestMonth = monthsRange[0];
    const earliestDate = new Date(
      earliestMonth.year,
      earliestMonth.month - 1,
      1
    );
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      userCount,
      videoCount,
      newUsers,
      newVideos,
      connectedUsers,
      topCreatorsAggregation,
      topFollowedAggregation,
      topVideosAggregation,
      userMonthlyAggregation,
      videoMonthlyAggregation,
      followerSummaryAggregation,
    ] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Video.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({
        $or: [
          { pushToken: { $exists: true, $ne: "" } },
          { fcmToken: { $exists: true, $ne: "" } },
        ],
      }),
      Video.aggregate([
        {
          $group: {
            _id: "$user",
            videosCount: { $sum: 1 },
            totalLikes: {
              $sum: {
                $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0],
              },
            },
            totalViews: { $sum: { $ifNull: ["$views", 0] } },
          },
        },
        { $sort: { videosCount: -1, totalLikes: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 0,
            userId: "$user._id",
            username: "$user.username",
            profileImage: "$user.profileImage",
            videosCount: 1,
            totalLikes: 1,
            totalViews: 1,
            followersCount: {
              $size: {
                $ifNull: ["$user.followers", []],
              },
            },
          },
        },
      ]),
      User.aggregate([
        {
          $project: {
            username: 1,
            profileImage: 1,
            createdAt: 1,
            followersCount: {
              $size: { $ifNull: ["$followers", []] },
            },
            followingCount: {
              $size: { $ifNull: ["$following", []] },
            },
          },
        },
        { $sort: { followersCount: -1 } },
        { $limit: 5 },
      ]),
      Video.aggregate([
        {
          $addFields: {
            likesCount: {
              $cond: [{ $isArray: "$likes" }, { $size: "$likes" }, 0],
            },
            commentsCount: {
              $cond: [{ $isArray: "$comments" }, { $size: "$comments" }, 0],
            },
          },
        },
        { $sort: { likesCount: -1, views: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            _id: 0,
            videoId: "$_id",
            videoUrl: "$videoUrl",
            description: "$description",
            likesCount: "$likesCount",
            commentsCount: "$commentsCount",
            views: { $ifNull: ["$views", 0] },
            createdAt: "$createdAt",
            username: "$user.username",
            userId: "$user._id",
          },
        },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: earliestDate } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Video.aggregate([
        { $match: { createdAt: { $gte: earliestDate } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      User.aggregate([
        {
          $project: {
            followersCount: {
              $size: { $ifNull: ["$followers", []] },
            },
            followingCount: {
              $size: { $ifNull: ["$following", []] },
            },
          },
        },
        {
          $group: {
            _id: null,
            totalFollowers: { $sum: "$followersCount" },
            totalFollowing: { $sum: "$followingCount" },
            avgFollowers: { $avg: "$followersCount" },
            avgFollowing: { $avg: "$followingCount" },
          },
        },
      ]),
    ]);

    const disconnectedUsers = Math.max(userCount - connectedUsers, 0);

    const followersSummary =
      followerSummaryAggregation && followerSummaryAggregation[0]
        ? followerSummaryAggregation[0]
        : {
            totalFollowers: 0,
            totalFollowing: 0,
            avgFollowers: 0,
            avgFollowing: 0,
          };

    const toKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

    const userMonthlyMap = userMonthlyAggregation.reduce((acc, item) => {
      const key = toKey(item._id.year, item._id.month);
      acc[key] = item.count;
      return acc;
    }, {});

    const videoMonthlyMap = videoMonthlyAggregation.reduce((acc, item) => {
      const key = toKey(item._id.year, item._id.month);
      acc[key] = item.count;
      return acc;
    }, {});

    const usersByMonth = monthsRange.map((entry) => ({
      label: entry.label,
      value: userMonthlyMap[entry.key] || 0,
    }));

    const videosByMonth = monthsRange.map((entry) => ({
      label: entry.label,
      value: videoMonthlyMap[entry.key] || 0,
    }));

    const averages = {
      videosPerUser: userCount
        ? Number((videoCount / userCount).toFixed(2))
        : 0,
      followersPerUser: Number((followersSummary.avgFollowers || 0).toFixed(2)),
      followingPerUser: Number((followersSummary.avgFollowing || 0).toFixed(2)),
    };

    res.json({
      users: userCount,
      videos: videoCount,
      newUsers,
      newVideos,
      connectedUsers,
      disconnectedUsers,
      averages,
      charts: {
        usersByMonth,
        videosByMonth,
        connectionSplit: [
          { name: "متصل", value: connectedUsers },
          { name: "غير متصل", value: disconnectedUsers },
        ],
      },
      topCreators: formatTopCreators(topCreatorsAggregation),
      topFollowed: formatTopFollowed(topFollowedAggregation),
      topVideos: formatTopVideos(topVideosAggregation),
      totals: {
        followers: followersSummary.totalFollowers || 0,
        following: followersSummary.totalFollowing || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  const users = await User.find({}).select("-password");
  res.json(users);
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.deleteOne();
    res.json({ message: "User removed" });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// @desc    Send notification to user
// @route   POST /api/admin/notify/:userId
// @access  Private/Admin
const sendNotificationToUser = async (req, res) => {
  try {
    const { title, body } = req.body;
    const userId = req.params.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.pushToken && !user.fcmToken) {
      return res
        .status(400)
        .json({ message: "User has no push token registered" });
    }

    const { sendPushNotification } = require("../services/firebaseService");
    const token = user.pushToken || user.fcmToken;
    const result = await sendPushNotification(
      token,
      title || "إشعار من TikBook",
      body || "لديك إشعار جديد",
      { type: "admin", source: "admin" }
    );

    if (result) {
      res.json({
        message: "Notification sent successfully",
        user: user.username,
      });
    } else {
      res.status(500).json({ message: "Failed to send notification" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all videos
// @route   GET /api/admin/videos
// @access  Private/Admin
const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find({}).populate(
      "user",
      "username email profileImage"
    );
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send notification to all users
// @route   POST /api/admin/notify/all
// @access  Private/Admin
const sendBroadcastNotification = async (req, res) => {
  try {
    const { title, body } = req.body;

    const users = await User.find({
      $or: [
        { pushToken: { $exists: true, $ne: "" } },
        { fcmToken: { $exists: true, $ne: "" } },
      ],
    });

    const tokens = users
      .map((user) => user.pushToken || user.fcmToken)
      .filter((token) => token);

    if (tokens.length === 0) {
      return res
        .status(400)
        .json({ message: "No users with push tokens found" });
    }

    const {
      sendMultipleNotifications,
    } = require("../services/firebaseService");
    const result = await sendMultipleNotifications(
      tokens,
      title || "إشعار عام",
      body || "لديك إشعار جديد",
      { type: "admin_broadcast", source: "admin" }
    );

    if (!result) {
      return res.status(500).json({
        message:
          "Failed to send broadcast: Firebase not initialized or no valid tokens",
      });
    }

    // Save notification to database for each user
    const notificationsToSave = users.map((user) => ({
      user: user._id,
      type: "admin_broadcast", // You might need to add this type to your frontend handling
      fromUser: req.user._id, // The admin who sent it
      read: false,
    }));

    if (notificationsToSave.length > 0) {
      await Notification.insertMany(notificationsToSave);
    }

    res.json({
      message: "Broadcast sent successfully",
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  deleteUser,
  sendNotificationToUser,
  getAllVideos,
  sendBroadcastNotification,
  grantCoinsToUser,
};

// @desc    Grant coins to a user (admin)
// @route   POST /api/admin/wallet/grant
// @access  Private/Admin
async function grantCoinsToUser(req, res) {
  try {
    const { userId, amount, reason } = req.body;
    const value = Number(amount);
    if (!userId || !value || value <= 0) {
      return res.status(400).json({ message: "Invalid userId or amount" });
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user: userId });
    }

    wallet.balance += value;
    await wallet.save();

    await Transaction.create({
      user: userId,
      type: "admin_grant",
      amount: value,
      description: reason || "Admin granted coins",
    });

    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
