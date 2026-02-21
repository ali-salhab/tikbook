const { Gift, GiftTransaction } = require("../models/Gift");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { LiveRoom } = require("../models/LiveRoom");
const { uploadToCloudinary } = require("../services/cloudinaryService");
const fs = require("fs");

// Get all active gifts
exports.getGifts = async (req, res) => {
  try {
    const gifts = await Gift.find({ isActive: true }).sort({
      sortOrder: 1,
      price: 1,
    });

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
    const senderId = req.user._id;
    const { giftId, receiverId, context, contextId, quantity = 1 } = req.body;

    // Validate inputs
    if (!giftId || !receiverId || !context) {
      return res.status(400).json({
        success: false,
        message: "Gift ID, receiver ID, and context are required",
      });
    }

    // Check if sender and receiver are different
    if (senderId.toString() === receiverId.toString()) {
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
    let senderWallet = await Wallet.findOne({ user: senderId });

    // Create wallet if it doesn't exist (e.g. new user)
    if (!senderWallet) {
      senderWallet = await Wallet.create({ user: senderId, balance: 0 });
    }

    if (senderWallet.balance < totalCoins) {
      return res.status(400).json({
        success: false,
        message: "Insufficient coins",
        required: totalCoins,
        balance: senderWallet.balance,
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
    const userId = req.user._id;
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
    const { name, price, animationType: rawAnimationType } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Gift name is required",
      });
    }

    let animationUrl = "";
    let thumbnailUrl = "";
    let soundUrl = "";

    // Handle uploaded files (supports new multi-file upload)
    if (req.files) {
      if (req.files.animation && req.files.animation[0]) {
        const result = await uploadToCloudinary(
          req.files.animation[0].path,
          "gifts/animations",
          "raw",
        );
        animationUrl = result;
        // Cleanup
        try {
          fs.unlinkSync(req.files.animation[0].path);
        } catch (e) {}
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        const result = await uploadToCloudinary(
          req.files.thumbnail[0].path,
          "gifts/thumbnails",
          "image",
        );
        thumbnailUrl = result;
        // Cleanup
        try {
          fs.unlinkSync(req.files.thumbnail[0].path);
        } catch (e) {}
      }
      if (req.files.sound && req.files.sound[0]) {
        const result = await uploadToCloudinary(
          req.files.sound[0].path,
          "gifts/sounds",
          "video",
        );
        soundUrl = result;
        try {
          fs.unlinkSync(req.files.sound[0].path);
        } catch (e) {}
      }
    } else if (req.file) {
      // Fallback for single file upload (legacy)
      const result = await uploadToCloudinary(req.file.path, "gifts", "auto");
      animationUrl = result;
      thumbnailUrl = result; // Use same for thumbnail
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    if (!animationUrl) {
      return res.status(400).json({ message: "Animation file is required" });
    }

    const gift = await Gift.create({
      name,
      nameAr: req.body.nameAr || name,
      price: parseInt(price) || 10,
      animationType: rawAnimationType || "lottie",
      animationUrl,
      thumbnailUrl: thumbnailUrl || animationUrl,
      soundUrl,
      isActive: true,
      category: req.body.category || "basic",
      duration: parseInt(req.body.duration) || 3,
    });

    res.status(201).json({
      success: true,
      gift,
    });
  } catch (error) {
    console.error("Error creating gift:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create gift",
      error: error,
    });
  }
};

// Admin: Update a gift
exports.updateGift = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    if (req.file) {
      const originalName = req.file.originalname.toLowerCase();
      const isVideo =
        originalName.endsWith(".mp4") ||
        originalName.endsWith(".mov") ||
        originalName.endsWith(".avi") ||
        originalName.endsWith(".mkv") ||
        req.file.mimetype.startsWith("video/");

      if (isVideo) {
        // Upload video to Cloudinary
        updateData.animationUrl = await uploadToCloudinary(
          req.file.path,
          "gifts",
          "video",
        );
        // Generate video thumbnail
        updateData.thumbnailUrl = updateData.animationUrl.replace(
          /\.(mp4|mov|avi|mkv)$/i,
          ".jpg",
        );
        updateData.animationType = "video";
      } else {
        const uploadedUrl = await uploadToCloudinary(
          req.file.path,
          "gifts",
          "auto",
        );
        updateData.animationUrl = uploadedUrl;
        updateData.thumbnailUrl = uploadedUrl;

        // Determine animation type
        if (originalName.endsWith(".json")) {
          updateData.animationType = "lottie";
        } else if (originalName.endsWith(".gif")) {
          updateData.animationType = "gif";
        }
      }

      fs.unlinkSync(req.file.path);
    }

    const gift = await Gift.findByIdAndUpdate(id, updateData, { new: true });

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
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update gift",
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
