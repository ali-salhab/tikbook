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

app.use(cors());
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
const walletRoutes = require("./routes/walletRoutes");
const appVersionRoutes = require("./routes/appVersionRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/push", pushNotificationRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/versions", appVersionRoutes);

app.get("/", (req, res) => {
  res.send("TikBook API is running...");
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on("sendMessage", (message) => {
    io.to(message.receiver).emit("receiveMessage", message);
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
