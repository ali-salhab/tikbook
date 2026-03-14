const mongoose = require("mongoose");

const vipFrameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    vipLevel: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 5, 7, 10],
      index: true,
    },
    lottieUrl: {
      type: String,
      required: true,
      trim: true,
    },
    previewImage: {
      type: String,
      default: "",
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

vipFrameSchema.index({ vipLevel: 1, sortOrder: 1 });

module.exports = mongoose.model("VipFrame", vipFrameSchema);
