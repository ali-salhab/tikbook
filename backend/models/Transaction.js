const mongoose = require("mongoose");

const transactionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "purchase",
        "badge_purchase",
        "gift_sent",
        "gift_received",
        "withdrawal",
        "admin_grant",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    // For gifts: who sent/received it
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // For purchases: the App Store / Play Store transaction ID
    platformTransactionId: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    gateway: {
      type: String,
      default: "manual",
    },
    paymentMethod: {
      type: String,
      default: "manual",
    },
    currency: {
      type: String,
      default: "EGP",
    },
    paymentMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed",
    },
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
