const mongoose = require("mongoose");

const commentSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const videoSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Backward-compatible primary media URL (first media item)
    videoUrl: {
      type: String,
      required: true,
    },
    // New: support multi-media posts (videos or images)
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["video", "image"], default: "video" },
      },
    ],
    description: {
      type: String,
    },
    sound: {
      name: { type: String },
      url: { type: String },
      path: { type: String },
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    location: {
      name: { type: String },
      coords: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    privacy: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    allowDuet: {
      type: Boolean,
      default: true,
    },
    allowStitch: {
      type: Boolean,
      default: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
