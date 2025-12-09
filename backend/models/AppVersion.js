const mongoose = require("mongoose");

const appVersionSchema = mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios"],
      default: "android",
    },
    priority: {
      type: String,
      enum: ["force", "optional"],
      default: "optional",
    },
    url: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AppVersion", appVersionSchema);
