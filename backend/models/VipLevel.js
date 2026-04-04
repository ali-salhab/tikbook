const mongoose = require("mongoose");

const LIVE_VIP_LEVELS = [1, 2, 3, 5, 7, 10];
const LEVEL_CODE_MAP = {
  1: "VIP1",
  2: "VIP2",
  3: "VIP3",
  5: "VIP5",
  7: "VIP7",
  10: "VIP10",
};

const vipLevelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, unique: true, min: 1 },
    code: {
      type: String,
      default: null,
    },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, default: "" },
    color: { type: String, default: "#FFD700" },
    usernameColor: { type: String, default: "#FFD700" },
    badgeImageUrl: { type: String, default: "" },
    // Lottie JSON URL for the animated main badge (used on VipProfileScreen)
    badgeLottieUrl: { type: String, default: "" },
    commentFrameLottieUrl: { type: String, default: "" },
    profileFrameLottieUrl: { type: String, default: "" },
    joinAnimationLottieUrl: { type: String, default: "" },
    joinSoundUrl: { type: String, default: "" },
    specialJoinText: { type: String, default: "" },
    // Benefits list shown on the VIP profile page
    benefits: [
      {
        titleAr: { type: String, required: true },
        title: { type: String, default: "" },
        descriptionAr: { type: String, default: "" },
        description: { type: String, default: "" },
        type: {
          type: String,
          enum: ["badge", "frame", "chat", "points", "medal", "entry", "other"],
          default: "other",
        },
        imageUrl: { type: String, default: "" },
        lottieUrl: { type: String, default: "" },
        isLocked: { type: Boolean, default: false },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    features: {
      animatedCommentFrame: { type: Boolean, default: true },
      coloredUsername: { type: Boolean, default: true },
      specialBadge: { type: Boolean, default: true },
      specialJoinAnimation: { type: Boolean, default: true },
    },
    commentBorderWidth: { type: Number, default: 1.4, min: 0, max: 8 },
    commentBubbleShape: {
      type: String,
      enum: ["classic", "rounded", "square", "pill"],
      default: "classic",
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

vipLevelSchema.pre("validate", async function syncLiveEngagementFields() {
  // Auto-generate code if not set
  if (!this.code) {
    this.code = LEVEL_CODE_MAP[this.level] || `VIP${this.level}`;
  }

  if (!this.usernameColor && this.color) {
    this.usernameColor = this.color;
  }
});

const VipLevel = mongoose.model("VipLevel", vipLevelSchema);

module.exports = VipLevel;
module.exports.LIVE_VIP_LEVELS = LIVE_VIP_LEVELS;
module.exports.LEVEL_CODE_MAP = LEVEL_CODE_MAP;
