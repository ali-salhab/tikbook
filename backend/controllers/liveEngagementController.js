const fs = require("fs");
const mongoose = require("mongoose");
const VipLevel = require("../models/VipLevel");
const VipFrame = require("../models/VipFrame");
const { Gift } = require("../models/Gift");
const LiveChatMessage = require("../models/LiveChatMessage");
const { uploadToCloudinary } = require("../services/cloudinaryService");

const SUPPORTED_VIP_LEVELS = [1, 2, 3, 5, 7, 10];

const DEFAULT_VIP_TIERS = [
  {
    level: 1,
    code: "VIP1",
    name: "VIP1 Bronze",
    nameAr: "VIP1 برونزي",
    price: 99,
    color: "#A56B2A",
    usernameColor: "#A56B2A",
    specialJoinText: "Bronze Member Joined",
    sortOrder: 1,
  },
  {
    level: 2,
    code: "VIP2",
    name: "VIP2 Silver",
    nameAr: "VIP2 فضي",
    price: 299,
    color: "#A7AFBD",
    usernameColor: "#A7AFBD",
    specialJoinText: "Silver Member Joined",
    sortOrder: 2,
  },
  {
    level: 3,
    code: "VIP3",
    name: "VIP3 Gold",
    nameAr: "VIP3 ذهبي",
    price: 599,
    color: "#D9A930",
    usernameColor: "#D9A930",
    specialJoinText: "Gold Member Joined",
    sortOrder: 3,
  },
  {
    level: 5,
    code: "VIP5",
    name: "VIP5 Royal",
    nameAr: "VIP5 ملكي",
    price: 1299,
    color: "#D64F4F",
    usernameColor: "#D64F4F",
    specialJoinText: "Royal Member Joined",
    sortOrder: 5,
  },
  {
    level: 7,
    code: "VIP7",
    name: "VIP7 Master",
    nameAr: "VIP7 ماستر",
    price: 2499,
    color: "#5A5EF1",
    usernameColor: "#5A5EF1",
    specialJoinText: "Master Member Joined",
    sortOrder: 7,
  },
  {
    level: 10,
    code: "VIP10",
    name: "VIP10 Legend",
    nameAr: "VIP10 أسطوري",
    price: 4999,
    color: "#FF7C1A",
    usernameColor: "#FF7C1A",
    specialJoinText: "Legend Joined",
    sortOrder: 10,
  },
];

const SHARED_VIP_FEATURES = {
  animatedCommentFrame: true,
  coloredUsername: true,
  specialBadge: true,
  specialJoinAnimation: true,
};

const safeUnlink = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_) {}
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return fallback;
};

const detectAnimationType = (fileName = "", mimeType = "", explicitType = "") => {
  if (explicitType) return explicitType;

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "lottie";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".svga")) return "svga";
  if (lower.endsWith(".glb") || lower.endsWith(".gltf")) return "glb";
  if (mimeType.startsWith("video/")) return "video";
  return "lottie";
};

const detectCloudinaryResourceType = (fileName = "", mimeType = "") => {
  const lower = fileName.toLowerCase();

  if (
    mimeType.startsWith("video/") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".mkv")
  ) {
    return "video";
  }

  if (
    mimeType.startsWith("image/") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp")
  ) {
    return "image";
  }

  return "raw";
};

const uploadFieldFile = async (files, fieldName, folder, fallbackResource = "auto") => {
  const file = files?.[fieldName]?.[0];
  if (!file) return "";

  try {
    const resourceType =
      fallbackResource === "auto"
        ? detectCloudinaryResourceType(file.originalname, file.mimetype || "")
        : fallbackResource;

    return await uploadToCloudinary(file.path, folder, resourceType);
  } finally {
    safeUnlink(file.path);
  }
};

const toGiftResponse = (giftDoc) => ({
  id: giftDoc._id,
  _id: giftDoc._id,
  name: giftDoc.name,
  nameAr: giftDoc.nameAr,
  coinPrice: giftDoc.coinPrice || giftDoc.price,
  price: giftDoc.coinPrice || giftDoc.price,
  animation: giftDoc.animationUrl,
  animationUrl: giftDoc.animationUrl,
  lottieUrl:
    giftDoc.lottieUrl ||
    (giftDoc.animationType === "lottie" ? giftDoc.animationUrl : ""),
  webmUrl: giftDoc.webmUrl || "",
  previewImage: giftDoc.previewImage || giftDoc.thumbnailUrl,
  thumbnailUrl: giftDoc.thumbnailUrl || giftDoc.previewImage,
  sound: giftDoc.soundUrl || "",
  soundUrl: giftDoc.soundUrl || "",
  rarity: giftDoc.rarity || "common",
  animationType: giftDoc.animationType,
  category: giftDoc.category,
  duration: giftDoc.duration,
  fullScreen: giftDoc.fullScreen,
  comboEnabled: giftDoc.comboEnabled,
  sortOrder: giftDoc.sortOrder,
  isActive: giftDoc.isActive,
});

