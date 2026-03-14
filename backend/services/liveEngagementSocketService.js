const LiveChatMessage = require("../models/LiveChatMessage");

const ROOM_PRESENCE = new Map();
const SOCKET_ROOMS = new Map();
const GIFT_QUEUES = new Map();
const RATE_LIMIT_MAP = new Map();

const CHAT_RATE_LIMIT_MS = 450;
const GIFT_RATE_LIMIT_MS = 250;
const MAX_GIFT_QUEUE = 80;
const MAX_CHAT_LENGTH = 280;
const GIFT_BATCH_SIZE = 3;
const GIFT_BATCH_INTERVAL_MS = 140;

const roomChannel = (roomId) => `live:room:${roomId}`;

const isRateLimited = (key, windowMs) => {
  const now = Date.now();
  const lastSeen = RATE_LIMIT_MAP.get(key) || 0;

  if (now - lastSeen < windowMs) {
    return true;
  }

  RATE_LIMIT_MAP.set(key, now);
  return false;
};

const compactRateLimitMap = () => {
  const cutoff = Date.now() - 60_000;
  for (const [key, value] of RATE_LIMIT_MAP.entries()) {
    if (value < cutoff) {
      RATE_LIMIT_MAP.delete(key);
    }
  }
};

const getPresenceSet = (roomId) => {
  if (!ROOM_PRESENCE.has(roomId)) {
    ROOM_PRESENCE.set(roomId, new Set());
  }
  return ROOM_PRESENCE.get(roomId);
};

const getSocketRoomsSet = (socketId) => {
  if (!SOCKET_ROOMS.has(socketId)) {
    SOCKET_ROOMS.set(socketId, new Set());
  }
  return SOCKET_ROOMS.get(socketId);
};

const getGiftQueueState = (roomId) => {
  if (!GIFT_QUEUES.has(roomId)) {
    GIFT_QUEUES.set(roomId, { queue: [], timer: null });
  }
  return GIFT_QUEUES.get(roomId);
};

const emitViewerCount = (io, roomId) => {
  const count = getPresenceSet(roomId).size;
  io.to(roomChannel(roomId)).emit("live:room:viewers", {
    roomId,
    viewerCount: count,
    timestamp: new Date().toISOString(),
  });
};

const toCleanMessage = (value) => {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text) return "";
  return text.slice(0, MAX_CHAT_LENGTH);
};

const persistMessage = async (payload) => {
  try {
    await LiveChatMessage.create({
      roomId: payload.roomId,
      messageId: payload.id,
      userId: payload.userId || null,
      username: payload.username,
      avatar: payload.avatar,
      message: payload.message,
      vipLevel: payload.vipLevel,
      frameAnimationUrl: payload.frameAnimationUrl,
    });
  } catch (error) {
    // Duplicate IDs or transient DB errors should not block realtime delivery.
    if (error?.code !== 11000) {
      console.error("Persist live message error:", error.message || error);
    }
  }
};

const flushGiftQueue = (io, roomId) => {
  const queueState = getGiftQueueState(roomId);

  if (queueState.timer) return;

  queueState.timer = setTimeout(() => {
    const batch = queueState.queue.splice(0, GIFT_BATCH_SIZE);

    if (batch.length > 0) {
      io.to(roomChannel(roomId)).emit("live:gift:batch", batch);
    }

    queueState.timer = null;

    if (queueState.queue.length > 0) {
      flushGiftQueue(io, roomId);
    }
  }, GIFT_BATCH_INTERVAL_MS);
};

const removeSocketFromRoom = (io, socket, roomId, reason = "leave") => {
  const channel = roomChannel(roomId);

  socket.leave(channel);

  const roomSet = getPresenceSet(roomId);
  roomSet.delete(socket.id);

  const joinedRooms = getSocketRoomsSet(socket.id);
  joinedRooms.delete(roomId);

  io.to(channel).emit("live:room:user-left", {
    roomId,
    user: socket.data?.liveUser || null,
    reason,
    timestamp: new Date().toISOString(),
  });

  emitViewerCount(io, roomId);

  if (roomSet.size === 0) {
    ROOM_PRESENCE.delete(roomId);

    const queueState = GIFT_QUEUES.get(roomId);
    if (queueState?.timer) {
      clearTimeout(queueState.timer);
    }
    GIFT_QUEUES.delete(roomId);
  }
};

const wrapAck = (ack) => (typeof ack === "function" ? ack : () => {});

const buildId = (prefix) => {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
};

