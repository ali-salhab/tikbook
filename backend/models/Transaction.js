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
      enum: ["purchase", "gift_sent", "gift_received", "withdrawal"],
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
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
