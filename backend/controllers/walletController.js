const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { createCoinPurchaseIntent } = require("../services/stripeService");

const SUPPORTED_PAYMENT_METHODS = new Set(["visa", "vodafone_cash"]);
const COIN_PRICE_EGP = Number(process.env.COIN_PRICE_EGP || 0.605);

const buildTransactionReference = () =>
  `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const getTopUpPrice = (coinAmount) =>
  Number((Number(coinAmount) * COIN_PRICE_EGP).toFixed(2));

const buildPaymentInstructions = ({ paymentMethod, reference, phoneNumber }) => {
  if (paymentMethod === "vodafone_cash") {
    const merchantPhone = process.env.VODAFONE_CASH_NUMBER || "رقم التاجر غير مضاف بعد";
    return [
      `تم إنشاء طلب فودافون كاش برقم ${reference}.`,
      `رقم المحفظة: ${phoneNumber || "غير محدد"}.`,
      `حوّل المبلغ إلى: ${merchantPhone}.`,
      "سيتم إضافة الرصيد بعد تأكيد العملية من الإدارة.",
    ].join(" ");
  }

  return [
    `تم إنشاء طلب دفع بالبطاقة برقم ${reference}.`,
    "سيتم تأكيد العملية بعد اكتمال ربط بوابة Visa أو مراجعة الإدارة للطلب.",
  ].join(" ");
};

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
      session,
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
      session,
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
      { session },
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
      { session },
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
  const { amount, transactionId, paymentMethod = "manual", paymentMeta } =
    req.body;

  try {
    let wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) wallet = await Wallet.create({ user: req.user._id });

    const normalizedAmount = Number(amount);
    wallet.balance += normalizedAmount;
    await wallet.save();

    const gateway =
      paymentMethod === "visa"
        ? "visa"
        : paymentMethod === "vodafone_cash"
          ? "vodafone_cash"
          : "manual";
    const reference = transactionId || buildTransactionReference();

    await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: normalizedAmount,
      platformTransactionId: reference,
      transactionId: reference,
      gateway,
      paymentMethod,
      paymentMeta: paymentMeta || null,
      description: "Coin Top Up",
    });

    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a top-up request for Visa or Vodafone Cash
// @route   POST /api/wallet/topup/request
// @access  Private
const createTopUpRequest = async (req, res) => {
  try {
    const { amount, paymentMethod, phoneNumber } = req.body;
    const normalizedAmount = Number(amount);

    if (!SUPPORTED_PAYMENT_METHODS.has(paymentMethod)) {
      return res.status(400).json({ message: "طريقة الدفع غير مدعومة" });
    }

    if (!normalizedAmount || normalizedAmount <= 0) {
      return res.status(400).json({ message: "عدد العملات غير صحيح" });
    }

    if (paymentMethod === "vodafone_cash" && !String(phoneNumber || "").trim()) {
      return res
        .status(400)
        .json({ message: "رقم فودافون كاش مطلوب لإتمام الطلب" });
    }

    const reference = buildTransactionReference();
    const price = getTopUpPrice(normalizedAmount);
    let stripeClientSecret = null;

    if (paymentMethod === "visa") {
      const amountCents = Math.round(price * 100);
      const intent = await createCoinPurchaseIntent({
        amountCents,
        metadata: {
          userId: req.user._id.toString(),
          coinAmount: String(normalizedAmount),
          reference,
          currency: "EGP",
        },
      }).catch(() => null);

      stripeClientSecret = intent?.client_secret || null;
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: normalizedAmount,
      transactionId: reference,
      platformTransactionId: reference,
      gateway: paymentMethod,
      paymentMethod,
      currency: "EGP",
      status: "pending",
      description:
        paymentMethod === "visa"
          ? `طلب شحن ${normalizedAmount} عملة عبر Visa`
          : `طلب شحن ${normalizedAmount} عملة عبر Vodafone Cash`,
      paymentMeta: {
        requestedPrice: price,
        phoneNumber: phoneNumber?.trim() || null,
        stripeClientSecret,
      },
    });

    res.status(201).json({
      success: true,
      status: transaction.status,
      reference,
      gateway: paymentMethod,
      coinAmount: normalizedAmount,
      price,
      clientSecret: stripeClientSecret,
      instructions: buildPaymentInstructions({
        paymentMethod,
        reference,
        phoneNumber,
      }),
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a withdrawal request
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = async (req, res) => {
  try {
    const { fullName, phoneNumber, amount } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: "الاسم الكامل مطلوب" });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ message: "رقم الهاتف مطلوب" });
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: "المبلغ غير صحيح" });
    }

    const WithdrawalRequest = require("../models/WithdrawalRequest");
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(400).json({ message: "لا يوجد محفظة" });
    }

    if (wallet.earnings < Number(amount)) {
      return res.status(400).json({ message: "رصيدك غير كافٍ للسحب" });
    }

    // Check no pending request
    const existing = await WithdrawalRequest.findOne({
      user: req.user._id,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({
        message: "لديك طلب سحب معلق بالفعل، انتظر موافقة الأدمن",
      });
    }

    const request = await WithdrawalRequest.create({
      user: req.user._id,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      amount: Number(amount),
      earningsAtRequest: wallet.earnings,
    });

    res.status(201).json({
      message: "تم إرسال طلب السحب بنجاح، سيتم مراجعته من قبل الأدمن",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getBalance, sendGift, topUpWallet, requestWithdrawal };

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

module.exports.createTopUpRequest = createTopUpRequest;
