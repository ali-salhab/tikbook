const express = require("express");
const router = express.Router();
const {
  getGifts,
  sendGift,
  getGiftHistory,
  createGift,
  updateGift,
  deleteGift,
} = require("../controllers/giftController");
const { protect } = require("../middleware/authMiddleware");

// Public routes
router.get("/", protect, getGifts);

// User routes
router.post("/send", protect, sendGift);
router.get("/history", protect, getGiftHistory);

// Admin routes (add admin middleware later)
router.post("/admin/create", protect, createGift);
router.put("/admin/:id", protect, updateGift);
router.delete("/admin/:id", protect, deleteGift);

module.exports = router;
