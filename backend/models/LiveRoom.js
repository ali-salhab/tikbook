const mongoose = require("mongoose");

const liveRoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverImage: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "ended", "scheduled"],
      default: "active",
    },
    category: {
      type: String,
      enum: ["music", "chat", "gaming", "education", "business", "other"],
      default: "chat",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    // Speakers: users who can talk
    speakers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        isMuted: {
          type: Boolean,
          default: false,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Listeners: users who can only listen
    listeners: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Users who raised hand to speak
    handRaised: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        raisedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    maxParticipants: {
      type: Number,
      default: 1000,
    },
    maxSpeakers: {
      type: Number,
      default: 20,
    },
    totalViewers: {
      type: Number,
      default: 0,
    },
    totalGifts: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    scheduledFor: {
      type: Date,
    },
    // Agora/audio channel info
    agoraChannelName: {
      type: String,
    },
    agoraToken: {
      type: String,
    },
  },
  { timestamps: true },
);

// Virtual for current participant count
liveRoomSchema.virtual("participantCount").get(function () {
  return this.speakers.length + this.listeners.length;
});

// Virtual for speaker count
liveRoomSchema.virtual("speakerCount").get(function () {
  return this.speakers.length;
});

// Method to add speaker
liveRoomSchema.methods.addSpeaker = function (userId) {
  const existingSpeaker = this.speakers.find(
    (s) => s.user.toString() === userId.toString(),
  );
  if (existingSpeaker) return false;

  // Remove from listeners if present
  this.listeners = this.listeners.filter(
    (l) => l.user.toString() !== userId.toString(),
  );

  // Remove from hand raised if present
  this.handRaised = this.handRaised.filter(
    (h) => h.user.toString() !== userId.toString(),
  );

  this.speakers.push({ user: userId });
  return true;
};

// Method to add listener
liveRoomSchema.methods.addListener = function (userId) {
  const existingListener = this.listeners.find(
    (l) => l.user.toString() === userId.toString(),
  );
  if (existingListener) return false;

  const existingSpeaker = this.speakers.find(
    (s) => s.user.toString() === userId.toString(),
  );
  if (existingSpeaker) return false;

  this.listeners.push({ user: userId });
  this.totalViewers += 1;
  return true;
};

// Method to remove participant
liveRoomSchema.methods.removeParticipant = function (userId) {
  this.speakers = this.speakers.filter(
    (s) => s.user.toString() !== userId.toString(),
  );
  this.listeners = this.listeners.filter(
    (l) => l.user.toString() !== userId.toString(),
  );
  this.handRaised = this.handRaised.filter(
    (h) => h.user.toString() !== userId.toString(),
  );
};

// Method to toggle mute
liveRoomSchema.methods.toggleMute = function (userId) {
  const speaker = this.speakers.find(
    (s) => s.user.toString() === userId.toString(),
  );
  if (speaker) {
    speaker.isMuted = !speaker.isMuted;
    return speaker.isMuted;
  }
  return null;
};

// Method to raise hand
liveRoomSchema.methods.raiseHand = function (userId) {
  const existingRequest = this.handRaised.find(
    (h) => h.user.toString() === userId.toString(),
  );
  if (existingRequest) return false;

  this.handRaised.push({ user: userId });
  return true;
};

// Method to lower hand
liveRoomSchema.methods.lowerHand = function (userId) {
  this.handRaised = this.handRaised.filter(
    (h) => h.user.toString() !== userId.toString(),
  );
};

module.exports = mongoose.model("LiveRoom", liveRoomSchema);
