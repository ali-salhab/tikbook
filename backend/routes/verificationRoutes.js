const express = require("express");
const router = express.Router();
const {
  submitVerificationRequest,
  getMyVerificationRequests,
  getAllVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
  deleteVerificationRequest,
  getVerificationStats,
} = require("../controllers/verificationController");
const { protect, admin } = require("../middleware/authMiddleware");

// User routes
router.post("/request", protect, submitVerificationRequest);
router.get("/my-requests", protect, getMyVerificationRequests);

// Admin routes
router.get("/admin/requests", protect, admin, getAllVerificationRequests);
router.get("/admin/stats", protect, admin, getVerificationStats);
router.put("/admin/approve/:id", protect, admin, approveVerificationRequest);
router.put("/admin/reject/:id", protect, admin, rejectVerificationRequest);
router.delete("/admin/:id", protect, admin, deleteVerificationRequest);

module.exports = router;
