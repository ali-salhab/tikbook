const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    nameAr: {
      type: String,
      required: true,
    },
    // Animation file URL (Lottie JSON or GIF)
    animationUrl: {
      type: String,
      required: true,
    },
    // Static thumbnail for gift selection
    thumbnailUrl: {
      type: String,
      required: true,
    },
    // Animation type
    animationType: {
      type: String,
      enum: ["lottie", "gif", "svga", "video"],
      default: "lottie",
    },
    // Gift price in coins
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    // Gift category
    category: {
      type: String,
      enum: ["basic", "premium", "vip", "special"],
      default: "basic",
    },
    // Animation duration in seconds
    duration: {
      type: Number,
      default: 3,
    },
    // Combo config - if user sends multiple times
    comboEnabled: {
      type: Boolean,
      default: true,
    },
    comboMultiplier: {
      type: Number,
      default: 1.5, // 50% bigger animation for combos
    },
    // Full screen effect for premium gifts
    fullScreen: {
      type: Boolean,
      default: false,
    },
    // Sound effect URL
    soundUrl: {
      type: String,
    },
    // Active status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Sort order
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const giftTransactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gift",
      required: true,
    },
    // Context: live room, video, profile
    context: {
      type: String,
      enum: ["live", "video", "profile"],
      required: true,
    },
    contextId: {
      type: String, // LiveRoom ID or Video ID
    },
    // Number of gifts sent (combo count)
    quantity: {
      type: Number,
      default: 1,
    },
    // Total coins spent
    totalCoins: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const Gift = mongoose.model("Gift", giftSchema);
const GiftTransaction = mongoose.model(
  "GiftTransaction",
  giftTransactionSchema,
);

module.exports = { Gift, GiftTransaction };
