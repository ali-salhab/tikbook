const escapeRegex = (s) =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Global search — users, public videos, active live rooms
// @route   GET /api/search?q=...
// @access  Public
const globalSearch = async (req, res) => {
  try {
    const qRaw = (req.query.q || "").trim();
    if (!qRaw) {
      return res.json({
        users: [],
        videos: [],
        liveRooms: [],
      });
    }

    const regex = new RegExp(escapeRegex(qRaw), "i");
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);

    const User = require("../models/User");
    const Video = require("../models/Video");
    const LiveRoom = require("../models/LiveRoom");

    const usernameMatchIds = (
      await User.find({ username: regex }).select("_id").limit(80).lean()
    ).map((u) => u._id);

    const videoClause = [
      { description: regex },
      { "sound.name": regex },
    ];
    if (usernameMatchIds.length) {
      videoClause.push({ user: { $in: usernameMatchIds } });
    }

    const [users, videos, liveRooms] = await Promise.all([
      User.find({
        $or: [{ username: regex }, { email: regex }],
      })
        .select("_id username email profileImage vipLevel level isVerified followers following")
        .populate("activeBadge", "name imageUrl type rarity")
        .sort({ vipLevel: -1, username: 1 })
        .limit(limit)
        .lean(),

      Video.find({
        privacy: "public",
        $or: videoClause,
      })
        .populate("user", "username profileImage")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),

      LiveRoom.find({
        status: "active",
        $or: [
          { title: regex },
          { description: regex },
          ...(usernameMatchIds.length ? [{ host: { $in: usernameMatchIds } }] : []),
        ],
      })
        .populate("host", "username profileImage")
        .sort({ createdAt: -1 })
        .limit(Math.min(limit, 15))
        .lean(),
    ]);

    res.json({
      users,
      videos,
      liveRooms,
    });
  } catch (error) {
    console.error("globalSearch:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { globalSearch };
