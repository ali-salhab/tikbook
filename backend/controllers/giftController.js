const mongoose = require("mongoose");
const { Gift, GiftTransaction } = require("../models/Gift");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { LiveRoom } = require("../models/LiveRoom");
const { uploadToCloudinary } = require("../services/cloudinaryService");
const fs = require("fs");
const { calculateLevelFromSpent } = require("../services/userLevelingService");

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
    // Allow self-gifting for testing purposes
    /* if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot send gifts to yourself",
      });
    } */

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID format",
      });
    }

    // Validate receiver exists
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
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
      // Update sender level based on spending
      const sender = await User.findById(senderId);
      sender.totalSpent = (sender.totalSpent || 0) + totalCoins;
      sender.level = calculateLevelFromSpent(sender.totalSpent);
      await sender.save();
    // Add to receiver's earnings (since it's a gift)
    receiverWallet.earnings = (receiverWallet.earnings || 0) + receiverEarnings;
    // Also update balance if that's the desired behavior, but typically gifts go to earnings
    // For now keeping balance update as well to match previous logic, or just earnings?
    // Let's stick to balance to be safe with existing frontend expectations,
    // but typically this should be earnings.
    // The previous code did receiverWallet.balance += receiverEarnings.
    // I will keep updating balance to avoid breaking changes,
    // but ensure earnings is also tracked if the schema supports it.
    receiverWallet.balance += receiverEarnings;
    await receiverWallet.save();

    // Create transactions for sender
    await Transaction.create({
      user: senderId,
      type: "gift_sent",
      amount: -totalCoins,
      relatedUser: receiverId,
      description: `Sent ${gift.name} x${quantity} to user ${receiverId}`,
    });

    // Create transaction for receiver
    await Transaction.create({
      user: receiverId,
      type: "gift_received",
      amount: receiverEarnings,
      relatedUser: senderId,
      description: `Received ${gift.name} x${quantity} from user ${senderId}`,
    });

    // Create gift transaction record
    const giftTransaction = await GiftTransaction.create({
      sender: senderId,
      receiver: receiverId,
      gift: giftId,
      context: context === "live_room" ? "live" : context, // Map live_room to live
      contextId: contextId || null,
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
// Helper: extract effect config from req.body
const pickEffectConfig = (body) => {
  // effectType can arrive as array (JSON edit) or comma-separated string (FormData create)
  let effectType = body.effectType;
  if (Array.isArray(effectType)) {
    // already an array - filter empties
    effectType = effectType.filter(Boolean);
  } else if (typeof effectType === "string" && effectType.length > 0) {
    effectType = effectType.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    effectType = ["sparkles"];
  }
  if (effectType.length === 0) effectType = ["sparkles"];
  return {
  effectType,
  effectCount: parseInt(body.effectCount) || 8,
  effectSize: body.effectSize || "medium",
  effectSpeed: body.effectSpeed || "medium",
  effectColor: body.effectColor || "",
  effectCustomChar: body.effectCustomChar || "\u2728",
  glowColor: body.glowColor || "#FFD700",
  glowOpacity: parseFloat(body.glowOpacity) || 0.25,
  danceStyle: body.danceStyle || "wiggle",
  entryEffect: body.entryEffect || "pop",
  };
};

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
    let pngUrl = "";

    // Handle uploaded files (supports new multi-file upload)
    let webmUrl = "";

    if (req.files) {
      if (req.files.animation && req.files.animation[0]) {
        const file = req.files.animation[0];
        const mime = file.mimetype || "";
        const ext = file.originalname.toLowerCase();
        // Choose Cloudinary resource_type correctly
        const isVideo =
          mime.startsWith("video/") ||
          ext.endsWith(".mp4") ||
          ext.endsWith(".webm") ||
          ext.endsWith(".mov");
        const isImage =
          mime.startsWith("image/") ||
          ext.endsWith(".gif") ||
          ext.endsWith(".webp");
        const resourceType = isVideo ? "video" : isImage ? "image" : "raw"; // raw = Lottie JSON
        const result = await uploadToCloudinary(
          file.path,
          "gifts/animations",
          resourceType,
        );
        animationUrl = result;
        // Cleanup
        try {
          fs.unlinkSync(file.path);
        } catch (e) {}
      }
      // WebM with alpha channel (transparent background)
      if (req.files.webm && req.files.webm[0]) {
        const result = await uploadToCloudinary(
          req.files.webm[0].path,
          "gifts/webm",
          "video",
        );
        webmUrl = result;
        try {
          fs.unlinkSync(req.files.webm[0].path);
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
      // Transparent PNG file
      if (req.files.png && req.files.png[0]) {
        const result = await uploadToCloudinary(
          req.files.png[0].path,
          "gifts/png",
          "image",
        );
        pngUrl = result;
        try { fs.unlinkSync(req.files.png[0].path); } catch (e) {}
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

    // For PNG-type gifts: animationUrl can be the pngUrl itself
    if (pngUrl && !animationUrl) {
      animationUrl = pngUrl;
    }

    if (!animationUrl && !pngUrl) {
      return res.status(400).json({ message: "Animation file or PNG file is required" });
    }

    // Determine animationType: if WebM uploaded, mark as webm_alpha
    let resolvedAnimationType = rawAnimationType || "lottie";
    if (pngUrl && rawAnimationType === "png") {
      resolvedAnimationType = "png";
    } else if (webmUrl && !animationUrl && !pngUrl) {
      animationUrl = webmUrl;
      resolvedAnimationType = "webm_alpha";
    } else if (webmUrl) {
      resolvedAnimationType = rawAnimationType || "webm_alpha";
    }

    const gift = await Gift.create({
      name,
      nameAr: req.body.nameAr || name,
      price: parseInt(price) || 10,
      animationType: resolvedAnimationType,
      animationUrl,
      webmUrl,
      pngUrl,
      thumbnailUrl: thumbnailUrl || pngUrl || animationUrl,
      soundUrl,
      isActive: true,
      rarity: req.body.rarity || "common",
      category: req.body.category || "basic",
      duration: parseInt(req.body.duration) || 3,
      fullScreen:
        req.body.fullScreen === "true" || req.body.fullScreen === true,
      comboEnabled: req.body.comboEnabled !== "false",
      sortOrder: parseInt(req.body.sortOrder) || 0,
      ...pickEffectConfig(req.body),
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

    // Handle multi-file updates
    if (req.files) {
      if (req.files.animation && req.files.animation[0]) {
        const file = req.files.animation[0];
        const mime = file.mimetype || "";
        const ext = file.originalname.toLowerCase();
        const isVideo = mime.startsWith("video/") || ext.endsWith(".mp4") || ext.endsWith(".webm") || ext.endsWith(".mov");
        const isImage = mime.startsWith("image/") || ext.endsWith(".gif") || ext.endsWith(".webp");
        const resourceType = isVideo ? "video" : isImage ? "image" : "raw";
        updateData.animationUrl = await uploadToCloudinary(file.path, "gifts/animations", resourceType);
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
      if (req.files.webm && req.files.webm[0]) {
        updateData.webmUrl = await uploadToCloudinary(req.files.webm[0].path, "gifts/webm", "video");
        updateData.animationType = "webm_alpha";
        try { fs.unlinkSync(req.files.webm[0].path); } catch (e) {}
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        updateData.thumbnailUrl = await uploadToCloudinary(req.files.thumbnail[0].path, "gifts/thumbnails", "image");
        try { fs.unlinkSync(req.files.thumbnail[0].path); } catch (e) {}
      }
      if (req.files.sound && req.files.sound[0]) {
        updateData.soundUrl = await uploadToCloudinary(req.files.sound[0].path, "gifts/sounds", "video");
        try { fs.unlinkSync(req.files.sound[0].path); } catch (e) {}
      }
      if (req.files.png && req.files.png[0]) {
        updateData.pngUrl = await uploadToCloudinary(req.files.png[0].path, "gifts/png", "image");
        try { fs.unlinkSync(req.files.png[0].path); } catch (e) {}
      }
    }

    // Merge effect config fields if provided
    Object.assign(updateData, pickEffectConfig({ ...updateData }));

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

// Admin: POST /api/gifts/admin/seed
exports.seedDefaultGifts = async (req, res) => {
  try {
    const SEED_GIFTS = [
      {
        name: "Rose", nameAr: "وردة", price: 10, rarity: "common", category: "basic",
        animationType: "gif", duration: 3, comboEnabled: true, sortOrder: 1,
        animationUrl: "https://placehold.co/200/FF6B9D/white?text=Rose",
        thumbnailUrl: "https://placehold.co/200/FF6B9D/white?text=Rose",
      },
      {
        name: "Heart", nameAr: "قلب", price: 25, rarity: "common", category: "basic",
        animationType: "gif", duration: 3, comboEnabled: true, sortOrder: 2,
        animationUrl: "https://placehold.co/200/EF4444/white?text=Heart",
        thumbnailUrl: "https://placehold.co/200/EF4444/white?text=Heart",
      },
      {
        name: "Star", nameAr: "نجمة", price: 50, rarity: "rare", category: "basic",
        animationType: "gif", duration: 3, comboEnabled: true, sortOrder: 3,
        animationUrl: "https://placehold.co/200/EAB308/white?text=Star",
        thumbnailUrl: "https://placehold.co/200/EAB308/white?text=Star",
      },
      {
        name: "Crown", nameAr: "تاج", price: 100, rarity: "epic", category: "premium",
        animationType: "gif", duration: 4, comboEnabled: true, sortOrder: 4,
        animationUrl: "https://placehold.co/200/8B5CF6/white?text=Crown",
        thumbnailUrl: "https://placehold.co/200/8B5CF6/white?text=Crown",
      },
      {
        name: "Fire", nameAr: "نار", price: 200, rarity: "legendary", category: "premium",
        animationType: "gif", duration: 4, comboEnabled: false, sortOrder: 5,
        animationUrl: "https://placehold.co/200/F97316/white?text=Fire",
        thumbnailUrl: "https://placehold.co/200/F97316/white?text=Fire",
      },
      {
        name: "Diamond", nameAr: "ماس", price: 500, rarity: "mythic", category: "vip",
        animationType: "gif", duration: 5, comboEnabled: false, fullScreen: true, sortOrder: 6,
        animationUrl: "https://placehold.co/200/00BCD4/white?text=Diamond",
        thumbnailUrl: "https://placehold.co/200/00BCD4/white?text=Diamond",
      },
    ];

    let added = 0;
    const results = [];
    for (const g of SEED_GIFTS) {
      const exists = await Gift.findOne({ name: g.name });
      if (!exists) {
        const created = await Gift.create({ ...g, isActive: true });
        results.push(created);
        added++;
      } else {
        results.push(exists);
      }
    }

    res.json({
      success: true,
      message: `تمت العملية: ${added} هدايا جديدة، ${SEED_GIFTS.length - added} موجودة مسبقاً`,
      count: added,
      gifts: results,
    });
  } catch (error) {
    console.error("Error seeding gifts:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to seed gifts",
    });
  }
};

