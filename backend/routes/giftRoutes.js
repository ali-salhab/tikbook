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
const { giftUpload } = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", protect, getGifts);

// User routes
router.post("/send", protect, sendGift);
router.get("/history", protect, getGiftHistory);

// Admin routes (add admin middleware later)
router.post("/admin/create", protect, giftUpload.single("image"), createGift);
router.put("/admin/:id", protect, giftUpload.single("image"), updateGift);
router.delete("/admin/:id", protect, deleteGift);

module.exports = router;
