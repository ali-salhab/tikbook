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
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VipLevel", vipLevelSchema);
