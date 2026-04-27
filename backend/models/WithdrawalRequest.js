const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "approved", "rejected"],
      required: true,
    },
    note: { type: String, default: "" },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const withdrawalRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    // Coin amount being withdrawn (kept for backward compatibility).
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    // USD value at the moment of submission. All UI displays USD.
    amountUsd: {
      type: Number,
      required: true,
      default: 0,
    },
    // Conversion rate snapshot (USD per 1 coin).
    usdPerCoin: {
      type: Number,
      required: true,
      default: 0.01,
    },
    earningsAtRequest: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
