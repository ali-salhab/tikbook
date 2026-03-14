const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getAllVipLevels,
  getMyVip,
  purchaseVipLevel,
  adminGetAllLevels,
  createVipLevel,
  updateVipLevel,
  deleteVipLevel,
  assignVipToUser,
  seedVipLevels,
} = require("../controllers/vipController");

// Public / user routes
router.get("/levels", getAllVipLevels);
router.get("/my-vip", protect, getMyVip);
router.post("/purchase/:level", protect, purchaseVipLevel);

// Admin routes
router.get("/admin/levels", protect, adminGetAllLevels);
router.post("/admin/levels", protect, createVipLevel);
router.put("/admin/levels/:level", protect, updateVipLevel);
router.delete("/admin/levels/:level", protect, deleteVipLevel);
router.post("/admin/assign", protect, assignVipToUser);
router.post("/admin/seed", protect, seedVipLevels);

module.exports = router;