const ensureDefaultVipTiers = async () => {
  await Promise.all(
    DEFAULT_VIP_TIERS.map(async (tier) => {
      await VipLevel.updateOne(
        { level: tier.level },
        {
          $setOnInsert: {
            ...tier,
            description: `Engagement tier ${tier.code}`,
            commentBorderWidth: 1.6,
            commentBubbleShape: "classic",
            isActive: true,
          },
          $set: {
            code: tier.code,
            sortOrder: tier.sortOrder,
            color: tier.color,
            usernameColor: tier.usernameColor,
            specialJoinText: tier.specialJoinText,
            features: SHARED_VIP_FEATURES,
          },
        },
        { upsert: true },
      );
    }),
  );
};

// Public: GET /api/live-engagement/vip-levels
exports.getVipLevels = async (_req, res) => {
  try {
    await ensureDefaultVipTiers();

    const levels = await VipLevel.find({ isActive: true }).sort({ level: 1 });
    const levelNums = levels.map((l) => l.level);

    const frames = await VipFrame.find({
      vipLevel: { $in: levelNums },
      isActive: true,
    }).sort({ vipLevel: 1, isDefault: -1, sortOrder: 1 });

    const frameByLevel = new Map();
    for (const frame of frames) {
      if (!frameByLevel.has(frame.vipLevel)) {
        frameByLevel.set(frame.vipLevel, frame);
      }
    }

    const payload = levels.map((levelDoc) => {
      const frame = frameByLevel.get(levelDoc.level);
      return {
        id: levelDoc._id,
        level: levelDoc.level,
        code: levelDoc.code,
        name: levelDoc.name,
        nameAr: levelDoc.nameAr,
        price: levelDoc.price,
        color: levelDoc.color,
        usernameColor: levelDoc.usernameColor || levelDoc.color,
        badgeImageUrl: levelDoc.badgeImageUrl || levelDoc.imageUrl || "",
        badgeLottieUrl: levelDoc.badgeLottieUrl || "",
        commentFrameLottieUrl:
          levelDoc.commentFrameLottieUrl || frame?.lottieUrl || "",
        commentTextColor: levelDoc.commentTextColor || "",
        commentBorderWidth: typeof levelDoc.commentBorderWidth === "number" ? levelDoc.commentBorderWidth : 1.4,
        commentBubbleShape: levelDoc.commentBubbleShape || "classic",
        profileFrameLottieUrl: levelDoc.profileFrameLottieUrl || "",
        joinAnimationLottieUrl: levelDoc.joinAnimationLottieUrl || "",
        joinSoundUrl: levelDoc.joinSoundUrl || "",
        specialJoinText: levelDoc.specialJoinText || "",
        features: levelDoc.features || SHARED_VIP_FEATURES,
      };
    });

    res.json({ success: true, levels: payload });
  } catch (error) {
    console.error("Live engagement VIP levels error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch VIP levels" });
  }
};

// Public: GET /api/live-engagement/vip-frames
exports.getVipFrames = async (req, res) => {
  try {
    const levelFilter = Number(req.query.vipLevel);
    const query = { isActive: true };

    if (Number.isFinite(levelFilter) && levelFilter > 0) {
      query.vipLevel = levelFilter;
    }

    const frames = await VipFrame.find(query).sort({ vipLevel: 1, isDefault: -1, sortOrder: 1 });

    res.json({ success: true, frames });
  } catch (error) {
    console.error("Live engagement VIP frames error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch VIP frames" });
  }
};

// Public: GET /api/live-engagement/gifts
exports.getGiftCatalog = async (_req, res) => {
  try {
    const gifts = await Gift.find({ isActive: true }).sort({ sortOrder: 1, coinPrice: 1, price: 1 });
    res.json({ success: true, gifts: gifts.map(toGiftResponse) });
  } catch (error) {
    console.error("Live engagement gifts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch gifts" });
  }
};

// Public: GET /api/live-engagement/rooms/:roomId/messages
exports.getRecentRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const limitRaw = Number(req.query.limit || 80);
    const limit = Math.min(Math.max(limitRaw || 80, 10), 200);

    if (!roomId) {
      return res.status(400).json({ success: false, message: "Room ID is required" });
    }

    const messages = await LiveChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error("Live engagement room messages error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch room messages" });
  }
};

