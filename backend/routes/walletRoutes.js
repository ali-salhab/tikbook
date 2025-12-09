const express = require("express");
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getBalance,
  sendGift,
  topUpWallet,
  createStripeIntent,
} = require("../controllers/walletController");

const router = express.Router();

router.get("/", protect, getBalance);
router.get("/:userId", protect, async (req, res) => {
  try {
    const Wallet = require("../models/Wallet");
    const wallet = await Wallet.findOne({ userId: req.params.userId });
    if (!wallet) {
      return res.json({ balance: 0 });
    }
    res.json(wallet);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching wallet", error: error.message });
  }
});

router.post("/gift", protect, sendGift);
router.post("/topup", protect, topUpWallet); // Secure this in prod!
router.post("/stripe/intent", protect, createStripeIntent);

// Admin route to add coins to user
router.post("/add-coins", protect, admin, async (req, res) => {
  try {
    const Wallet = require("../models/Wallet");
    const Transaction = require("../models/Transaction");
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid userId or amount" });
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
    }

    // Add coins
    wallet.balance += amount;
    await wallet.save();

    // Create transaction record
    const transaction = new Transaction({
      userId,
      amount,
      type: "reward",
      status: "completed",
      description: reason || "Admin reward",
      gateway: "admin",
    });
    await transaction.save();

    res.json({ message: "Coins added successfully", wallet });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding coins", error: error.message });
  }
});

module.exports = router;
