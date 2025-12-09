const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { createCoinPurchaseIntent } = require("../services/stripeService");

// @desc    Get user wallet balance
// @route   GET /api/wallet
// @access  Private
const getBalance = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process a gift transaction (Coins -> Diamonds)
// @route   POST /api/wallet/gift
// @access  Private
const sendGift = async (req, res) => {
  const { receiverId, amount, giftName } = req.body;

  if (req.user._id.toString() === receiverId) {
    return res.status(400).json({ message: "Cannot send gift to yourself" });
  }

  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    // 1. Check Sender Balance
    const senderWallet = await Wallet.findOne({ user: req.user._id }).session(
      session
    );
    if (!senderWallet || senderWallet.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient coins" });
    }

    // 2. Deduct from Sender
    senderWallet.balance -= amount;
    await senderWallet.save({ session });

    // 3. Add to Receiver (Earnings)
    let receiverWallet = await Wallet.findOne({ user: receiverId }).session(
      session
    );
    if (!receiverWallet) {
      receiverWallet = await Wallet.create([{ user: receiverId }], { session });
      receiverWallet = receiverWallet[0];
    }
    receiverWallet.earnings += amount; // Usually 1 Coin = 0.5 Diamonds (platform cut), but 1:1 for now
    await receiverWallet.save({ session });

    // 4. Create Transaction Records
    await Transaction.create(
      [
        {
          user: req.user._id,
          type: "gift_sent",
          amount: -amount,
          relatedUser: receiverId,
          description: `Sent ${giftName}`,
        },
      ],
      { session }
    );

    await Transaction.create(
      [
        {
          user: receiverId,
          type: "gift_received",
          amount: amount,
          relatedUser: req.user._id,
          description: `Received ${giftName}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({ success: true, newBalance: senderWallet.balance });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Simulate Top Up (In production, call this from RevenueCat Webhook)
// @route   POST /api/wallet/topup
// @access  Private
const topUpWallet = async (req, res) => {
  const { amount, transactionId } = req.body;

  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) wallet = await Wallet.create({ user: req.user._id });

    wallet.balance += Number(amount);
    await wallet.save();

    await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: Number(amount),
      platformTransactionId: transactionId || `TEST-${Date.now()}`,
      description: "Coin Top Up",
    });

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getBalance, sendGift, topUpWallet };

// @desc    Create Stripe PaymentIntent for coins
// @route   POST /api/wallet/stripe/intent
// @access  Private
module.exports.createStripeIntent = async (req, res) => {
  try {
    const { coinAmount } = req.body; // number of coins user wants to buy
    const centsPerCoin = Number(process.env.CENTS_PER_COIN || 100); // $1 per coin default
    const amountCents = Number(coinAmount) * centsPerCoin;
    if (!amountCents || amountCents <= 0) {
      return res.status(400).json({ message: "Invalid coin amount" });
    }

    const intent = await createCoinPurchaseIntent({
      amountCents,
      metadata: {
        userId: req.user._id.toString(),
        coinAmount: String(coinAmount),
      },
    });
    if (!intent) {
      return res
        .status(500)
        .json({ message: "Stripe not configured or failed to create intent" });
    }

    res.json({ clientSecret: intent.client_secret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
