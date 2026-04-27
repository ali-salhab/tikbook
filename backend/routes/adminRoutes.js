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
  updateUserLevel,
  updateUserVipLevel,
  uploadAsset,
} = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");
const { adminMemoryUpload } = require("../middleware/uploadMiddleware");

router.get("/stats", protect, admin, getDashboardStats);
router.get("/users", protect, admin, getAllUsers);
router.delete("/users/:id", protect, admin, deleteUser);
router.post("/notify/all", protect, admin, sendBroadcastNotification);
router.post("/notify/:userId", protect, admin, sendNotificationToUser);
router.get("/videos", protect, admin, getAllVideos);
router.delete("/videos/:id", protect, admin, deleteVideo);
router.post("/wallet/grant", protect, admin, grantCoinsToUser);
router.put("/users/:id/level", protect, admin, updateUserLevel);
router.put("/users/:id/vip-level", protect, admin, updateUserVipLevel);

// Generic asset upload — returns Cloudinary URL
// Wrap multer in a custom handler so file-type rejections return 400 (not 500)
router.post("/upload", protect, admin, (req, res, next) => {
  adminMemoryUpload.single("file")(req, res, (err) => {
    if (err) {
      // Multer size/filter error → 400
      return res.status(400).json({ success: false, message: err.message || "الملف مرفوض" });
    }
    next();
  });
}, uploadAsset);

// ── Withdrawal requests management ────────────────────────────────────────────
const COIN_USD_PAYOUT_RATE = Number(process.env.COIN_USD_PAYOUT_RATE || 0.01);
const _coinsToUsd = (c) => Number((Number(c || 0) * COIN_USD_PAYOUT_RATE).toFixed(2));

const _notifyUser = async (req, userId, title, body) => {
  try {
    const Notification = require("../models/Notification");
    const User = require("../models/User");
    const notification = await Notification.create({
      user: userId,
      type: "withdrawal",
      message: body,
      title,
      read: false,
    });
    const user = await User.findById(userId);
    const token = user?.pushToken || user?.fcmToken;
    if (token) {
      try {
        const { sendPushNotification } = require("../services/firebaseService");
        await sendPushNotification(token, title, body, {
          type: "withdrawal",
          notificationId: String(notification._id),
        });
      } catch (_) {}
    }
    try {
      const io = req?.app?.get?.("io");
      if (io)
        io.to(`user:${userId}`).emit("withdrawal:status_changed", {
          notification,
        });
    } catch (_) {}
  } catch (e) {
    console.error("notifyUser (withdrawal) failed:", e.message);
  }
};

router.get("/withdrawals", protect, admin, async (req, res) => {
  try {
    const WithdrawalRequest = require("../models/WithdrawalRequest");
    const { status } = req.query;
    const query = {};
    if (status && status !== "all") query.status = status;

    const requests = await WithdrawalRequest.find(query)
      .populate("user", "username email profileImage")
      .populate("reviewedBy", "username email")
      .sort({ createdAt: -1 });

    const enriched = requests.map((r) => {
      const obj = r.toObject();
      obj.amountUsd =
        obj.amountUsd != null ? obj.amountUsd : _coinsToUsd(obj.amount);
      obj.usdPerCoin = obj.usdPerCoin || COIN_USD_PAYOUT_RATE;
      return obj;
    });

    res.json({
      usdPerCoin: COIN_USD_PAYOUT_RATE,
      total: enriched.length,
      requests: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const _updateWithdrawalStatus = async (req, res, forcedStatus) => {
  try {
    const WithdrawalRequest = require("../models/WithdrawalRequest");
    const Wallet = require("../models/Wallet");
    const Transaction = require("../models/Transaction");
    const status = forcedStatus || req.body?.status;
    const adminNote = req.body?.adminNote;

    const allowed = ["processing", "approved", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "حالة غير صالحة" });
    }

    const wd = await WithdrawalRequest.findById(req.params.id);
    if (!wd) return res.status(404).json({ message: "الطلب غير موجود" });

    if (wd.status === "approved" || wd.status === "rejected") {
      return res.status(400).json({ message: "تم إغلاق هذا الطلب مسبقاً" });
    }

    if (status === "approved") {
      const wallet = await Wallet.findOne({ user: wd.user });
      if (wallet && wallet.earnings >= wd.amount) {
        wallet.earnings -= wd.amount;
        await wallet.save();
      }
      await Transaction.create({
        user: wd.user,
        type: "withdrawal",
        amount: -wd.amount,
        description: `سحب رصيد - ${wd.fullName} - ${wd.phoneNumber} ($${(
          wd.amountUsd ?? _coinsToUsd(wd.amount)
        ).toFixed(2)})`,
        status: "completed",
      });
      wd.reviewedAt = new Date();
      wd.reviewedBy = req.user._id;
    }

    if (status === "rejected") {
      wd.reviewedAt = new Date();
      wd.reviewedBy = req.user._id;
    }

    wd.status = status;
    wd.adminNote = adminNote || wd.adminNote || "";
    wd.statusHistory = wd.statusHistory || [];
    wd.statusHistory.push({
      status,
      note: adminNote || "",
      changedAt: new Date(),
      changedBy: req.user._id,
    });
    await wd.save();

    const usd = (wd.amountUsd ?? _coinsToUsd(wd.amount)).toFixed(2);
    const titles = {
      processing: "جاري معالجة طلب السحب",
      approved: "تمت الموافقة على طلب السحب",
      rejected: "تم رفض طلب السحب",
    };
    const bodies = {
      processing: `طلب سحبك بقيمة $${usd} قيد المعالجة الآن.`,
      approved: `تمت الموافقة على طلب سحبك بقيمة $${usd}. سنتواصل معك قريباً.`,
      rejected: `تم رفض طلب سحبك بقيمة $${usd}.${
        adminNote ? ` السبب: ${adminNote}` : ""
      }`,
    };
    await _notifyUser(req, wd.user, titles[status], bodies[status]);

    res.json({ message: "تم تحديث حالة الطلب", request: wd });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generic status update — supports processing/approved/rejected
router.post("/withdrawals/:id/status", protect, admin, (req, res) =>
  _updateWithdrawalStatus(req, res),
);

// Backward-compatible aliases
router.post("/withdrawals/:id/approve", protect, admin, (req, res) =>
  _updateWithdrawalStatus(req, res, "approved"),
);
router.post("/withdrawals/:id/reject", protect, admin, (req, res) =>
  _updateWithdrawalStatus(req, res, "rejected"),
);

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

router.post("/transactions/:id/approve", protect, admin, async (req, res) => {
  try {
    const Transaction = require("../models/Transaction");
    const Wallet = require("../models/Wallet");

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending transactions can be approved" });
    }

    let wallet = await Wallet.findOne({ user: transaction.user });
    if (!wallet) {
      wallet = await Wallet.create({ user: transaction.user });
    }

    wallet.balance += Number(transaction.amount || 0);
    await wallet.save();

    transaction.status = "completed";
    await transaction.save();

    res.json({ message: "Transaction approved successfully", transaction });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error approving transaction", error: error.message });
  }
});

router.post("/transactions/:id/reject", protect, admin, async (req, res) => {
  try {
    const Transaction = require("../models/Transaction");

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending transactions can be rejected" });
    }

    transaction.status = "failed";
    await transaction.save();

    res.json({ message: "Transaction rejected successfully", transaction });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error rejecting transaction", error: error.message });
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
