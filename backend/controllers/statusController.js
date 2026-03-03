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

// POST /api/status/:id/view — record a view
const viewStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: "الحالة غير موجودة" });

    const alreadyViewed = status.views.some(
      (uid) => uid.toString() === req.user._id.toString(),
    );
    if (!alreadyViewed) {
      status.views.push(req.user._id);
      await status.save();
    }
    res.json({ viewsCount: status.views.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/status/:id/comment — comment and send as chat message
const commentOnStatus = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "النص مطلوب" });

    const status = await Status.findById(req.params.id).populate(
      "user",
      "_id username",
    );
    if (!status) return res.status(404).json({ message: "الحالة غير موجودة" });

    // Add comment to status
    status.comments.push({ user: req.user._id, text: text.trim() });
    await status.save();

    // Send as a chat message to the status owner
    const Message = require("../models/Message");
    const ownerId = status.user._id.toString();
    const commenterId = req.user._id.toString();

    if (ownerId !== commenterId) {
      // Create a direct message referencing the status comment
      const message = await Message.create({
        sender: req.user._id,
        receiver: status.user._id,
        text: `💬 رد على قصتك: ${text.trim()}`,
        statusRef: status._id,
      });

      // Emit via socket if available (best-effort)
      const io = req.app.get("io");
      if (io) {
        io.to(ownerId).emit("receiveMessage", {
          ...message.toObject(),
          sender: {
            _id: commenterId,
            username: req.user.username,
            profileImage: req.user.profileImage,
          },
        });
      }
    }

    const newComment = status.comments[status.comments.length - 1];
    res.status(201).json({
      comment: newComment,
      viewsCount: status.views.length,
      commentsCount: status.comments.length,
    });
  } catch (err) {
    console.error("commentOnStatus error:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createStatus,
  getStatuses,
  deleteStatus,
  viewStatus,
  commentOnStatus,
};
