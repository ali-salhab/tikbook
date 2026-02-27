const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  deleteUser,
  sendNotificationToUser,
  getAllVideos,
  deleteVideo,
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
router.delete("/videos/:id", protect, admin, deleteVideo);
router.post("/wallet/grant", protect, admin, grantCoinsToUser);

// Withdrawal requests management
router.get("/withdrawals", protect, admin, async (req, res) => {
  try {
    const WithdrawalRequest = require("../models/WithdrawalRequest");
    const requests = await WithdrawalRequest.find()
      .populate("user", "username email profileImage")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/withdrawals/:id/approve", protect, admin, async (req, res) => {
  try {
    const WithdrawalRequest = require("../models/WithdrawalRequest");
    const Wallet = require("../models/Wallet");
    const Transaction = require("../models/Transaction");
    const { adminNote } = req.body;

    const withdrawalReq = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawalReq) return res.status(404).json({ message: "الطلب غير موجود" });
    if (withdrawalReq.status !== "pending") return res.status(400).json({ message: "تم مراجعة هذا الطلب مسبقاً" });

    // Deduct from earnings
    const wallet = await Wallet.findOne({ user: withdrawalReq.user });
    if (wallet && wallet.earnings >= withdrawalReq.amount) {
      wallet.earnings -= withdrawalReq.amount;
      await wallet.save();
    }

    await Transaction.create({
      user: withdrawalReq.user,
      type: "withdrawal",
      amount: -withdrawalReq.amount,
      description: `سحب رصيد - ${withdrawalReq.fullName} - ${withdrawalReq.phoneNumber}`,
      status: "completed",
    });

    withdrawalReq.status = "approved";
    withdrawalReq.adminNote = adminNote || "";
    withdrawalReq.reviewedBy = req.user._id;
    withdrawalReq.reviewedAt = new Date();
    await withdrawalReq.save();

    res.json({ message: "تمت الموافقة على طلب السحب", request: withdrawalReq });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/withdrawals/:id/reject", protect, admin, async (req, res) => {
  try {
    const WithdrawalRequest = require("../models/WithdrawalRequest");
    const { adminNote } = req.body;

    const withdrawalReq = await WithdrawalRequest.findById(req.params.id);
    if (!withdrawalReq) return res.status(404).json({ message: "الطلب غير موجود" });
    if (withdrawalReq.status !== "pending") return res.status(400).json({ message: "تم مراجعة هذا الطلب مسبقاً" });

    withdrawalReq.status = "rejected";
    withdrawalReq.adminNote = adminNote || "";
    withdrawalReq.reviewedBy = req.user._id;
    withdrawalReq.reviewedAt = new Date();
    await withdrawalReq.save();

    res.json({ message: "تم رفض طلب السحب", request: withdrawalReq });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// New routes for advanced admin features
router.get("/transactions", protect, admin, async (req, res) => {
  try {
    const Transaction = require("../models/Transaction");
    const transactions = await Transaction.find()
      .populate("user", "username email profileImage")
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
    const wallet = await Wallet.findOne({ user: transaction.user });
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
