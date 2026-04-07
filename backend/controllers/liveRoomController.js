const LiveRoom = require("../models/LiveRoom");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendNotificationToUser } = require("./pushNotificationController");
const { uploadToCloudinary } = require("../services/cloudinaryService");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

// Create a new live room
exports.createLiveRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      isPrivate,
      scheduledFor, // Assuming duplicate property from body
    } = req.body;

    let coverImage = req.body.coverImage || "";

    // Check if file was uploaded
    if (req.file) {
      try {
        const secureUrl = await uploadToCloudinary(
          req.file.path,
          "live-covers",
          "image",
        );
        coverImage = secureUrl;
        // Clean up local temp file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (error) {
        console.error("Failed to upload cover image:", error);
      }
    }

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
      .populate({
        path: "host",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
      .populate({
        path: "speakers.user",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
      .populate("listeners.user", "username profileImage vipLevel isVerified");

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
      .populate({
        path: "host",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
      .populate({
        path: "speakers.user",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
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
      .populate({
        path: "host",
        select: "username profileImage activeBadge isVerified bio",
        populate: { path: "activeBadge" },
      })
      .populate({
        path: "speakers.user",
        select: "username profileImage activeBadge isVerified bio",
        populate: { path: "activeBadge" },
      })
      .populate("listeners.user", "username profileImage vipLevel isVerified")
      .populate("handRaised.user", "username profileImage isVerified")
      .populate("moderators.user", "username profileImage isVerified")
      .populate("bannedUsers.user", "username profileImage");

    if (!liveRoom) {
      return res.status(404).json({ message: "Live room not found" });
    }
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
        .populate({
          path: "host",
          select: "username profileImage activeBadge isVerified",
          populate: { path: "activeBadge" },
        })
        .populate({
          path: "speakers.user",
          select: "username profileImage activeBadge isVerified",
          populate: { path: "activeBadge" },
        })
        .populate("listeners.user", "username profileImage vipLevel isVerified")
        .populate("handRaised.user", "username profileImage isVerified")
        .populate("moderators.user", "username profileImage isVerified")
        .populate("bannedUsers.user", "username profileImage");

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
      .populate({
        path: "host",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
      .populate({
        path: "speakers.user",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
      .populate("listeners.user", "username profileImage vipLevel isVerified")
      .populate("handRaised.user", "username profileImage isVerified")
      .populate("moderators.user", "username profileImage isVerified")
      .populate("bannedUsers.user", "username profileImage");

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
      "username profileImage isVerified",
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
      .populate({
        path: "speakers.user",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
      .populate("listeners.user", "username profileImage vipLevel isVerified")
      .populate("handRaised.user", "username profileImage isVerified");

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
      .populate({
        path: "speakers.user",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
      .populate("listeners.user", "username profileImage vipLevel isVerified");

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
      .populate({
        path: "host",
        select: "username profileImage activeBadge isVerified",
        populate: { path: "activeBadge" },
      })
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

// Add moderator (Host only)
exports.addModerator = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const hostId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });

    if (liveRoom.host.toString() !== hostId) {
      return res.status(403).json({ message: "Only host can add moderators" });
    }

    if (liveRoom.moderators.some((m) => m.user.toString() === userId)) {
      return res.status(400).json({ message: "User is already a moderator" });
    }

    liveRoom.moderators.push({
      user: userId,
      assignedBy: hostId,
      assignedAt: new Date(),
    });
    await liveRoom.save();

    res.json({ success: true, message: "Moderator added" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Remove moderator (Host only)
exports.removeModerator = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const hostId = req.user.id; // Corrected from req.user._id to req.user.id based on other methods

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });

    if (liveRoom.host.toString() !== hostId) {
      return res
        .status(403)
        .json({ message: "Only host can remove moderators" });
    }

    liveRoom.moderators = liveRoom.moderators.filter(
      (m) => m.user.toString() !== userId,
    );
    await liveRoom.save();

    res.json({ success: true, message: "Moderator removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Ban user (Host or Moderator)
exports.banUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, reason } = req.body;
    const requesterId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });

    const isHost = liveRoom.host.toString() === requesterId;
    const isMod = liveRoom.moderators.some(
      (m) => m.user.toString() === requesterId,
    );

    if (!isHost && !isMod) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Prevent banning host or other mods (optional rule)
    if (liveRoom.host.toString() === userId) {
      return res.status(400).json({ message: "Cannot ban the host" });
    }

    liveRoom.bannedUsers.push({
      user: userId,
      bannedBy: requesterId,
      reason,
      bannedAt: new Date(),
    });

    // Remove from room
    liveRoom.removeParticipant(userId);

    await liveRoom.save();
    res.json({ success: true, message: "User banned" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Room Permissions (Host/Mod)
exports.updatePermissions = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { permissions } = req.body; // { canChat: false, etc }
    const requesterId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });

    const isHost = liveRoom.host.toString() === requesterId;
    const isMod = liveRoom.moderators.some(
      (m) => m.user.toString() === requesterId,
    );

    if (!isHost && !isMod)
      return res.status(403).json({ message: "Unauthorized" });

    liveRoom.permissions = { ...liveRoom.permissions, ...permissions };
    await liveRoom.save();

    res.json({ success: true, data: liveRoom.permissions });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Music Player (Host/Mod)
exports.updateMusic = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { songUrl, isPlaying, volume, title } = req.body;
    const requesterId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });

    // Check perms
    const isHost = liveRoom.host.toString() === requesterId;
    const isMod = liveRoom.moderators.some(
      (m) => m.user.toString() === requesterId,
    );
    if (!isHost && !isMod)
      return res.status(403).json({ message: "Unauthorized" });

    if (songUrl !== undefined) liveRoom.musicPlayer.currentSongUrl = songUrl;
    if (title !== undefined) liveRoom.musicPlayer.title = title;
    if (isPlaying !== undefined) liveRoom.musicPlayer.isPlaying = isPlaying;
    if (volume !== undefined) liveRoom.musicPlayer.volume = volume;

    await liveRoom.save();
    res.json({ success: true, data: liveRoom.musicPlayer });
  } catch (error) {
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

// Kick user (Host/Mod) - Removes from room but doesn't ban
exports.kickUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });

    const isHost = liveRoom.host.toString() === requesterId;
    const isMod = liveRoom.moderators.some(
      (m) => m.user.toString() === requesterId,
    );

    if (!isHost && !isMod)
      return res.status(403).json({ message: "Unauthorized" });

    // Remove from speakers
    liveRoom.speakers = liveRoom.speakers.filter(
      (s) => s.user.toString() !== userId,
    );

    // Remove from listeners
    liveRoom.listeners = liveRoom.listeners.filter(
      (l) => l.user.toString() !== userId,
    );
    // Remove from hand raised
    liveRoom.handRaised = liveRoom.handRaised.filter(
      (h) => h.user.toString() !== userId,
    );

    await liveRoom.save();

    res.json({ success: true, message: "User kicked" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Unban user
exports.unbanUser = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user.id;

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });

    const isHost = liveRoom.host.toString() === requesterId;
    const isMod = liveRoom.moderators.some(
      (m) => m.user.toString() === requesterId,
    );
    if (!isHost && !isMod)
      return res.status(403).json({ message: "Unauthorized" });

    liveRoom.bannedUsers = liveRoom.bannedUsers.filter(
      (b) => b.user.toString() !== userId,
    );
    await liveRoom.save();

    res.json({ success: true, message: "User unbanned" });
  } catch (error) {
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
      (m) => m.user.toString() === bannerId.toString(),
    );

    if (!isHost && !isModerator) {
      return res
        .status(403)
        .json({ message: "Only host or moderators can ban users" });
    }

    // Cannot ban the host
    if (userId === liveRoom.host.toString()) {
      return res.status(400).json({ message: "Cannot ban the host" });
    }

    // Check if already banned
    const alreadyBanned = liveRoom.bannedUsers.some(
      (b) => b.user.toString() === userId,
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
      (s) => s.user.toString() !== userId,
    );

    // Remove from listeners
    liveRoom.listeners = liveRoom.listeners.filter(
      (l) => l.user.toString() !== userId,
    );

    // Remove from hand raised
    liveRoom.handRaised = liveRoom.handRaised.filter(
      (h) => h.user.toString() !== userId,
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
      (b) => b.user.toString() !== userId,
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
      return res
        .status(403)
        .json({ message: "Only host can assign moderators" });
    }

    // Check if already a moderator
    const alreadyModerator = liveRoom.moderators.some(
      (m) => m.user.toString() === userId,
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
      return res
        .status(403)
        .json({ message: "Only host can remove moderators" });
    }

    // Remove from moderators
    liveRoom.moderators = liveRoom.moderators.filter(
      (m) => m.user.toString() !== userId,
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

// Generate Agora RTC token for live room
exports.getAgoraToken = async (req, res) => {
  try {
    const { channelName, role } = req.body;
    const APP_ID = process.env.AGORA_APP_ID;
    const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

    if (!channelName) {
      return res.status(400).json({ message: "channelName is required" });
    }
    if (!APP_ID || !APP_CERTIFICATE) {
      return res
        .status(500)
        .json({ message: "Agora configuration missing on server" });
    }

    const rtcRole =
      role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      0,
      rtcRole,
      privilegeExpiredTs,
    );

    res.json({ token });
  } catch (error) {
    console.error("Error generating Agora token:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update room settings (host only) — PATCH /api/live-rooms/:roomId/settings
exports.updateRoomSettings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const hostId = req.user.id;
    const { title, description, maxSpeakers, permissions, isPrivate } = req.body;

    const liveRoom = await LiveRoom.findOne({ roomId });
    if (!liveRoom) return res.status(404).json({ message: "Room not found" });
    if (liveRoom.host.toString() !== hostId.toString())
      return res.status(403).json({ message: "Only the host can update settings" });

    if (title !== undefined) liveRoom.title = title.trim() || liveRoom.title;
    if (description !== undefined) liveRoom.description = description;
    if (isPrivate !== undefined) liveRoom.isPrivate = !!isPrivate;
    if (maxSpeakers !== undefined) {
      const seats = Math.max(1, Math.min(12, parseInt(maxSpeakers) || 8));
      liveRoom.maxSpeakers = seats;
    }
    if (permissions !== undefined) {
      liveRoom.permissions = { ...liveRoom.permissions, ...permissions };
    }

    await liveRoom.save();

    // Notify all room participants so their grids update
    const io = req.app.get("io");
    if (io) {
      io.to(`liveroom:${roomId}`).emit("liveroom:settings_updated", {
        maxSpeakers: liveRoom.maxSpeakers,
      });
    }

    res.json({ success: true, message: "Settings updated", data: liveRoom });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
