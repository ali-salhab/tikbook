const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { calculateLevelFromSpent } = require("../services/userLevelingService");
const {
  isStripeReady,
  createCoinPurchaseIntent,
  retrievePaymentIntent,
  constructWebhookEvent,
} = require("../services/stripeService");

const SUPPORTED_PAYMENT_METHODS = new Set(["visa"]);
const COIN_PRICE_EGP = Number(process.env.COIN_PRICE_EGP || 0.605);
const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || "egp").toLowerCase();

const buildTransactionReference = () =>
  `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const getTopUpPrice = (coinAmount) =>
  Number((Number(coinAmount) * COIN_PRICE_EGP).toFixed(2));

const ensureWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

const buildPaymentInstructions = ({ reference }) =>
  [
    `تم إنشاء طلب دفع بالبطاقة برقم ${reference}.`,
    "ستظهر الآن شاشة Stripe لإتمام العملية.",
  ].join(" ");

const markTopUpFailed = async (transaction, reason) => {
  if (!transaction || transaction.status === "completed") {
    return transaction;
  }

  if (transaction.status !== "failed") {
    transaction.status = "failed";
    transaction.paymentMeta = {
      ...(transaction.paymentMeta || {}),
      failureReason: reason || "payment_failed",
      failedAt: new Date(),
    };
    await transaction.save();
  }

  return transaction;
};

const completeTopUpTransaction = async ({ transaction, paymentIntent, source }) => {
  if (!transaction) {
    return { wallet: null, transaction: null };
  }

  const wallet = await ensureWallet(transaction.user);

  if (transaction.status === "completed") {
    return { wallet, transaction };
  }

  wallet.balance += Number(transaction.amount || 0);
  await wallet.save();

  // Update totalRecharged for leveling
  const user = await User.findById(transaction.user);
  if (user) {
    user.totalRecharged = (user.totalRecharged || 0) + Number(transaction.amount || 0);
    await user.save();
  }

  transaction.status = "completed";
  transaction.platformTransactionId = paymentIntent?.id || transaction.platformTransactionId;
  transaction.paymentMeta = {
    ...(transaction.paymentMeta || {}),
    stripePaymentIntentId:
      paymentIntent?.id || transaction.paymentMeta?.stripePaymentIntentId || null,
    stripeStatus: paymentIntent?.status || "succeeded",
    confirmedAt: new Date(),
    completedBy: source || "unknown",
  };
  await transaction.save();

  return { wallet, transaction };
};

const findTopUpTransactionByIntent = async (paymentIntent) => {
  const reference = paymentIntent?.metadata?.reference;
  const userId = paymentIntent?.metadata?.userId;
  const intentId = paymentIntent?.id;

  const or = [];
  if (intentId) {
    or.push({ "paymentMeta.stripePaymentIntentId": intentId });
    or.push({ platformTransactionId: intentId });
  }
  if (reference) {
    or.push({ transactionId: reference });
  }

  if (!or.length) {
    return null;
  }

  const query = {
    type: "purchase",
    $or: or,
  };

  if (userId) {
    query.user = userId;
  }

  return Transaction.findOne(query).sort({ createdAt: -1 });
};

// @desc    Get user wallet balance
// @route   GET /api/wallet
// @access  Private
const getBalance = async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user._id);
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process a gift transaction (coins -> coins earnings)
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
    const senderWallet = await Wallet.findOne({ user: req.user._id }).session(
      session,
    );
    if (!senderWallet || senderWallet.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Insufficient coins" });
    }

    senderWallet.balance -= amount;
    await senderWallet.save({ session });

    // Update sender level based on spending
    const sender = await User.findById(req.user._id).session(session);
    sender.totalSpent = (sender.totalSpent || 0) + amount;
    sender.level = calculateLevelFromSpent(sender.totalSpent);
    await sender.save({ session });

    let receiverWallet = await Wallet.findOne({ user: receiverId }).session(
      session,
    );
    if (!receiverWallet) {
      receiverWallet = await Wallet.create([{ user: receiverId }], { session });
      receiverWallet = receiverWallet[0];
    }
    receiverWallet.earnings += amount;
    await receiverWallet.save({ session });

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

// @desc    Manual top-up endpoint is disabled to avoid fake balances
// @route   POST /api/wallet/topup
// @access  Private
const topUpWallet = async (req, res) => {
  return res.status(410).json({
    message: "Manual top-up is disabled. Use Stripe payment flow instead.",
  });
};

// @desc    Create a Stripe top-up request
// @route   POST /api/wallet/topup/request
// @access  Private
const createTopUpRequest = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const normalizedAmount = Number(amount);

    if (!normalizedAmount || normalizedAmount <= 0) {
      return res.status(400).json({ message: "عدد العملات غير صحيح" });
    }

    if (paymentMethod && !SUPPORTED_PAYMENT_METHODS.has(paymentMethod)) {
      return res.status(400).json({ message: "طريقة الدفع غير مدعومة" });
    }

    const reference = buildTransactionReference();
    const price = getTopUpPrice(normalizedAmount);
    const amountCents = Math.round(price * 100);

    if (!isStripeReady()) {
      return res.status(503).json({
        message: "Stripe غير مهيأ حالياً: STRIPE_SECRET_KEY غير مضبوط على السيرفر",
      });
    }

    let intent;
    try {
      intent = await createCoinPurchaseIntent({
        amountCents,
        currency: STRIPE_CURRENCY,
        metadata: {
          userId: req.user._id.toString(),
          coinAmount: String(normalizedAmount),
          reference,
          currency: STRIPE_CURRENCY.toUpperCase(),
        },
      });
    } catch (stripeError) {
      console.error("Stripe payment intent creation failed", {
        code: stripeError?.code || null,
        type: stripeError?.type || null,
        message: stripeError?.message || "unknown_error",
        decline_code: stripeError?.decline_code || null,
      });

      return res.status(503).json({
        message:
          stripeError?.message ||
          "Stripe غير مهيأ حالياً أو فشل إنشاء عملية الدفع",
        code: stripeError?.code || null,
      });
    }

    if (!intent?.client_secret || !intent?.id) {
      return res.status(503).json({
        message: "Stripe فشل في إنشاء PaymentIntent. راجع STRIPE_SECRET_KEY وإعدادات الحساب.",
      });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type: "purchase",
      amount: normalizedAmount,
      transactionId: reference,
      platformTransactionId: reference,
      gateway: "visa",
      paymentMethod: "visa",
      currency: "EGP",
      status: "pending",
      description: `طلب شحن ${normalizedAmount} عملة عبر Stripe`,
      paymentMeta: {
        requestedPrice: price,
        stripeClientSecret: intent.client_secret,
        stripePaymentIntentId: intent.id,
      },
    });

    res.status(201).json({
      success: true,
      status: transaction.status,
      reference,
      gateway: "visa",
      coinAmount: normalizedAmount,
      price,
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      instructions: buildPaymentInstructions({ reference }),
      transaction,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confirm completed Stripe top-up and credit wallet
// @route   POST /api/wallet/topup/confirm
// @access  Private
const confirmTopUpRequest = async (req, res) => {
  try {
    const { reference, paymentIntentId } = req.body;

    if (!reference) {
      return res.status(400).json({ message: "رقم العملية مطلوب" });
    }

    const transaction = await Transaction.findOne({
      user: req.user._id,
      transactionId: reference,
      type: "purchase",
    });

    if (!transaction) {
      return res.status(404).json({ message: "لم يتم العثور على طلب الدفع" });
    }

    if (transaction.status === "completed") {
      const wallet = await ensureWallet(req.user._id);
      return res.json({ success: true, wallet, transaction });
    }

    const intentId =
      paymentIntentId || transaction.paymentMeta?.stripePaymentIntentId || null;
    const paymentIntent = await retrievePaymentIntent(intentId);

    if (!paymentIntent) {
      return res.status(400).json({
        message: "تعذر التحقق من عملية الدفع لدى Stripe",
      });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: "عملية الدفع لم تكتمل بعد",
        status: paymentIntent.status,
      });
    }

    if (
      paymentIntent.metadata?.userId &&
      paymentIntent.metadata.userId !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "عملية الدفع لا تخص هذا المستخدم" });
    }

    if (
      paymentIntent.metadata?.reference &&
      paymentIntent.metadata.reference !== reference
    ) {
      return res.status(400).json({ message: "مرجع عملية الدفع غير مطابق" });
    }

    const result = await completeTopUpTransaction({
      transaction,
      paymentIntent,
      source: "confirm_api",
    });

    res.json({ success: true, wallet: result.wallet, transaction: result.transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark canceled or failed Stripe top-up request
// @route   POST /api/wallet/topup/fail
// @access  Private
const failTopUpRequest = async (req, res) => {
  try {
    const { reference, reason } = req.body;

    if (!reference) {
      return res.status(400).json({ message: "رقم العملية مطلوب" });
    }

    const transaction = await Transaction.findOne({
      user: req.user._id,
      transactionId: reference,
      type: "purchase",
    });

    if (!transaction) {
      return res.status(404).json({ message: "لم يتم العثور على طلب الدفع" });
    }

    await markTopUpFailed(transaction, reason || "canceled");

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Stripe webhook receiver
// @route   POST /api/wallet/stripe/webhook
// @access  Public (signed by Stripe)
const handleStripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send("Missing stripe-signature header");
  }

  if (!req.rawBody) {
    return res.status(400).send("Missing raw body for webhook verification");
  }

  let event;
  try {
    event = constructWebhookEvent({ rawBody: req.rawBody, signature });
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const transaction = await findTopUpTransactionByIntent(paymentIntent);

        if (!transaction) {
          console.warn("Stripe webhook: transaction not found for", paymentIntent?.id);
          break;
        }

        await completeTopUpTransaction({
          transaction,
          paymentIntent,
          source: "stripe_webhook",
        });
        break;
      }

      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;
        const transaction = await findTopUpTransactionByIntent(paymentIntent);

        if (transaction) {
          await markTopUpFailed(transaction, event.type);
        }
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return res.status(500).json({ received: false, message: error.message });
  }
};

// @desc    Get top-up transaction status
// @route   GET /api/wallet/topup/status/:reference
// @access  Private
const getTopUpStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ message: "رقم العملية مطلوب" });
    }

    const transaction = await Transaction.findOne({
      user: req.user._id,
      transactionId: reference,
      type: "purchase",
    });

    if (!transaction) {
      return res.status(404).json({ message: "لم يتم العثور على طلب الدفع" });
    }

    const wallet =
      transaction.status === "completed" ? await ensureWallet(req.user._id) : null;

    res.json({
      success: true,
      reference,
      status: transaction.status,
      gateway: transaction.gateway,
      balance: wallet?.balance ?? null,
      failureReason: transaction.paymentMeta?.failureReason || null,
      stripeStatus: transaction.paymentMeta?.stripeStatus || null,
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

// @desc    Create Stripe PaymentIntent for coins
// @route   POST /api/wallet/stripe/intent
// @access  Private
const createStripeIntent = async (req, res) => {
  try {
    const { coinAmount } = req.body;
    const centsPerCoin = Number(process.env.CENTS_PER_COIN || 100);
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

// Coin packages available for purchase (admin can update this list here)
const COIN_PACKAGES = [
  { id: 1, coins: 30,   price: 18.15 },
  { id: 2, coins: 100,  price: 60.45 },
  { id: 3, coins: 150,  price: 90.65 },
  { id: 4, coins: 300,  price: 185.0 },
  { id: 5, coins: 500,  price: 305.0 },
  { id: 6, coins: 1000, price: 605.0 },
  { id: 7, coins: 2000, price: 1209.0 },
];

const getPackages = (req, res) => {
  res.json({ packages: COIN_PACKAGES });
};

module.exports = {
  getBalance,
  sendGift,
  topUpWallet,
  createStripeIntent,
  createTopUpRequest,
  confirmTopUpRequest,
  failTopUpRequest,
  handleStripeWebhook,
  getTopUpStatus,
  requestWithdrawal,
  getPackages,
};
