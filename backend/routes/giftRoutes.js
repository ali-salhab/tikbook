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
const { authenticateToken } = require("../middleware/authMiddleware");

// Public routes
router.get("/", authenticateToken, getGifts);

// User routes
router.post("/send", authenticateToken, sendGift);
router.get("/history", authenticateToken, getGiftHistory);

// Admin routes (add admin middleware later)
router.post("/admin/create", authenticateToken, createGift);
router.put("/admin/:id", authenticateToken, updateGift);
router.delete("/admin/:id", authenticateToken, deleteGift);

module.exports = router;
