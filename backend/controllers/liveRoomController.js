const LiveRoom = require("../models/LiveRoom");
const User = require("../models/User");
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