// Admin: POST /api/live-engagement/admin/seed-vip-levels
exports.seedVipLevels = async (_req, res) => {
  try {
    await ensureDefaultVipTiers();
    res.json({ success: true, message: "VIP levels seeded" });
  } catch (error) {
    console.error("Seed VIP levels error:", error);
    res.status(500).json({ success: false, message: "Failed to seed VIP levels" });
  }
};

// Admin: POST /api/live-engagement/admin/vip-frames
exports.createVipFrame = async (req, res) => {
  try {
    const vipLevel = Number(req.body.vipLevel);

    if (!Number.isFinite(vipLevel) || vipLevel < 1) {
      return res.status(400).json({
        success: false,
        message: "vipLevel must be a positive number",
      });
    }

    const [lottieUrlFromUpload, previewImageFromUpload] = await Promise.all([
      uploadFieldFile(req.files, "lottie", "live/vip-frames", "raw"),
      uploadFieldFile(req.files, "preview", "live/vip-frames", "image"),
    ]);

    const lottieUrl = lottieUrlFromUpload || req.body.lottieUrl;
    const previewImage = previewImageFromUpload || req.body.previewImage || "";

    if (!lottieUrl) {
      return res.status(400).json({ success: false, message: "Lottie URL or file is required" });
    }

    const isDefault = normalizeBoolean(req.body.isDefault, false);

    if (isDefault) {
      await VipFrame.updateMany({ vipLevel }, { $set: { isDefault: false } });
    }

    const frame = await VipFrame.create({
      name: req.body.name || `VIP${vipLevel} Frame`,
      vipLevel,
      lottieUrl,
      previewImage,
      isDefault,
      isActive: normalizeBoolean(req.body.isActive, true),
      sortOrder: Number(req.body.sortOrder) || 0,
    });

    res.status(201).json({ success: true, frame });
  } catch (error) {
    console.error("Create VIP frame error:", error);
    res.status(500).json({ success: false, message: "Failed to create VIP frame" });
  }
};

// Admin: PUT /api/live-engagement/admin/vip-frames/:id
exports.updateVipFrame = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid frame id" });
    }

    const current = await VipFrame.findById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: "Frame not found" });
    }

    const [lottieUrlFromUpload, previewImageFromUpload] = await Promise.all([
      uploadFieldFile(req.files, "lottie", "live/vip-frames", "raw"),
      uploadFieldFile(req.files, "preview", "live/vip-frames", "image"),
    ]);

    const nextLevel = Number(req.body.vipLevel || current.vipLevel);
    if (!Number.isFinite(nextLevel) || nextLevel < 1) {
      return res.status(400).json({
        success: false,
        message: "vipLevel must be a positive number",
      });
    }

    const update = {
      name: req.body.name || current.name,
      vipLevel: nextLevel,
      lottieUrl: lottieUrlFromUpload || req.body.lottieUrl || current.lottieUrl,
      previewImage:
        previewImageFromUpload || req.body.previewImage || current.previewImage,
      isActive: normalizeBoolean(req.body.isActive, current.isActive),
      isDefault: normalizeBoolean(req.body.isDefault, current.isDefault),
      sortOrder: Number(req.body.sortOrder ?? current.sortOrder),
    };

    if (update.isDefault) {
      await VipFrame.updateMany(
        { vipLevel: nextLevel, _id: { $ne: current._id } },
        { $set: { isDefault: false } },
      );
    }

    const frame = await VipFrame.findByIdAndUpdate(id, update, { new: true });

    res.json({ success: true, frame });
  } catch (error) {
    console.error("Update VIP frame error:", error);
    res.status(500).json({ success: false, message: "Failed to update VIP frame" });
  }
};

// Admin: DELETE /api/live-engagement/admin/vip-frames/:id
exports.deleteVipFrame = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid frame id" });
    }

    await VipFrame.findByIdAndUpdate(id, { isActive: false }, { new: true });

    res.json({ success: true, message: "VIP frame deleted" });
  } catch (error) {
    console.error("Delete VIP frame error:", error);
    res.status(500).json({ success: false, message: "Failed to delete VIP frame" });
  }
};

