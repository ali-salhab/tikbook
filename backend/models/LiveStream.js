const mongoose = require("mongoose");

const liveStreamSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channelName: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "Live Stream",
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
    viewers: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const LiveStream = mongoose.model("LiveStream", liveStreamSchema);

module.exports = LiveStream;
