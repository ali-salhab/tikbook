const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.set("io", io);
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://tikbook-admin.onrender.com",
  "https://tikbook-1.onrender.com", // Your actual admin URL
  "https://tikbook-1cdb.onrender.com", // Your backend URL (for self-requests)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      if (req.originalUrl?.startsWith("/api/wallet/stripe/webhook")) {
        req.rawBody = buf.toString("utf8");
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static("uploads"));

// Routes
const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const pushNotificationRoutes = require("./routes/pushNotificationRoutes");
const liveRoutes = require("./routes/liveRoutes");
const liveKitRoutes = require("./routes/livekitRoutes");
const liveRoomRoutes = require("./routes/liveRoomRoutes");
const walletRoutes = require("./routes/walletRoutes");
const appVersionRoutes = require("./routes/appVersionRoutes");
const healthRoutes = require("./routes/healthRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const badgeRoutes = require("./routes/badgeRoutes");
const giftRoutes = require("./routes/giftRoutes");
const statusRoutes = require("./routes/statusRoutes");
const vipRoutes = require("./routes/vipRoutes");
const liveEngagementRoutes = require("./routes/liveEngagementRoutes");
const {
  registerLiveEngagementHandlers,
} = require("./services/liveEngagementSocketService");

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/push", pushNotificationRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/livekit", liveKitRoutes);
app.use("/api/live-rooms", liveRoomRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/versions", appVersionRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/gifts", giftRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/vip", vipRoutes);
app.use("/api/live-engagement", liveEngagementRoutes);

app.get("/", (req, res) => {
  res.send("TikBook API is running...");
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Scalable live room engagement handlers (chat, gifts, presence).
  registerLiveEngagementHandlers(io, socket);

  // Join user room
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  // Messaging
  socket.on("sendMessage", (message) => {
    io.to(message.receiver).emit("receiveMessage", message);
  });

  // Live Room Events
  // Join live room
  socket.on("liveroom:join", ({ roomId, userId, user }) => {
    socket.join(`liveroom:${roomId}`);
    console.log(`User ${userId} joined live room ${roomId}`);

    // Notify all participants in the room
    io.to(`liveroom:${roomId}`).emit("liveroom:user_joined", {
      userId,
      user,
      timestamp: new Date(),
    });
  });

  // Leave live room
  socket.on("liveroom:leave", ({ roomId, userId, user }) => {
    socket.leave(`liveroom:${roomId}`);
    console.log(`User ${userId} left live room ${roomId}`);

    // Notify all participants in the room
    io.to(`liveroom:${roomId}`).emit("liveroom:user_left", {
      userId,
      user,
      timestamp: new Date(),
    });
  });

  // Raise hand
  socket.on("liveroom:raise_hand", ({ roomId, userId, user }) => {
    console.log(`User ${userId} raised hand in room ${roomId}`);

    // Notify host and moderators
    io.to(`liveroom:${roomId}`).emit("liveroom:hand_raised", {
      userId,
      user,
      timestamp: new Date(),
    });
  });

  // Lower hand
  socket.on("liveroom:lower_hand", ({ roomId, userId }) => {
    console.log(`User ${userId} lowered hand in room ${roomId}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:hand_lowered", {
      userId,
      timestamp: new Date(),
    });
  });

  // Make speaker
  socket.on("liveroom:make_speaker", ({ roomId, userId, user }) => {
    console.log(`User ${userId} became speaker in room ${roomId}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:speaker_added", {
      userId,
      user,
      timestamp: new Date(),
    });
  });

  // Remove speaker
  socket.on("liveroom:remove_speaker", ({ roomId, userId }) => {
    console.log(`User ${userId} removed as speaker in room ${roomId}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:speaker_removed", {
      userId,
      timestamp: new Date(),
    });
  });

  // Toggle mute
  socket.on("liveroom:toggle_mute", ({ roomId, userId, isMuted }) => {
    console.log(
      `User ${userId} ${isMuted ? "muted" : "unmuted"} in room ${roomId}`,
    );

    io.to(`liveroom:${roomId}`).emit("liveroom:mute_toggled", {
      userId,
      isMuted,
      timestamp: new Date(),
    });
  });

  // Room update (participant count, etc.)
  socket.on("liveroom:update", ({ roomId, data }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:updated", {
      data,
      timestamp: new Date(),
    });
  });

  // Room ended
  socket.on("liveroom:end", ({ roomId }) => {
    console.log(`Live room ${roomId} ended`);

    io.to(`liveroom:${roomId}`).emit("liveroom:ended", {
      roomId,
      timestamp: new Date(),
    });
  });

  // Send gift in live room
  socket.on("liveroom:send_gift", ({ roomId, gift, sender }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:gift_received", {
      gift,
      sender,
      timestamp: new Date(),
    });
  });

  // Chat message in live room
  socket.on("liveroom:send_message", ({ roomId, message, user, clientMessageId }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:message_received", {
      message,
      user,
      id: clientMessageId || Date.now().toString(),
      clientMessageId: clientMessageId || null,
      timestamp: new Date(),
    });
  });

  // ── Agora Live Stream Chat (LiveScreen.js) ────────────────────────────────
  socket.on("live:join", ({ channelName, userId }) => {
    if (channelName) {
      socket.join(`live:${channelName}`);
      console.log(`User ${userId} joined live stream channel ${channelName}`);
    }
  });

  socket.on("live:send_message", ({ channelName, message }) => {
    if (channelName && message) {
      io.to(`live:${channelName}`).emit("live:message_received", {
        ...message,
        id: message.id || Date.now(),
        timestamp: new Date(),
      });
    }
  });

  // Music Player Sync
  socket.on("liveroom:music_update", ({ roomId, state }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:music_synced", {
      state,
      timestamp: new Date(),
    });
  });

  // Host/mod rejects a hand raise — notify the requester
  socket.on("liveroom:reject_hand", ({ roomId, userId }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:hand_rejected", {
      userId,
      timestamp: new Date(),
    });
  });

  // Host/mod invites a viewer to a seat
  socket.on("liveroom:invite_to_seat", ({ roomId, userId, invitedBy }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:seat_invite_received", {
      userId,
      invitedBy,
      timestamp: new Date(),
    });
  });

  // Viewer requests a seat (taps empty seat)
  socket.on("liveroom:seat_request", ({ roomId, user }) => {
    // Broadcast to everyone in the room — host/mods pick it up
    io.to(`liveroom:${roomId}`).emit("liveroom:seat_request_received", {
      user,
      timestamp: new Date(),
    });
  });

  // Host approves a seat request
  socket.on("liveroom:seat_request_approved", ({ roomId, userId, approvedBy }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:seat_request_approved", {
      userId,
      approvedBy,
      timestamp: new Date(),
    });
  });

  // Host rejects a seat request
  socket.on("liveroom:seat_request_rejected", ({ roomId, userId }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:seat_request_rejected", {
      userId,
      timestamp: new Date(),
    });
  });

  // Permissions / User Management Sync
  socket.on("liveroom:permission_update", ({ roomId, permissions }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:permissions_changed", {
      permissions,
      timestamp: new Date(),
    });
  });

  socket.on("liveroom:user_banned", ({ roomId, userId, reason }) => {
    io.to(`liveroom:${roomId}`).emit("liveroom:user_banned", {
      userId,
      reason,
      timestamp: new Date(),
    });
    // Force kick logic on client side would listen to this
  });

  // Kick user from room
  socket.on("liveroom:kick_user", ({ roomId, userId, kickedBy }) => {
    console.log(`User ${userId} kicked from room ${roomId} by ${kickedBy}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:user_kicked", {
      userId,
      kickedBy,
      timestamp: new Date(),
    });
  });

  // Ban user from room
  socket.on("liveroom:ban_user", ({ roomId, userId, bannedBy, reason }) => {
    console.log(`User ${userId} banned from room ${roomId} by ${bannedBy}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:user_banned", {
      userId,
      bannedBy,
      reason,
      timestamp: new Date(),
    });
  });

  // Assign moderator
  socket.on("liveroom:assign_moderator", ({ roomId, userId, assignedBy }) => {
    console.log(`User ${userId} assigned as moderator in room ${roomId}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:moderator_assigned", {
      userId,
      assignedBy,
      timestamp: new Date(),
    });
  });

  // Remove moderator
  socket.on("liveroom:remove_moderator", ({ roomId, userId }) => {
    console.log(`User ${userId} removed as moderator from room ${roomId}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:moderator_removed", {
      userId,
      timestamp: new Date(),
    });
  });

  // Music control
  socket.on("liveroom:music_control", ({ roomId, action, musicPlayer }) => {
    console.log(`Music ${action} in room ${roomId}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:music_updated", {
      action,
      musicPlayer,
      timestamp: new Date(),
    });
  });

  // Host force-mute / force-unmute a speaker
  socket.on("liveroom:host_force_mute", ({ roomId, targetUserId, mute, byUserId }) => {
    console.log(`Host ${byUserId} ${mute ? "muted" : "unmuted"} user ${targetUserId} in room ${roomId}`);
    io.to(`liveroom:${roomId}`).emit("liveroom:force_mute", {
      targetUserId,
      mute,
      byUserId,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

process.on("exit", (code) => {
  console.log(`About to exit with code: ${code}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
