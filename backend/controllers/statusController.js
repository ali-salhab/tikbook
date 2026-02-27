const Status = require("../models/Status");
const { uploadToCloudinary } = require("../services/cloudinaryService");
const fs = require("fs");

// POST /api/status — create a new status
const createStatus = async (req, res) => {
  try {
    const { text, bgColor } = req.body;
    let imageUrl = null;

    if (!text && !req.file) {
      return res.status(400).json({ message: "يرجى إضافة نص أو صورة للحالة" });
    }

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.path, "statuses", "image");
      // Remove temp file
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }

    const status = await Status.create({
      user: req.user._id,
      text: text || "",
      bgColor: bgColor || "#FE2C55",
      image: imageUrl,
    });

    await status.populate("user", "username profileImage");

    res.status(201).json(status);
  } catch (err) {
    console.error("createStatus error:", err);
    res.status(500).json({ message: err.message || "خطأ في الخادم" });
  }
};

// GET /api/status — get statuses of users the current user follows (+ own)
const getStatuses = async (req, res) => {
  try {
    const User = require("../models/User");
    const me = await User.findById(req.user._id).select("following");
    const ids = [req.user._id, ...(me?.following || [])];

    const statuses = await Status.find({
      user: { $in: ids },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate("user", "username profileImage");

    res.json(statuses);
  } catch (err) {
    console.error("getStatuses error:", err);
    res.status(500).json({ message: err.message || "خطأ في الخادم" });
  }
};

// DELETE /api/status/:id
const deleteStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: "الحالة غير موجودة" });
    if (status.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "غير مصرح" });

    await status.deleteOne();
    res.json({ message: "تم حذف الحالة" });
  } catch (err) {
    res.status(500).json({ message: err.message || "خطأ في الخادم" });
  }
};

module.exports = { createStatus, getStatuses, deleteStatus };
