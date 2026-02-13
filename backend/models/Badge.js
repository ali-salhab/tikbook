const mongoose = require("mongoose");

const badgeSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["frame", "background", "effect"],
      default: "frame",
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary"],
      default: "common",
    },
    price: {
      type: Number,
      default: 0, // Price in diamonds/coins
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // If true, can only be gifted by admin, not purchased
    isExclusive: {
      type: Boolean,
      default: false,
    },
    // Additional properties for animations or effects
    properties: {
      animation: {
        type: String,
        default: "none",
      },
      glowEffect: {
        type: Boolean,
        default: false,
      },
      particleEffect: {
        type: String,
        default: "none",
      },
    },
    // Display order in shop
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Badge = mongoose.model("Badge", badgeSchema);

module.exports = Badge;
