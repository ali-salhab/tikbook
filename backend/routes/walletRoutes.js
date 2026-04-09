const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getBalance,
  sendGift,
  createStripeIntent,
  createTopUpRequest,
  confirmTopUpRequest,
  failTopUpRequest,
  handleStripeWebhook,
  getTopUpStatus,
  requestWithdrawal,
  getPackages,
} = require("../controllers/walletController");

const router = express.Router();

// Stripe webhook must stay public; signature verification protects it.
router.post("/stripe/webhook", handleStripeWebhook);

router.get("/packages", protect, getPackages);
router.get("/", protect, getBalance);
router.get("/:userId", protect, async (req, res) => {
  try {
    const Wallet = require("../models/Wallet");
    const wallet = await Wallet.findOne({ user: req.params.userId });
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
router.post("/topup/request", protect, createTopUpRequest);
router.post("/topup/confirm", protect, confirmTopUpRequest);
router.post("/topup/fail", protect, failTopUpRequest);
router.get("/topup/status/:reference", protect, getTopUpStatus);
router.post("/stripe/intent", protect, createStripeIntent);
router.post("/withdraw", protect, requestWithdrawal);

module.exports = router;
