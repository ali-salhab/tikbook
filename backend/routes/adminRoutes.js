const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  deleteUser,
  sendNotificationToUser,
  getAllVideos,
  sendBroadcastNotification,
  grantCoinsToUser,
} = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/stats", protect, admin, getDashboardStats);
router.get("/users", protect, admin, getAllUsers);
router.delete("/users/:id", protect, admin, deleteUser);
router.post("/notify/all", protect, admin, sendBroadcastNotification);
router.post("/notify/:userId", protect, admin, sendNotificationToUser);
router.get("/videos", protect, admin, getAllVideos);
router.post("/wallet/grant", protect, admin, grantCoinsToUser);

// New routes for advanced admin features
router.get("/transactions", protect, admin, async (req, res) => {
  try {
    const Transaction = require("../models/Transaction");
    const transactions = await Transaction.find()
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(transactions);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching transactions", error: error.message });
  }
});

router.post("/transactions/:id/refund", protect, admin, async (req, res) => {
  try {
    const Transaction = require("../models/Transaction");
    const Wallet = require("../models/Wallet");

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "completed") {
      return res
        .status(400)
        .json({ message: "Can only refund completed transactions" });
    }

    // Update transaction status
    transaction.status = "refunded";
    await transaction.save();

    // Deduct from user wallet
    const wallet = await Wallet.findOne({ userId: transaction.userId });
    if (wallet) {
      wallet.balance -= transaction.amount;
      await wallet.save();
    }

    res.json({ message: "Transaction refunded successfully", transaction });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error refunding transaction", error: error.message });
  }
});

module.exports = router;
