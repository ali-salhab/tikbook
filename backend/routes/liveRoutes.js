const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  generateToken,
  getActiveStreams,
  endStream,
} = require("../controllers/liveController");

const router = express.Router();

router.post("/token", protect, generateToken);
router.get("/active", protect, getActiveStreams);
router.post("/end", protect, endStream);

module.exports = router;
