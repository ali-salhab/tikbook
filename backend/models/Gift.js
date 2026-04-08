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
    // Dedicated Lottie URL for clients that only support JSON animations.
    lottieUrl: {
      type: String,
      default: "",
    },
    // WebM video with alpha channel (transparent background) for rich gift animations
    webmUrl: {
      type: String,
      default: "",
    },
    // Static thumbnail for gift selection
    thumbnailUrl: {
      type: String,
      required: true,
    },
    // Alias-friendly preview image used by admin/mobile live selector.
    previewImage: {
      type: String,
      default: "",
    },
    // Animation type
    animationType: {
      type: String,
      enum: ["lottie", "gif", "svga", "video", "glb", "webm_alpha", "png"],
      default: "lottie",
    },
    // Transparent PNG file URL (for animated PNG gifts)
    pngUrl: {
      type: String,
      default: "",
    },
    // Sound effect URL (optional, e.g. for roaring lion)
    soundUrl: {
      type: String,
      default: "",
    },
    // Gift price in coins
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    coinPrice: {
      type: Number,
      min: 1,
      default: null,
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary", "mythic"],
      default: "common",
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

    // ── Animation Effect Config (controlled by admin) ──────────────────────
    // Type of floating particles around the gift
    effectType: {
      type: String,
      enum: ["none", "hearts", "stars", "sparkles", "confetti", "bubbles", "roses", "fire", "snow", "custom"],
      default: "sparkles",
    },
    // Number of particles
    effectCount: {
      type: Number,
      default: 8,
      min: 0,
      max: 30,
    },
    // Particle size
    effectSize: {
      type: String,
      enum: ["tiny", "small", "medium", "large", "huge"],
      default: "medium",
    },
    // Particle animation speed
    effectSpeed: {
      type: String,
      enum: ["slow", "medium", "fast"],
      default: "medium",
    },
    // Particle color override (hex, e.g. #FF4444). Empty = use emoji default.
    effectColor: {
      type: String,
      default: "",
    },
    // Custom effect emoji/char when effectType === 'custom'
    effectCustomChar: {
      type: String,
      default: "✨",
    },
    // Glow color behind the gift image
    glowColor: {
      type: String,
      default: "#FFD700",
    },
    // Glow opacity (0–1)
    glowOpacity: {
      type: Number,
      default: 0.25,
      min: 0,
      max: 1,
    },
    // Dance animation style when gift is displayed
    danceStyle: {
      type: String,
      enum: ["wiggle", "bounce", "spin", "float", "pulse", "none"],
      default: "wiggle",
    },
    // Entry (entrance) animation style
    entryEffect: {
      type: String,
      enum: ["pop", "zoom", "slide", "flip", "rubber"],
      default: "pop",
    },
  },
  {
    timestamps: true,
  },
);

giftSchema.pre("validate", async function syncGiftAliases() {
  if (!this.coinPrice && this.price) {
    this.coinPrice = this.price;
  }

  if (!this.price && this.coinPrice) {
    this.price = this.coinPrice;
  }

  if (!this.previewImage && this.thumbnailUrl) {
    this.previewImage = this.thumbnailUrl;
  }

  if (!this.thumbnailUrl && this.previewImage) {
    this.thumbnailUrl = this.previewImage;
  }

  if (!this.lottieUrl && this.animationType === "lottie" && this.animationUrl) {
    this.lottieUrl = this.animationUrl;
  }

  if (!this.animationUrl && this.lottieUrl) {
    this.animationType = "lottie";
    this.animationUrl = this.lottieUrl;
  }
});

giftSchema.index({ isActive: 1, sortOrder: 1, coinPrice: 1 });

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
