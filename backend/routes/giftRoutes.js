const express = require("express");
const router = express.Router();
const {
  getGifts,
  sendGift,
  getGiftHistory,
  createGift,
  updateGift,
  deleteGift,
  seedDefaultGifts,
} = require("../controllers/giftController");
const { protect } = require("../middleware/authMiddleware");
const { giftUpload } = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", protect, getGifts);

// User routes
router.post("/send", protect, sendGift);
router.get("/history", protect, getGiftHistory);

// Admin routes (add admin middleware later)
router.post(
  "/admin/create",
  protect,
  giftUpload.fields([
    { name: "animation", maxCount: 1 },
    { name: "webm", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "sound", maxCount: 1 },
  ]),
  createGift,
);
router.put(
  "/admin/:id",
  protect,
  giftUpload.fields([
    { name: "animation", maxCount: 1 },
    { name: "webm", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "sound", maxCount: 1 },
  ]),
  updateGift,
);
router.delete("/admin/:id", protect, deleteGift);
router.post("/admin/seed", protect, seedDefaultGifts);

module.exports = router;
