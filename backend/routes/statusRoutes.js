const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/uploadMiddleware");
const {
  createStatus,
  getStatuses,
  deleteStatus,
} = require("../controllers/statusController");

router.post("/", protect, imageUpload.single("image"), createStatus);
router.get("/", protect, getStatuses);
router.delete("/:id", protect, deleteStatus);

module.exports = router;
