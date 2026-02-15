const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Gift } = require("./models/Gift");

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Sample gifts with Lottie animations from LottieFiles
const sampleGifts = [
  // Basic Gifts
  {
    name: "Rose",
    nameAr: "وردة",
    animationUrl: "https://lottie.host/cf4aee63-9f42-4e41-9fe3-3a01c9c31c72/Iy5jhY4dPD.json",
    thumbnailUrl: "🌹",
    animationType: "lottie",
    price: 10,
    category: "basic",
    duration: 3,
    comboEnabled: true,
    fullScreen: false,
    sortOrder: 1,
  },
  {
    name: "Heart",
    nameAr: "قلب",
    animationUrl: "https://lottie.host/3c6cbd78-8ed4-4278-9a4d-c8b8c8e60f0c/Gg7PtJvUL1.json",
    thumbnailUrl: "❤️",
    animationType: "lottie",
    price: 20,
    category: "basic",
    duration: 3,
    comboEnabled: true,
    fullScreen: false,
    sortOrder: 2,
  },
  {
    name: "Star",
    nameAr: "نجمة",
    animationUrl: "https://lottie.host/5e8d8c0c-7c75-4b6e-b7f4-8a2d3c4e5f6g/StarAnimation.json",
    thumbnailUrl: "⭐",
    animationType: "lottie",
    price: 30,
    category: "basic",
    duration: 3,
    comboEnabled: true,
    fullScreen: false,
    sortOrder: 3,
  },
  {
    name: "Clap",
    nameAr: "تصفيق",
    animationUrl: "https://lottie.host/7f9e8d0d-1e8f-4c5d-b6e5-9a3c4d5e6f7g/ClapAnimation.json",
    thumbnailUrl: "👏",
    animationType: "lottie",
    price: 50,
    category: "basic",
    duration: 2,
    comboEnabled: true,
    fullScreen: false,
    sortOrder: 4,
  },

  // Premium Gifts
  {
    name: "Diamond",
    nameAr: "ماسة",
    animationUrl: "https://lottie.host/8a9b0c1d-2f3e-4d5e-b6c7-1a2b3c4d5e6f/DiamondAnimation.json",
    thumbnailUrl: "💎",
    animationType: "lottie",
    price: 100,
    category: "premium",
    duration: 4,
    comboEnabled: true,
    comboMultiplier: 2.0,
    fullScreen: false,
    sortOrder: 5,
  },
  {
    name: "Crown",
    nameAr: "تاج",
    animationUrl: "https://lottie.host/9b0c1d2e-3f4e-5d6e-c7d8-2b3c4d5e6f7g/CrownAnimation.json",
    thumbnailUrl: "👑",
    animationType: "lottie",
    price: 150,
    category: "premium",
    duration: 4,
    comboEnabled: true,
    comboMultiplier: 2.0,
    fullScreen: false,
    sortOrder: 6,
  },
  {
    name: "Gift Box",
    nameAr: "صندوق هدايا",
    animationUrl: "https://lottie.host/0c1d2e3f-4f5e-6d7e-d8e9-3c4d5e6f7g8h/GiftBoxAnimation.json",
    thumbnailUrl: "🎁",
    animationType: "lottie",
    price: 200,
    category: "premium",
    duration: 5,
    comboEnabled: true,
    comboMultiplier: 2.0,
    fullScreen: false,
    sortOrder: 7,
  },

  // VIP Gifts
  {
    name: "Fireworks",
    nameAr: "ألعاب نارية",
    animationUrl: "https://lottie.host/1d2e3f4g-5f6e-7d8e-e9f0-4d5e6f7g8h9i/FireworksAnimation.json",
    thumbnailUrl: "🎆",
    animationType: "lottie",
    price: 500,
    category: "vip",
    duration: 6,
    comboEnabled: true,
    comboMultiplier: 2.5,
    fullScreen: true,
    sortOrder: 8,
  },
  {
    name: "Rocket",
    nameAr: "صاروخ",
    animationUrl: "https://lottie.host/2e3f4g5h-6f7e-8d9e-f0g1-5e6f7g8h9i0j/RocketAnimation.json",
    thumbnailUrl: "🚀",
    animationType: "lottie",
    price: 800,
    category: "vip",
    duration: 6,
    comboEnabled: true,
    comboMultiplier: 2.5,
    fullScreen: true,
    sortOrder: 9,
  },

  // Special Gifts (Full Screen Effects)
  {
    name: "Lion",
    nameAr: "أسد",
    animationUrl: "https://lottie.host/3f4g5h6i-7f8e-9d0e-g1h2-6f7g8h9i0j1k/LionAnimation.json",
    thumbnailUrl: "🦁",
    animationType: "lottie",
    price: 1000,
    category: "special",
    duration: 8,
    comboEnabled: true,
    comboMultiplier: 3.0,
    fullScreen: true,
    sortOrder: 10,
  },
  {
    name: "Dragon",
    nameAr: "تنين",
    animationUrl: "https://lottie.host/4g5h6i7j-8f9e-0d1e-h2i3-7g8h9i0j1k2l/DragonAnimation.json",
    thumbnailUrl: "🐉",
    animationType: "lottie",
    price: 1500,
    category: "special",
    duration: 8,
    comboEnabled: true,
    comboMultiplier: 3.0,
    fullScreen: true,
    sortOrder: 11,
  },
  {
    name: "Money Rain",
    nameAr: "مطر نقود",
    animationUrl: "https://lottie.host/5h6i7j8k-9f0e-1d2e-i3j4-8h9i0j1k2l3m/MoneyRainAnimation.json",
    thumbnailUrl: "💰",
    animationType: "lottie",
    price: 2000,
    category: "special",
    duration: 10,
    comboEnabled: true,
    comboMultiplier: 3.0,
    fullScreen: true,
    sortOrder: 12,
  },
];

const seedGifts = async () => {
  try {
    // Clear existing gifts
    await Gift.deleteMany({});
    console.log("Cleared existing gifts");

    // Insert new gifts
    await Gift.insertMany(sampleGifts);
    console.log("Sample gifts seeded successfully!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding gifts:", error);
    process.exit(1);
  }
};

seedGifts();
