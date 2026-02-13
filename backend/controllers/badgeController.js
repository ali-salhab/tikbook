const Badge = require("../models/Badge");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

// @desc    Get all available badges
// @route   GET /api/badges
// @access  Public
const getAllBadges = async (req, res) => {
  try {
    const { type } = req.query;

    let query = { isActive: true };
    if (type) {
      query.type = type;
    }

    const badges = await Badge.find(query).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    res.json({
      success: true,
      badges,
    });
  } catch (error) {
    console.error("Get badges error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching badges",
      error: error.message,
    });
  }
};

// @desc    Get user's owned badges
// @route   GET /api/badges/my-badges
// @access  Private
const getMyBadges = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("ownedBadges.badge")
      .populate("ownedBackgrounds.badge")
      .populate("activeBadge")
      .populate("activeBackground");

    res.json({
      success: true,
      ownedBadges: user.ownedBadges,
      ownedBackgrounds: user.ownedBackgrounds,
      activeBadge: user.activeBadge,
      activeBackground: user.activeBackground,
    });
  } catch (error) {
    console.error("Get my badges error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user badges",
      error: error.message,
    });
  }
};

// @desc    Purchase a badge
// @route   POST /api/badges/purchase/:badgeId
// @access  Private
const purchaseBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const userId = req.user._id;

    // Find the badge
    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: "Badge not found",
      });
    }

    if (!badge.isActive) {
      return res.status(400).json({
        success: false,
        message: "Badge is not available for purchase",
      });
    }

    if (badge.isExclusive) {
      return res.status(400).json({
        success: false,
        message: "This badge can only be gifted by administrators",
      });
    }

    // Check if user already owns this badge
    const user = await User.findById(userId);
    const alreadyOwned =
      user.ownedBadges.some((item) => item.badge.toString() === badgeId) ||
      user.ownedBackgrounds.some((item) => item.badge.toString() === badgeId);

    if (alreadyOwned) {
      return res.status(400).json({
        success: false,
        message: "You already own this badge",
      });
    }

    // Check user's wallet balance
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < badge.price) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    // Deduct from wallet
    wallet.balance -= badge.price;
    await wallet.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: userId,
      type: "badge_purchase",
      amount: badge.price,
      description: `Purchased ${badge.name}`,
      status: "completed",
    });

    // Add badge to user's collection
    if (badge.type === "background") {
      user.ownedBackgrounds.push({
        badge: badgeId,
        acquiredAt: new Date(),
      });
    } else {
      user.ownedBadges.push({
        badge: badgeId,
        acquiredAt: new Date(),
      });
    }
    await user.save();

    // Populate and return
    await user.populate("ownedBadges.badge ownedBackgrounds.badge");

    res.json({
      success: true,
      message: "Badge purchased successfully",
      badge,
      remainingBalance: wallet.balance,
      transaction,
    });
  } catch (error) {
    console.error("Purchase badge error:", error);
    res.status(500).json({
      success: false,
      message: "Error purchasing badge",
      error: error.message,
    });
  }
};

// @desc    Gift a badge to a user (Admin only)
// @route   POST /api/badges/gift
// @access  Private/Admin
const giftBadge = async (req, res) => {
  try {
    const { badgeId, userId } = req.body;
    const adminId = req.user._id;

    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized as admin",
      });
    }

    // Find the badge
    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: "Badge not found",
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user already owns this badge
    const alreadyOwned =
      user.ownedBadges.some((item) => item.badge.toString() === badgeId) ||
      user.ownedBackgrounds.some((item) => item.badge.toString() === badgeId);

    if (alreadyOwned) {
      return res.status(400).json({
        success: false,
        message: "User already owns this badge",
      });
    }

    // Add badge to user's collection
    if (badge.type === "background") {
      user.ownedBackgrounds.push({
        badge: badgeId,
        acquiredAt: new Date(),
        giftedBy: adminId,
      });
    } else {
      user.ownedBadges.push({
        badge: badgeId,
        acquiredAt: new Date(),
        giftedBy: adminId,
      });
    }
    await user.save();

    // Populate and return
    await user.populate("ownedBadges.badge ownedBackgrounds.badge");

    // TODO: Send notification to user about the gift

    res.json({
      success: true,
      message: "Badge gifted successfully",
      badge,
      recipient: {
        _id: user._id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Gift badge error:", error);
    res.status(500).json({
      success: false,
      message: "Error gifting badge",
      error: error.message,
    });
  }
};

// @desc    Set active badge/frame
// @route   PUT /api/badges/set-active/:badgeId
// @access  Private
const setActiveBadge = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If badgeId is "none", remove active badge
    if (badgeId === "none") {
      user.activeBadge = null;
      await user.save();
      return res.json({
        success: true,
        message: "Active badge removed",
        activeBadge: null,
      });
    }

    // Check if user owns this badge
    const ownsBadge = user.ownedBadges.some(
      (item) => item.badge.toString() === badgeId,
    );

    if (!ownsBadge) {
      return res.status(403).json({
        success: false,
        message: "You don't own this badge",
      });
    }

    // Set active badge
    user.activeBadge = badgeId;
    await user.save();
    await user.populate("activeBadge");

    res.json({
      success: true,
      message: "Active badge updated",
      activeBadge: user.activeBadge,
    });
  } catch (error) {
    console.error("Set active badge error:", error);
    res.status(500).json({
      success: false,
      message: "Error setting active badge",
      error: error.message,
    });
  }
};

