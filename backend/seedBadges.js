const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Badge = require("./models/Badge");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const sampleBadges = [
  // Profile Frames
  {
    name: "Phoenix Crown Frame",
    description:
      "Majestic phoenix wings with a golden crown. A symbol of royalty and power.",
    imageUrl: "https://i.ibb.co/your-phoenix-crown-image.png", // Replace with actual uploaded image URL
    type: "frame",
    rarity: "legendary",
    price: 5000,
    isExclusive: false,
    properties: {
      animation: "glow-pulse",
      glowEffect: true,
      particleEffect: "fire-sparks",
    },
    sortOrder: 1,
  },
  {
    name: "Rainbow Wings Frame",
    description:
      "Vibrant rainbow-colored wings with ethereal glow. Show your colorful personality!",
    imageUrl: "https://i.ibb.co/your-rainbow-wings-image.png", // Replace with actual uploaded image URL
    type: "frame",
    rarity: "epic",
    price: 3000,
    isExclusive: false,
    properties: {
      animation: "rainbow-shift",
      glowEffect: true,
      particleEffect: "sparkles",
    },
    sortOrder: 2,
  },
  {
    name: "VIP Golden Frame",
    description:
      "Exclusive golden frame for VIP members only. Gift from admins.",
    imageUrl: "https://via.placeholder.com/300/FFD700/FFFFFF?text=VIP+Gold",
    type: "frame",
    rarity: "legendary",
    price: 0,
    isExclusive: true,
    properties: {
      animation: "gentle-glow",
      glowEffect: true,
      particleEffect: "gold-dust",
    },
    sortOrder: 3,
  },
  {
    name: "Silver Wings Frame",
    description: "Elegant silver wings with a subtle shimmer.",
    imageUrl: "https://via.placeholder.com/300/C0C0C0/FFFFFF?text=Silver+Wings",
    type: "frame",
    rarity: "rare",
    price: 1500,
    isExclusive: false,
    properties: {
      animation: "shimmer",
      glowEffect: true,
      particleEffect: "stars",
    },
    sortOrder: 4,
  },
  {
    name: "Neon Glow Frame",
    description: "Futuristic neon frame with pulsing lights.",
    imageUrl: "https://via.placeholder.com/300/00FF00/FFFFFF?text=Neon+Glow",
    type: "frame",
    rarity: "epic",
    price: 2500,
    isExclusive: false,
    properties: {
      animation: "neon-pulse",
      glowEffect: true,
      particleEffect: "electric",
    },
    sortOrder: 5,
  },
  {
    name: "Basic Frame",
    description: "Simple and elegant frame for everyone.",
    imageUrl: "https://via.placeholder.com/300/808080/FFFFFF?text=Basic+Frame",
    type: "frame",
    rarity: "common",
    price: 500,
    isExclusive: false,
    properties: {
      animation: "none",
      glowEffect: false,
      particleEffect: "none",
    },
    sortOrder: 6,
  },

  // Live Room Backgrounds
  {
    name: "Starry Night Background",
    description: "Beautiful starry night sky for your live room.",
    imageUrl:
      "https://via.placeholder.com/1920x1080/000033/FFFFFF?text=Starry+Night",
    type: "background",
    rarity: "epic",
    price: 4000,
    isExclusive: false,
    properties: {
      animation: "twinkling-stars",
      glowEffect: false,
      particleEffect: "shooting-stars",
    },
    sortOrder: 10,
  },
  {
    name: "Ocean Waves Background",
    description: "Calming ocean waves backdrop for your streams.",
    imageUrl:
      "https://via.placeholder.com/1920x1080/0066CC/FFFFFF?text=Ocean+Waves",
    type: "background",
    rarity: "rare",
    price: 2000,
    isExclusive: false,
    properties: {
      animation: "wave-motion",
      glowEffect: false,
      particleEffect: "water-drops",
    },
    sortOrder: 11,
  },
  {
    name: "Galaxy Background",
    description: "Stunning galaxy backdrop with nebula effects.",
    imageUrl: "https://via.placeholder.com/1920x1080/330066/FFFFFF?text=Galaxy",
    type: "background",
    rarity: "legendary",
    price: 6000,
    isExclusive: false,
    properties: {
      animation: "nebula-swirl",
      glowEffect: true,
      particleEffect: "cosmic-dust",
    },
    sortOrder: 12,
  },
  {
    name: "VIP Exclusive Background",
    description: "Premium VIP background. Admin gift only.",
    imageUrl:
      "https://via.placeholder.com/1920x1080/8B008B/FFFFFF?text=VIP+Exclusive",
    type: "background",
    rarity: "legendary",
    price: 0,
    isExclusive: true,
    properties: {
      animation: "royal-shimmer",
      glowEffect: true,
      particleEffect: "diamonds",
    },
    sortOrder: 13,
  },
  {
    name: "Sunset Gradient Background",
    description: "Warm sunset colors for a cozy atmosphere.",
    imageUrl: "https://via.placeholder.com/1920x1080/FF6347/FFFFFF?text=Sunset",
    type: "background",
    rarity: "common",
    price: 1000,
    isExclusive: false,
    properties: {
      animation: "subtle-shift",
      glowEffect: false,
      particleEffect: "none",
    },
    sortOrder: 14,
  },
];

const seedBadges = async () => {
  try {
    console.log("Seeding badges...");

    // Clear existing badges (optional - remove this if you want to keep existing data)
    // await Badge.deleteMany({});
    // console.log("Cleared existing badges");

    // Insert sample badges
    const badges = await Badge.insertMany(sampleBadges);
    console.log(`✅ Successfully seeded ${badges.length} badges`);

    badges.forEach((badge) => {
      console.log(
        `  - ${badge.name} (${badge.type}) - ${badge.rarity} - ${badge.price} diamonds`,
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding badges:", error);
    process.exit(1);
  }
};

seedBadges();
