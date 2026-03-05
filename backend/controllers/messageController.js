const Message = require("../models/Message");
const mongoose = require("mongoose");

// @desc    Get messages between two users
// @route   GET /api/messages/:userId
// @access  Private
const getMessages = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message (text and/or image)
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  const { receiverId, text } = req.body;

  if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
    return res.status(400).json({ message: "Invalid receiver id" });
  }

  const hasText = text && text.trim();
  const hasImage = !!req.file;

  if (!hasText && !hasImage) {
    return res
      .status(400)
      .json({ message: "Message text or image is required" });
  }

  try {
    let imageUrl = null;
    if (req.file) {
      const { uploadToCloudinary } = require("../services/cloudinaryService");
      const fs = require("fs");
      try {
        imageUrl = await uploadToCloudinary(req.file.path, "messages");
      } finally {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      }
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text: hasText ? text.trim() : "",
      imageUrl,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", req.user._id] }, "$receiver", "$sender"],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", req.user._id] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          "user._id": 1,
          "user.username": 1,
          "user.profileImage": 1,
          "user.isOnline": 1,
          "lastMessage.text": 1,
          "lastMessage.createdAt": 1,
          "lastMessage.sender": 1,
          unreadCount: 1,
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMessages, sendMessage, getConversations };
