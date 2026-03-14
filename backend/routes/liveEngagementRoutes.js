const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { giftUpload } = require("../middleware/uploadMiddleware");
const {
  getVipLevels,
  getVipFrames,
  getGiftCatalog,
  getRecentRoomMessages,
  seedVipLevels,
  createVipFrame,
  updateVipFrame,
  deleteVipFrame,
  createGift,
  updateGift,
  deleteGift,
} = require("../controllers/liveEngagementController");

// Public / viewer routes
router.get("/vip-levels", getVipLevels);
router.get("/vip-frames", getVipFrames);
router.get("/gifts", getGiftCatalog);
router.get("/rooms/:roomId/messages", getRecentRoomMessages);

// Admin routes
router.post("/admin/seed-vip-levels", protect, admin, seedVipLevels);
router.post(
  "/admin/vip-frames",
  protect,
  admin,
  giftUpload.fields([
    { name: "lottie", maxCount: 1 },
    { name: "preview", maxCount: 1 },
  ]),
  createVipFrame,
);
router.put(
  "/admin/vip-frames/:id",
  protect,
  admin,
  giftUpload.fields([
    { name: "lottie", maxCount: 1 },
    { name: "preview", maxCount: 1 },
  ]),
  updateVipFrame,
);
router.delete("/admin/vip-frames/:id", protect, admin, deleteVipFrame);

router.post(
  "/admin/gifts",
  protect,
  admin,
  giftUpload.fields([
    { name: "animation", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "sound", maxCount: 1 },
  ]),
  createGift,
);
router.put(
  "/admin/gifts/:id",
  protect,
  admin,
  giftUpload.fields([
    { name: "animation", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
    { name: "sound", maxCount: 1 },
  ]),
  updateGift,
);
router.delete("/admin/gifts/:id", protect, admin, deleteGift);

module.exports = router;
