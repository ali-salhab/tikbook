const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    socialLinks: {
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
      twitter: { type: String, default: "" },
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationBadge: {
      type: String,
      enum: ["none", "blue", "gold"],
      default: "none",
    },
    // Profile frame/badge system
    ownedBadges: [
      {
        badge: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Badge",
        },
        acquiredAt: {
          type: Date,
          default: Date.now,
        },
        giftedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    activeBadge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      default: null,
    },
    // Custom backgrounds for live rooms
    ownedBackgrounds: [
      {
        badge: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Badge",
        },
        acquiredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    activeBackground: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      default: null,
    },
    pushToken: {
      type: String,
      default: "",
    },
    fcmToken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);

module.exports = User;
