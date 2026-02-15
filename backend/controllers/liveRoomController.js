const LiveRoom = require("../models/LiveRoom");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendNotificationToUser } = require("./pushNotificationController");
const { v4: uuidv4 } = require("uuid");

// Create a new live room
exports.createLiveRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      isPrivate,
      coverImage,
      scheduledFor,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const roomId = uuidv4();

    const liveRoom = new LiveRoom({
      roomId,
      title,
      description,
      category: category || "chat",
      isPrivate: isPrivate || false,
      coverImage: coverImage || "",
      host: req.user.id,
      status: scheduledFor ? "scheduled" : "active",
      scheduledFor,
      agoraChannelName: `room_${roomId}`,
    });

    // Add host as first speaker
    liveRoom.speakers.push({
      user: req.user.id,
      isMuted: false,
    });

    await liveRoom.save();

    const populatedRoom = await LiveRoom.findById(liveRoom._id)
      .populate("host", "username avatar isVerified")
      .populate("speakers.user", "username avatar isVerified")
      .populate("listeners.user", "username avatar isVerified");

    // Send notifications to all followers
    try {
      const host = await User.findById(req.user.id).select(
        "followers username",
      );
      if (host && host.followers && host.followers.length > 0) {
        const notificationPromises = host.followers.map(async (followerId) => {
          // Create notification in database
          const notification = new Notification({
            user: followerId,
            type: "live_room_started",
            message: `${host.username} بدأ غرفة صوتية! انضم الآن 🎙️`,
            data: {
              screen: "LiveRoom",
              roomId: roomId,
            },
          });
          await notification.save();

          // Send push notification
          await sendNotificationToUser(
            followerId,
            "غرفة صوتية مباشرة 🎙️",
            `${host.username} بدأ غرفة صوتية! انضم الآن`,
            {
              screen: "LiveRoom",
              roomId: roomId,
            },
          );
        });

        await Promise.allSettled(notificationPromises);
      }
    } catch (notifError) {
      console.error("Error sending follower notifications:", notifError);
      // Don't fail room creation if notifications fail
    }

    res.status(201).json({
      success: true,
      data: populatedRoom,
    });
  } catch (error) {
    console.error("Error creating live room:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all active live rooms
exports.getActiveLiveRooms = async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    const query = { status: "active" };
    if (category && category !== "all") {
      query.category = category;
    }

    const liveRooms = await LiveRoom.find(query)
      .populate("host", "username avatar isVerified")
      .populate("speakers.user", "username avatar isVerified")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await LiveRoom.countDocuments(query);

    res.json({
      success: true,
      data: liveRooms,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    console.error("Error getting live rooms:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get specific live room details
exports.getLiveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const liveRoom = await LiveRoom.findOne({ roomId })
      .populate("host", "username avatar isVerified bio")
      .populate("speakers.user", "username avatar isVerified bio")
      .populate("listeners.user", "username avatar isVerified")
      .populate("handRaised.user", "username avatar isVerified");

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    res.json({
      success: true,
      data: liveRoom,
    });
  } catch (error) {
    console.error("Error getting live room:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Join live room
exports.joinLiveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    if (liveRoom.status !== "active") {
      return res.status(400).json({ message: "Live room is not active" });
    }

    // Check if already in room
    const alreadySpeaker = liveRoom.speakers.some(
      (s) => s.user.toString() === userId.toString(),
    );
    const alreadyListener = liveRoom.listeners.some(
      (l) => l.user.toString() === userId.toString(),
    );

    if (alreadySpeaker || alreadyListener) {
      const populatedRoom = await LiveRoom.findById(liveRoom._id)
        .populate("host", "username avatar isVerified")
        .populate("speakers.user", "username avatar isVerified")
        .populate("listeners.user", "username avatar isVerified")
        .populate("handRaised.user", "username avatar isVerified");

      return res.json({
        success: true,
        data: populatedRoom,
        message: "Already in room",
      });
    }

    // Add as listener
    liveRoom.addListener(userId);
    await liveRoom.save();

    const populatedRoom = await LiveRoom.findById(liveRoom._id)
      .populate("host", "username avatar isVerified")
      .populate("speakers.user", "username avatar isVerified")
      .populate("listeners.user", "username avatar isVerified")
      .populate("handRaised.user", "username avatar isVerified");

    res.json({
      success: true,
      data: populatedRoom,
      message: "Joined as listener",
    });
  } catch (error) {
    console.error("Error joining live room:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Leave live room
exports.leaveLiveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // If host leaves, end the room
    if (liveRoom.host.toString() === userId.toString()) {
      liveRoom.status = "ended";
      liveRoom.endedAt = new Date();
      await liveRoom.save();

      return res.json({
        success: true,
        message: "Room ended",
      });
    }

    // Remove from participants
    liveRoom.removeParticipant(userId);
    await liveRoom.save();

    res.json({
      success: true,
      message: "Left room",
    });
  } catch (error) {
    console.error("Error leaving live room:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Raise hand to speak
exports.raiseHand = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Check if already speaker
    const alreadySpeaker = liveRoom.speakers.some(
      (s) => s.user.toString() === userId.toString(),
    );

    if (alreadySpeaker) {
      return res.status(400).json({ message: "You are already a speaker" });
    }

    liveRoom.raiseHand(userId);
    await liveRoom.save();

    const populatedRoom = await LiveRoom.findById(liveRoom._id).populate(
      "handRaised.user",
      "username avatar isVerified",
    );

    res.json({
      success: true,
      data: populatedRoom.handRaised,
      message: "Hand raised",
    });
  } catch (error) {
    console.error("Error raising hand:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Lower hand
exports.lowerHand = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    liveRoom.lowerHand(userId);
    await liveRoom.save();

    res.json({
      success: true,
      message: "Hand lowered",
    });
  } catch (error) {
    console.error("Error lowering hand:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Make speaker (host only)
exports.makeSpeaker = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const hostId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Verify host
    if (liveRoom.host.toString() !== hostId.toString()) {
      return res.status(403).json({ message: "Only host can make speakers" });
    }

    // Check max speakers
    if (liveRoom.speakers.length >= liveRoom.maxSpeakers) {
      return res.status(400).json({ message: "Maximum speakers reached" });
    }

    liveRoom.addSpeaker(userId);
    await liveRoom.save();

    const populatedRoom = await LiveRoom.findById(liveRoom._id)
      .populate("speakers.user", "username avatar isVerified")
      .populate("listeners.user", "username avatar isVerified")
      .populate("handRaised.user", "username avatar isVerified");

    res.json({
      success: true,
      data: populatedRoom,
      message: "User is now a speaker",
    });
  } catch (error) {
    console.error("Error making speaker:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove speaker (host only)
exports.removeSpeaker = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const hostId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Verify host
    if (liveRoom.host.toString() !== hostId.toString()) {
      return res.status(403).json({ message: "Only host can remove speakers" });
    }

    // Remove from speakers and add back to listeners
    liveRoom.speakers = liveRoom.speakers.filter(
      (s) => s.user.toString() !== userId.toString(),
    );
    liveRoom.addListener(userId);

    await liveRoom.save();

    const populatedRoom = await LiveRoom.findById(liveRoom._id)
      .populate("speakers.user", "username avatar isVerified")
      .populate("listeners.user", "username avatar isVerified");

    res.json({
      success: true,
      data: populatedRoom,
      message: "Speaker removed",
    });
  } catch (error) {
    console.error("Error removing speaker:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle mute
exports.toggleMute = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    const muteStatus = liveRoom.toggleMute(userId);

    if (muteStatus === null) {
      return res.status(400).json({ message: "You are not a speaker" });
    }

    await liveRoom.save();

    res.json({
      success: true,
      isMuted: muteStatus,
      message: muteStatus ? "Muted" : "Unmuted",
    });
  } catch (error) {
    console.error("Error toggling mute:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user's live rooms (history)
exports.getMyLiveRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const liveRooms = await LiveRoom.find({ host: userId })
      .populate("host", "username avatar isVerified")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      data: liveRooms,
    });
  } catch (error) {
    console.error("Error getting my live rooms:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// End live room (host only)
exports.endLiveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Verify host
    if (liveRoom.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only host can end the room" });
    }

    liveRoom.status = "ended";
    liveRoom.endedAt = new Date();
    await liveRoom.save();

    res.json({
      success: true,
      message: "Room ended",
    });
  } catch (error) {
    console.error("Error ending live room:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Kick user from room (host or moderator)
exports.kickUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const kickerId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Check if kicker is host or moderator
    const isHost = liveRoom.host.toString() === kickerId.toString();
    const isModerator = liveRoom.moderators.some(
      (m) => m.user.toString() === kickerId.toString()
    );

    if (!isHost && !isModerator) {
      return res.status(403).json({ message: "Only host or moderators can kick users" });
    }

    // Cannot kick the host
    if (userId === liveRoom.host.toString()) {
      return res.status(400).json({ message: "Cannot kick the host" });
    }

    // Remove from speakers
    liveRoom.speakers = liveRoom.speakers.filter(
      (s) => s.user.toString() !== userId
    );

    // Remove from listeners
    liveRoom.listeners = liveRoom.listeners.filter(
      (l) => l.user.toString() !== userId
    );

    // Remove from hand raised
    liveRoom.handRaised = liveRoom.handRaised.filter(
      (h) => h.user.toString() !== userId
    );

    await liveRoom.save();

    res.json({
      success: true,
      message: "User kicked successfully",
    });
  } catch (error) {
    console.error("Error kicking user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Ban user from room (host or moderator)
exports.banUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, reason } = req.body;
    const bannerId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Check if banner is host or moderator
    const isHost = liveRoom.host.toString() === bannerId.toString();
    const isModerator = liveRoom.moderators.some(
      (m) => m.user.toString() === bannerId.toString()
    );

    if (!isHost && !isModerator) {
      return res.status(403).json({ message: "Only host or moderators can ban users" });
    }

    // Cannot ban the host
    if (userId === liveRoom.host.toString()) {
      return res.status(400).json({ message: "Cannot ban the host" });
    }

    // Check if already banned
    const alreadyBanned = liveRoom.bannedUsers.some(
      (b) => b.user.toString() === userId
    );

    if (alreadyBanned) {
      return res.status(400).json({ message: "User is already banned" });
    }

    // Add to banned list
    liveRoom.bannedUsers.push({
      user: userId,
      bannedBy: bannerId,
      reason: reason || "",
    });

    // Remove from speakers
    liveRoom.speakers = liveRoom.speakers.filter(
      (s) => s.user.toString() !== userId
    );

    // Remove from listeners
    liveRoom.listeners = liveRoom.listeners.filter(
      (l) => l.user.toString() !== userId
    );

    // Remove from hand raised
    liveRoom.handRaised = liveRoom.handRaised.filter(
      (h) => h.user.toString() !== userId
    );

    await liveRoom.save();

    res.json({
      success: true,
      message: "User banned successfully",
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Unban user (host only)
exports.unbanUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Only host can unban
    if (liveRoom.host.toString() !== requesterId.toString()) {
      return res.status(403).json({ message: "Only host can unban users" });
    }

    // Remove from banned list
    liveRoom.bannedUsers = liveRoom.bannedUsers.filter(
      (b) => b.user.toString() !== userId
    );

    await liveRoom.save();

    res.json({
      success: true,
      message: "User unbanned successfully",
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Assign moderator (host only)
exports.assignModerator = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const hostId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Only host can assign moderators
    if (liveRoom.host.toString() !== hostId.toString()) {
      return res.status(403).json({ message: "Only host can assign moderators" });
    }

    // Check if already a moderator
    const alreadyModerator = liveRoom.moderators.some(
      (m) => m.user.toString() === userId
    );

    if (alreadyModerator) {
      return res.status(400).json({ message: "User is already a moderator" });
    }

    // Add as moderator
    liveRoom.moderators.push({
      user: userId,
      assignedBy: hostId,
    });

    await liveRoom.save();

    // Send notification
    try {
      const user = await User.findById(userId);
      if (user) {
        await sendNotificationToUser(user, {
          title: "تم تعيينك كمسؤول",
          body: `تم تعيينك كمسؤول في غرفة: ${liveRoom.title}`,
          data: { roomId: liveRoom.roomId, type: "moderator_assigned" },
        });
      }
    } catch (notifError) {
      console.error("Error sending notification:", notifError);
    }

    res.json({
      success: true,
      message: "Moderator assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning moderator:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove moderator (host only)
exports.removeModerator = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const hostId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Only host can remove moderators
    if (liveRoom.host.toString() !== hostId.toString()) {
      return res.status(403).json({ message: "Only host can remove moderators" });
    }

    // Remove from moderators
    liveRoom.moderators = liveRoom.moderators.filter(
      (m) => m.user.toString() !== userId
    );

    await liveRoom.save();

    res.json({
      success: true,
      message: "Moderator removed successfully",
    });
  } catch (error) {
    console.error("Error removing moderator:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Control music player (host only)
exports.controlMusic = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { action, trackUrl, trackName, volume } = req.body;
    const hostId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }

    // Only host can control music
    if (liveRoom.host.toString() !== hostId.toString()) {
      return res.status(403).json({ message: "Only host can control music" });
    }

    switch (action) {
      case "play":
        liveRoom.musicPlayer.isPlaying = true;
        if (trackUrl) liveRoom.musicPlayer.currentTrack = trackUrl;
        if (trackName) liveRoom.musicPlayer.trackName = trackName;
        break;
      case "pause":
        liveRoom.musicPlayer.isPlaying = false;
        break;
      case "stop":
        liveRoom.musicPlayer.isPlaying = false;
        liveRoom.musicPlayer.currentTrack = "";
        liveRoom.musicPlayer.trackName = "";
        break;
      case "volume":
        if (volume !== undefined) {
          liveRoom.musicPlayer.volume = Math.max(0, Math.min(100, volume));
        }
        break;
      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    await liveRoom.save();

    res.json({
      success: true,
      message: "Music control updated",
      musicPlayer: liveRoom.musicPlayer,
    });
  } catch (error) {
    console.error("Error controlling music:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
