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
const allowedOrigins = [
  "http://localhost:5173",
  "https://tikbook-admin.onrender.com", // Add after getting your URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
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

app.get("/", (req, res) => {
  res.send("TikBook API is running...");
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

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
    console.log(`Gift sent in room ${roomId} by ${sender.username}`);

    io.to(`liveroom:${roomId}`).emit("liveroom:gift_received", {
      gift,
      sender,
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
