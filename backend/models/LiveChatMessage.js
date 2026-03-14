const mongoose = require("mongoose");

const liveChatMessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    vipLevel: {
      type: Number,
      default: 0,
    },
    frameAnimationUrl: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    },
  },
  { timestamps: true },
);

// Keep transient room chat light in DB and let older rows self-expire.
liveChatMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
liveChatMessageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model("LiveChatMessage", liveChatMessageSchema);
