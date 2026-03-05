const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { statusUpload } = require("../middleware/uploadMiddleware");
const {
  createStatus,
  getStatuses,
  deleteStatus,
  viewStatus,
  commentOnStatus,
  reactToStatus,
} = require("../controllers/statusController");

router.post("/", protect, statusUpload.single("image"), createStatus);
router.get("/", protect, getStatuses);
router.delete("/:id", protect, deleteStatus);
router.post("/:id/view", protect, viewStatus);
router.post("/:id/comment", protect, commentOnStatus);
router.post("/:id/react", protect, reactToStatus);

module.exports = router;