const buildGiftPayload = (raw = {}) => {
  const quantity = Math.max(Number(raw.quantity || 1), 1);

  return {
    id: raw.id || buildId("gift"),
    roomId: raw.roomId,
    quantity,
    sender: raw.sender || null,
    receiver: raw.receiver || null,
    gift: {
      id: raw.gift?.id || raw.gift?._id || null,
      name: raw.gift?.name || "Gift",
      coinPrice: Number(raw.gift?.coinPrice || raw.gift?.price || 0),
      lottieUrl: raw.gift?.lottieUrl || "",
      animationUrl: raw.gift?.animationUrl || raw.gift?.lottieUrl || "",
      previewImage: raw.gift?.previewImage || raw.gift?.thumbnailUrl || "",
      soundUrl: raw.gift?.soundUrl || "",
      rarity: raw.gift?.rarity || "common",
    },
    timestamp: new Date().toISOString(),
  };
};

const registerLiveEngagementHandlers = (io, socket) => {
  socket.on("live:room:join", (payload = {}, ackFn) => {
    const ack = wrapAck(ackFn);
    const roomId = payload.roomId;

    if (!roomId) {
      ack({ ok: false, error: "room_id_required" });
      return;
    }

    socket.data.liveUser = payload.user || socket.data.liveUser || null;

    socket.join(roomChannel(roomId));
    getPresenceSet(roomId).add(socket.id);
    getSocketRoomsSet(socket.id).add(roomId);

    io.to(roomChannel(roomId)).emit("live:room:user-joined", {
      roomId,
      user: payload.user || null,
      timestamp: new Date().toISOString(),
    });

    emitViewerCount(io, roomId);

    ack({
      ok: true,
      roomId,
      viewerCount: getPresenceSet(roomId).size,
    });
  });

  socket.on("live:room:leave", (payload = {}, ackFn) => {
    const ack = wrapAck(ackFn);
    const roomId = payload.roomId;

    if (!roomId) {
      ack({ ok: false, error: "room_id_required" });
      return;
    }

    removeSocketFromRoom(io, socket, roomId, "leave");
    ack({ ok: true });
  });

  socket.on("live:chat:send", async (payload = {}, ackFn) => {
    const ack = wrapAck(ackFn);

    if (!payload.roomId) {
      ack({ ok: false, error: "room_id_required" });
      return;
    }

    if (isRateLimited(`chat:${socket.id}`, CHAT_RATE_LIMIT_MS)) {
      ack({ ok: false, error: "chat_rate_limited" });
      return;
    }

    const messageText = toCleanMessage(payload.message);
    if (!messageText) {
      ack({ ok: false, error: "empty_message" });
      return;
    }

    const messagePayload = {
      id: payload.id || buildId("msg"),
      roomId: payload.roomId,
      userId: payload.userId || payload.user?._id || null,
      username: payload.username || payload.user?.username || "User",
      avatar: payload.avatar || payload.user?.avatar || payload.user?.profileImage || "",
      message: messageText,
      vipLevel: Number(payload.vipLevel || payload.user?.vipLevel || 0),
      frameAnimationUrl: payload.frameAnimationUrl || payload.user?.frameAnimationUrl || "",
      createdAt: new Date().toISOString(),
    };

    io.to(roomChannel(payload.roomId)).emit("live:chat:new", messagePayload);

    ack({ ok: true, id: messagePayload.id, createdAt: messagePayload.createdAt });

    persistMessage(messagePayload);
    compactRateLimitMap();
  });

  socket.on("live:gift:send", (payload = {}, ackFn) => {
    const ack = wrapAck(ackFn);

    if (!payload.roomId) {
      ack({ ok: false, error: "room_id_required" });
      return;
    }

    if (isRateLimited(`gift:${socket.id}`, GIFT_RATE_LIMIT_MS)) {
      ack({ ok: false, error: "gift_rate_limited" });
      return;
    }

    const queueState = getGiftQueueState(payload.roomId);
    const giftPayload = buildGiftPayload(payload);

    queueState.queue.push(giftPayload);

    if (queueState.queue.length > MAX_GIFT_QUEUE) {
      queueState.queue.splice(0, queueState.queue.length - MAX_GIFT_QUEUE);
    }

    flushGiftQueue(io, payload.roomId);

    ack({ ok: true, id: giftPayload.id, queued: queueState.queue.length });
    compactRateLimitMap();
  });

  socket.on("disconnect", () => {
    const rooms = SOCKET_ROOMS.get(socket.id);

    if (rooms && rooms.size > 0) {
      for (const roomId of rooms) {
        removeSocketFromRoom(io, socket, roomId, "disconnect");
      }
    }

    SOCKET_ROOMS.delete(socket.id);
  });
};

module.exports = {
  registerLiveEngagementHandlers,
};