// @desc    Set active background for live room
// @route   PUT /api/badges/set-active-background/:badgeId
// @access  Private
const setActiveBackground = async (req, res) => {
  try {
    const { badgeId } = req.params;
    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If badgeId is "none", remove active background
    if (badgeId === "none") {
      user.activeBackground = null;
      await user.save();
      return res.json({
        success: true,
        message: "Active background removed",
        activeBackground: null,
      });
    }

    // Check if user owns this background
    const ownsBackground = user.ownedBackgrounds.some(
      (item) => item.badge.toString() === badgeId,
    );

    if (!ownsBackground) {
      return res.status(403).json({
        success: false,
        message: "You don't own this background",
      });
    }

    // Set active background
    user.activeBackground = badgeId;
    await user.save();
    await user.populate("activeBackground");

    res.json({
      success: true,
      message: "Active background updated",
      activeBackground: user.activeBackground,
    });
  } catch (error) {
    console.error("Set active background error:", error);
    res.status(500).json({
      success: false,
      message: "Error setting active background",
      error: error.message,
    });
  }
};

// @desc    Create a new badge (Admin only)
// @route   POST /api/badges/create
// @access  Private/Admin
const createBadge = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized as admin",
      });
    }

    const {
      name,
      description,
      imageUrl,
      type,
      rarity,
      price,
      isExclusive,
      properties,
      sortOrder,
    } = req.body;

    const badge = await Badge.create({
      name,
      description,
      imageUrl,
      type: type || "frame",
      rarity: rarity || "common",
      price: price || 0,
      isExclusive: isExclusive || false,
      properties: properties || {},
      sortOrder: sortOrder || 0,
    });

    res.status(201).json({
      success: true,
      message: "Badge created successfully",
      badge,
    });
  } catch (error) {
    console.error("Create badge error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating badge",
      error: error.message,
    });
  }
};

// @desc    Update a badge (Admin only)
// @route   PUT /api/badges/:badgeId
// @access  Private/Admin
const updateBadge = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized as admin",
      });
    }

    const { badgeId } = req.params;
    const badge = await Badge.findByIdAndUpdate(badgeId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: "Badge not found",
      });
    }

    res.json({
      success: true,
      message: "Badge updated successfully",
      badge,
    });
  } catch (error) {
    console.error("Update badge error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating badge",
      error: error.message,
    });
  }
};

// @desc    Delete a badge (Admin only)
// @route   DELETE /api/badges/:badgeId
// @access  Private/Admin
const deleteBadge = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized as admin",
      });
    }

    const { badgeId } = req.params;
    const badge = await Badge.findByIdAndDelete(badgeId);

    if (!badge) {
      return res.status(404).json({
        success: false,
        message: "Badge not found",
      });
    }

    res.json({
      success: true,
      message: "Badge deleted successfully",
    });
  } catch (error) {
    console.error("Delete badge error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting badge",
      error: error.message,
    });
  }
};

module.exports = {
  getAllBadges,
  getMyBadges,
  purchaseBadge,
  giftBadge,
  setActiveBadge,
  setActiveBackground,
  createBadge,
  updateBadge,
  deleteBadge,
};
