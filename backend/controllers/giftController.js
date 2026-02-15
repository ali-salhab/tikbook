const { Gift, GiftTransaction } = require("../models/Gift");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { LiveRoom } = require("../models/LiveRoom");

// Get all active gifts
exports.getGifts = async (req, res) => {
  try {
    const gifts = await Gift.find({ isActive: true }).sort({ sortOrder: 1, price: 1 });

    res.json({
      success: true,
      gifts,
    });
  } catch (error) {
    console.error("Error fetching gifts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gifts",
    });
  }
};

// Send a gift
exports.sendGift = async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { giftId, receiverId, context, contextId, quantity = 1 } = req.body;

    // Validate inputs
    if (!giftId || !receiverId || !context) {
      return res.status(400).json({
        success: false,
        message: "Gift ID, receiver ID, and context are required",
      });
    }

    // Check if sender and receiver are different
    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send gifts to yourself",
      });
    }

    // Get gift details
    const gift = await Gift.findById(giftId);
    if (!gift || !gift.isActive) {
      return res.status(404).json({
        success: false,
        message: "Gift not found or inactive",
      });
    }

    // Calculate total cost
    const totalCoins = gift.price * quantity;

    // Get sender's wallet
    const senderWallet = await Wallet.findOne({ user: senderId });
    if (!senderWallet || senderWallet.balance < totalCoins) {
      return res.status(400).json({
        success: false,
        message: "Insufficient coins",
        required: totalCoins,
        balance: senderWallet?.balance || 0,
      });
    }

    // Get receiver's wallet
    let receiverWallet = await Wallet.findOne({ user: receiverId });
    if (!receiverWallet) {
      receiverWallet = await Wallet.create({
        user: receiverId,
        balance: 0,
      });
    }

    // Calculate receiver's earnings (70% to receiver, 30% platform fee)
    const receiverEarnings = Math.floor(totalCoins * 0.7);

    // Deduct from sender
    senderWallet.balance -= totalCoins;
    await senderWallet.save();

    // Add to receiver
    receiverWallet.balance += receiverEarnings;
    await receiverWallet.save();

    // Create transactions
    await Transaction.create({
      user: senderId,
      type: "gift_sent",
      amount: -totalCoins,
      description: `Sent ${gift.name} x${quantity} to ${receiverId}`,
      balanceAfter: senderWallet.balance,
    });

    await Transaction.create({
      user: receiverId,
      type: "gift_received",
      amount: receiverEarnings,
      description: `Received ${gift.name} x${quantity} from ${senderId}`,
      balanceAfter: receiverWallet.balance,
    });

    // Create gift transaction record
    const giftTransaction = await GiftTransaction.create({
      sender: senderId,
      receiver: receiverId,
      gift: giftId,
      context,
      contextId,
      quantity,
      totalCoins,
    });

    // Populate sender and gift details for response
    await giftTransaction.populate("sender", "username profileImage avatar");
    await giftTransaction.populate("gift");

    res.json({
      success: true,
      message: "Gift sent successfully",
      transaction: giftTransaction,
      senderBalance: senderWallet.balance,
      receiverEarnings,
    });
  } catch (error) {
    console.error("Error sending gift:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send gift",
    });
  }
};

// Get gift history for a user
exports.getGiftHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = "all", page = 1, limit = 20 } = req.query;

    let query = {};
    if (type === "sent") {
      query.sender = userId;
    } else if (type === "received") {
      query.receiver = userId;
    } else {
      query.$or = [{ sender: userId }, { receiver: userId }];
    }

    const transactions = await GiftTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("sender", "username profileImage avatar")
      .populate("receiver", "username profileImage avatar")
      .populate("gift");

    const total = await GiftTransaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching gift history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch gift history",
    });
  }
};

// Admin: Create a gift
exports.createGift = async (req, res) => {
  try {
    const gift = await Gift.create(req.body);
    res.status(201).json({
      success: true,
      gift,
    });
  } catch (error) {
    console.error("Error creating gift:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create gift",
    });
  }
};

// Admin: Update a gift
exports.updateGift = async (req, res) => {
  try {
    const { id } = req.params;
    const gift = await Gift.findByIdAndUpdate(id, req.body, { new: true });

    if (!gift) {
      return res.status(404).json({
        success: false,
        message: "Gift not found",
      });
    }

    res.json({
      success: true,
      gift,
    });
  } catch (error) {
    console.error("Error updating gift:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update gift",
    });
  }
};

// Admin: Delete a gift
exports.deleteGift = async (req, res) => {
  try {
    const { id } = req.params;
    const gift = await Gift.findByIdAndDelete(id);

    if (!gift) {
      return res.status(404).json({
        success: false,
        message: "Gift not found",
      });
    }

    res.json({
      success: true,
      message: "Gift deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting gift:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete gift",
    });
  }
};
