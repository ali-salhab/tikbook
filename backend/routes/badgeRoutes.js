const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getAllBadges,
  getMyBadges,
  purchaseBadge,
  giftBadge,
  setActiveBadge,
  setActiveBackground,
  createBadge,
  updateBadge,
  deleteBadge,
} = require("../controllers/badgeController");

// Public routes
router.get("/", getAllBadges);

// Protected routes
router.get("/my-badges", protect, getMyBadges);
router.post("/purchase/:badgeId", protect, purchaseBadge);
router.put("/set-active/:badgeId", protect, setActiveBadge);
router.put("/set-active-background/:badgeId", protect, setActiveBackground);

// Admin routes
router.post("/gift", protect, giftBadge);
router.post("/create", protect, createBadge);
router.put("/:badgeId", protect, updateBadge);
router.delete("/:badgeId", protect, deleteBadge);

module.exports = router;
