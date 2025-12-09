const express = require("express");
const router = express.Router();
const {
  createVersion,
  getLatestVersion,
  getVersions,
  updateVersion,
  deleteVersion,
} = require("../controllers/appVersionController");
const { protect, admin } = require("../middleware/authMiddleware");

router
  .route("/")
  .post(protect, admin, createVersion)
  .get(protect, admin, getVersions);
router.route("/latest").get(getLatestVersion);
router
  .route("/:id")
  .put(protect, admin, updateVersion)
  .delete(protect, admin, deleteVersion);

module.exports = router;

// explain this file ?
//
