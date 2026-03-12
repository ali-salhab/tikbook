const mongoose = require("mongoose");

const vipLevelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true, unique: true, min: 1, max: 15 },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, default: "" },
    color: { type: String, default: "#FFD700" },
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

module.exports = mongoose.model("VipLevel", vipLevelSchema);