// Admin: POST /api/live-engagement/admin/gifts
exports.createGift = async (req, res) => {
  try {
    const [animationUrlFromUpload, thumbnailFromUpload, soundFromUpload] = await Promise.all([
      uploadFieldFile(req.files, "animation", "live/gifts/animations", "auto"),
      uploadFieldFile(req.files, "thumbnail", "live/gifts/previews", "image"),
      uploadFieldFile(req.files, "sound", "live/gifts/sounds", "video"),
    ]);

    const animationUrl = animationUrlFromUpload || req.body.animationUrl || req.body.lottieUrl;

    if (!animationUrl) {
      return res.status(400).json({ success: false, message: "Animation file or URL is required" });
    }

    const animationType = detectAnimationType(
      req.files?.animation?.[0]?.originalname || "",
      req.files?.animation?.[0]?.mimetype || "",
      req.body.animationType || "",
    );

    const coinPrice = Number(req.body.coinPrice || req.body.price || 1);

    const gift = await Gift.create({
      name: req.body.name,
      nameAr: req.body.nameAr || req.body.name,
      animationType,
      animationUrl,
      lottieUrl: req.body.lottieUrl || (animationType === "lottie" ? animationUrl : ""),
      thumbnailUrl:
        thumbnailFromUpload || req.body.thumbnailUrl || req.body.previewImage || animationUrl,
      previewImage:
        thumbnailFromUpload || req.body.previewImage || req.body.thumbnailUrl || animationUrl,
      soundUrl: soundFromUpload || req.body.soundUrl || "",
      rarity: req.body.rarity || "common",
      category: req.body.category || "basic",
      coinPrice,
      price: coinPrice,
      duration: Number(req.body.duration) || 3,
      comboEnabled: normalizeBoolean(req.body.comboEnabled, true),
      fullScreen: normalizeBoolean(req.body.fullScreen, false),
      sortOrder: Number(req.body.sortOrder) || 0,
      isActive: normalizeBoolean(req.body.isActive, true),
    });

    res.status(201).json({ success: true, gift: toGiftResponse(gift) });
  } catch (error) {
    console.error("Create live gift error:", error);
    res.status(500).json({ success: false, message: "Failed to create gift" });
  }
};

// Admin: PUT /api/live-engagement/admin/gifts/:id
exports.updateGift = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid gift id" });
    }

    const current = await Gift.findById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: "Gift not found" });
    }

    const [animationUrlFromUpload, thumbnailFromUpload, soundFromUpload] = await Promise.all([
      uploadFieldFile(req.files, "animation", "live/gifts/animations", "auto"),
      uploadFieldFile(req.files, "thumbnail", "live/gifts/previews", "image"),
      uploadFieldFile(req.files, "sound", "live/gifts/sounds", "video"),
    ]);

    const animationType = detectAnimationType(
      req.files?.animation?.[0]?.originalname || "",
      req.files?.animation?.[0]?.mimetype || "",
      req.body.animationType || current.animationType,
    );

    const coinPrice = Number(req.body.coinPrice || req.body.price || current.coinPrice || current.price);

    const update = {
      name: req.body.name || current.name,
      nameAr: req.body.nameAr || current.nameAr,
      animationType,
      animationUrl:
        animationUrlFromUpload || req.body.animationUrl || req.body.lottieUrl || current.animationUrl,
      lottieUrl:
        req.body.lottieUrl ||
        (animationType === "lottie"
          ? animationUrlFromUpload || req.body.animationUrl || current.lottieUrl || current.animationUrl
          : current.lottieUrl),
      thumbnailUrl:
        thumbnailFromUpload || req.body.thumbnailUrl || req.body.previewImage || current.thumbnailUrl,
      previewImage:
        thumbnailFromUpload || req.body.previewImage || req.body.thumbnailUrl || current.previewImage,
      soundUrl: soundFromUpload || req.body.soundUrl || current.soundUrl,
      rarity: req.body.rarity || current.rarity || "common",
      category: req.body.category || current.category,
      coinPrice,
      price: coinPrice,
      duration: Number(req.body.duration || current.duration || 3),
      comboEnabled: normalizeBoolean(req.body.comboEnabled, current.comboEnabled),
      fullScreen: normalizeBoolean(req.body.fullScreen, current.fullScreen),
      sortOrder: Number(req.body.sortOrder ?? current.sortOrder),
      isActive: normalizeBoolean(req.body.isActive, current.isActive),
    };

    const gift = await Gift.findByIdAndUpdate(id, update, { new: true });

    res.json({ success: true, gift: toGiftResponse(gift) });
  } catch (error) {
    console.error("Update live gift error:", error);
    res.status(500).json({ success: false, message: "Failed to update gift" });
  }
};

// Admin: DELETE /api/live-engagement/admin/gifts/:id
exports.deleteGift = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid gift id" });
    }

    await Gift.findByIdAndUpdate(id, { isActive: false });

    res.json({ success: true, message: "Gift deleted" });
  } catch (error) {
    console.error("Delete live gift error:", error);
    res.status(500).json({ success: false, message: "Failed to delete gift" });
  }
};
