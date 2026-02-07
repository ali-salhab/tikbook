const { AccessToken, RoomServiceClient } = require("livekit-server-sdk");

const getLiveKitConfig = () => {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "LiveKit configuration missing. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET."
    );
  }

  const httpUrl = url
    .replace("wss://", "https://")
    .replace("ws://", "http://");

  return { url, httpUrl, apiKey, apiSecret };
};

const createRoomService = () => {
  const { httpUrl, apiKey, apiSecret } = getLiveKitConfig();
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
};

// @desc    Get LiveKit token
// @route   POST /api/livekit/token
// @access  Private
const generateLiveKitToken = async (req, res) => {
  try {
    const { channelName, role, title } = req.body;
    if (!channelName) {
      return res.status(400).json({ message: "Channel name is required" });
    }

    const { url, apiKey, apiSecret } = getLiveKitConfig();
    const identity = req.user?._id?.toString() || `user_${Date.now()}`;
    const name = req.user?.username || "user";

    const at = new AccessToken(apiKey, apiSecret, { identity, name });
    at.addGrant({
      room: channelName,
      roomJoin: true,
      canPublish: role === "publisher",
      canSubscribe: true,
    });

    const token = at.toJwt();

    res.json({ token, url, channelName, title });
  } catch (error) {
    console.error("LiveKit token error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    List active rooms
// @route   GET /api/livekit/rooms
// @access  Private
const listLiveKitRooms = async (req, res) => {
  try {
    const roomService = createRoomService();
    const rooms = await roomService.listRooms();
    res.json(rooms || []);
  } catch (error) {
    console.error("LiveKit list rooms error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    End a room
// @route   POST /api/livekit/end
// @access  Private
const endLiveKitRoom = async (req, res) => {
  try {
    const { channelName } = req.body;
    if (!channelName) {
      return res.status(400).json({ message: "Channel name is required" });
    }
    const roomService = createRoomService();
    await roomService.deleteRoom(channelName);
    res.json({ message: "Room ended" });
  } catch (error) {
    console.error("LiveKit end room error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateLiveKitToken,
  listLiveKitRooms,
  endLiveKitRoom,
};
