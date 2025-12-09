const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const LiveStream = require("../models/LiveStream");
const dotenv = require("dotenv");
dotenv.config();

// You need to get these from https://console.agora.io
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

const generateToken = async (req, res) => {
  const { channelName, role, title } = req.body;

  if (!channelName) {
    return res.status(400).json({ message: "Channel name is required" });
  }

  if (!APP_ID || !APP_CERTIFICATE) {
    return res.status(500).json({
      message: "Agora configuration missing on server",
      error: "Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in .env",
    });
  }

  // RtcRole.PUBLISHER = 1, RtcRole.SUBSCRIBER = 2
  const rtcRole = role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  // Token expiration time (e.g., 1 hour)
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  // Build the token
  // uid: 0 allows any user ID to join (or use req.user._id for strictness)
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    0, // uid (0 = allow any)
    rtcRole,
    privilegeExpiredTs
  );

  // If publisher, create/update LiveStream record
  if (role === "publisher") {
    try {
      // End any previous active streams for this user
      await LiveStream.updateMany(
        { user: req.user._id, status: "active" },
        { status: "ended" }
      );

      await LiveStream.create({
        user: req.user._id,
        channelName,
        title: title || "Live Stream",
        status: "active",
      });
    } catch (error) {
      console.error("Error creating LiveStream record:", error);
    }
  }

  res.json({ token, channelName });
};

const getActiveStreams = async (req, res) => {
  try {
    const streams = await LiveStream.find({ status: "active" })
      .populate("user", "username profileImage")
      .sort({ createdAt: -1 });
    res.json(streams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endStream = async (req, res) => {
  try {
    const { channelName } = req.body;
    await LiveStream.updateMany(
      { user: req.user._id, channelName, status: "active" },
      { status: "ended" }
    );
    res.json({ message: "Stream ended" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { generateToken, getActiveStreams, endStream };
