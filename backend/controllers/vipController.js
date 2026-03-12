const VipLevel = require("../models/VipLevel");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

// Default VIP levels seeded on first boot if none exist
const DEFAULT_LEVELS = [
  { level: 1, name: "VIP1 - Starter",     nameAr: "السقون العلاتي",   price: 99,   color: "#8B4513", sortOrder: 1 },
  { level: 2, name: "VIP2 - Silver",      nameAr: "السقون العلتي",    price: 299,  color: "#C0C0C0", sortOrder: 2 },
  { level: 3, name: "VIP3 - Gold",        nameAr: "السقون الذهبي",    price: 499,  color: "#FFD700", sortOrder: 3 },
  { level: 4, name: "VIP4 - Purple",      nameAr: "السقون اللفتي",    price: 999,  color: "#9B59B6", sortOrder: 4 },
  { level: 5, name: "VIP5 - Elite",       nameAr: "السقون الذهبي",    price: 1299, color: "#E67E22", sortOrder: 5 },
  { level: 6, name: "VIP6 - Royal",       nameAr: "السبقون العلتي",   price: 1299, color: "#8E44AD", sortOrder: 6 },
  { level: 7, name: "VIP7 - Flame",       nameAr: "السقون المتسب",    price: 1799, color: "#C0392B", sortOrder: 7 },
  { level: 8, name: "VIP8 - Diamond",     nameAr: "السقون اللتي",     price: 2499, color: "#E74C3C", sortOrder: 8 },
  { level: 9, name: "VIP9 - Crystal",     nameAr: "السقون الكريستالي",price: 2799, color: "#1ABC9C", sortOrder: 9 },
  { level: 10, name: "VIP10 - Legend",    nameAr: "السقون اللفتي",    price: 2999, color: "#3498DB", sortOrder: 10 },
  { level: 11, name: "VIP11 - Warrior",   nameAr: "السقون العلتي",    price: 3999, color: "#34495E", sortOrder: 11 },
  { level: 12, name: "VIP12 - Master",    nameAr: "السقون المتقدم",   price: 4999, color: "#16A085", sortOrder: 12 },
  { level: 13, name: "VIP13 - Champion",  nameAr: "السقون العلتي",    price: 5999, color: "#F39C12", sortOrder: 13 },
  { level: 14, name: "VIP14 - Emperor",   nameAr: "سقون القائد",       price: 7999, color: "#D35400", sortOrder: 14 },
  { level: 15, name: "VIP15 - King",      nameAr: "ملك بلته بيوت",    price: 9999, color: "#FFD700", sortOrder: 15 },
];

const seedDefaultLevels = async () => {
  const count = await VipLevel.countDocuments();
  if (count === 0) {
    await VipLevel.insertMany(DEFAULT_LEVELS);
  }
};

// GET /api/vip/levels
const getAllVipLevels = async (req, res) => {
  try {
    await seedDefaultLevels();
    const levels = await VipLevel.find({ isActive: true }).sort("sortOrder");
    res.json({ success: true, levels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/vip/my-vip
const getMyVip = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("vipLevel vipPurchasedAt");
    res.json({ success: true, vipLevel: user.vipLevel || 0, vipPurchasedAt: user.vipPurchasedAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/vip/purchase/:level
const purchaseVipLevel = async (req, res) => {
  try {
    const levelNum = parseInt(req.params.level);
    const userId = req.user._id;

    const vipLevel = await VipLevel.findOne({ level: levelNum, isActive: true });
    if (!vipLevel) return res.status(404).json({ message: "مستوى VIP غير موجود" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    if (user.vipLevel >= levelNum) {
      return res.status(400).json({ message: "لديك بالفعل هذا المستوى أو أعلى منه" });
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < vipLevel.price) {
      return res.status(400).json({ message: "رصيدك غير كافٍ لإتمام هذه العملية" });
    }

    wallet.balance -= vipLevel.price;
    await wallet.save();

    user.vipLevel = levelNum;
    user.vipPurchasedAt = new Date();
    await user.save();

    await Transaction.create({
      user: userId,
      type: "purchase",
      amount: vipLevel.price,
      description: `شراء VIP${levelNum} - ${vipLevel.nameAr}`,
      status: "completed",
    });

    res.json({ success: true, message: `تم الحصول على VIP${levelNum} بنجاح! 🎉`, vipLevel: levelNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: GET /api/vip/admin/levels (all levels including inactive)
const adminGetAllLevels = async (req, res) => {
  try {
    const levels = await VipLevel.find().sort("sortOrder");
    res.json({ success: true, levels });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: POST /api/vip/admin/levels
const createVipLevel = async (req, res) => {
  try {
    const level = await VipLevel.create(req.body);
    res.status(201).json({ success: true, level });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Admin: PUT /api/vip/admin/levels/:level
const updateVipLevel = async (req, res) => {
  try {
    const level = await VipLevel.findOneAndUpdate(
      { level: parseInt(req.params.level) },
      req.body,
      { new: true }
    );
    if (!level) return res.status(404).json({ message: "المستوى غير موجود" });
    res.json({ success: true, level });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Admin: DELETE /api/vip/admin/levels/:level
const deleteVipLevel = async (req, res) => {
  try {
    await VipLevel.findOneAndDelete({ level: parseInt(req.params.level) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: POST /api/vip/admin/assign
const assignVipToUser = async (req, res) => {
  try {
    const { userId, level } = req.body;
    const levelNum = parseInt(level);

    const vipLevelDoc = await VipLevel.findOne({ level: levelNum });
    if (!vipLevelDoc && levelNum > 0) {
      return res.status(404).json({ message: "مستوى VIP غير موجود" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { vipLevel: levelNum, vipPurchasedAt: levelNum > 0 ? new Date() : null },
      { new: true }
    ).select("username vipLevel");

    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    res.json({ success: true, message: levelNum > 0 ? `تم تعيين VIP${levelNum} للمستخدم ${user.username}` : `تم إزالة VIP من المستخدم ${user.username}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAllVipLevels,
  getMyVip,
  purchaseVipLevel,
  adminGetAllLevels,
  createVipLevel,
  updateVipLevel,
  deleteVipLevel,
  assignVipToUser,
};
