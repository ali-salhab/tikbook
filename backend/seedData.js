const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Video = require("./models/Video");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/tikbook"
    );
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Video.deleteMany({});

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    // Create dummy users
    console.log("Creating users...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);

    const users = await User.insertMany([
      {
        username: "أحمد_الفنان",
        email: "ahmed@tikbook.com",
        password: hashedPassword,
        bio: "فنان ومبدع 🎨 | أحب مشاركة لحظاتي الإبداعية",
        profileImage: "https://i.pravatar.cc/150?img=12",
      },
      {
        username: "سارة_المسافرة",
        email: "sara@tikbook.com",
        password: hashedPassword,
        bio: "مستكشفة العالم 🌍 | شغف السفر والمغامرات",
        profileImage: "https://i.pravatar.cc/150?img=47",
      },
      {
        username: "محمد_الرياضي",
        email: "mohamed@tikbook.com",
        password: hashedPassword,
        bio: "رياضي محترف ⚽ | التحديات هي طريقي",
        profileImage: "https://i.pravatar.cc/150?img=33",
      },
      {
        username: "نور_المصورة",
        email: "noor@tikbook.com",
        password: hashedPassword,
        bio: "مصورة فوتوغرافية 📸 | أسعى لالتقاط الجمال في كل لحظة",
        profileImage: "https://i.pravatar.cc/150?img=45",
      },
      {
        username: "خالد_المرح",
        email: "khaled@tikbook.com",
        password: hashedPassword,
        bio: "محب للضحك والمرح 😄 | الحياة أجمل مع الابتسامة",
        profileImage: "https://i.pravatar.cc/150?img=68",
      },
      {
        username: "ليلى_الطباخة",
        email: "layla@tikbook.com",
        password: hashedPassword,
        bio: "شيف ومبدعة في المطبخ 👩‍🍳 | وصفات شهية وسهلة",
        profileImage: "https://i.pravatar.cc/150?img=31",
      },
      {
        username: "عمر_التقني",
        email: "omar@tikbook.com",
        password: hashedPassword,
        bio: "مطور برمجيات 💻 | شغوف بالتكنولوجيا والابتكار",
        profileImage: "https://i.pravatar.cc/150?img=51",
      },
      {
        username: "فاطمة_الكاتبة",
        email: "fatima@tikbook.com",
        password: hashedPassword,
        bio: "كاتبة وشاعرة ✍️ | الكلمات هي عالمي",
        profileImage: "https://i.pravatar.cc/150?img=38",
      },
    ]);

    console.log(`Created ${users.length} users`);

    // Create following relationships
    await users[0].updateOne({
      $push: { following: [users[1]._id, users[2]._id, users[3]._id] },
    });
    await users[1].updateOne({
      $push: {
        followers: users[0]._id,
        following: [users[0]._id, users[4]._id],
      },
    });
    await users[2].updateOne({
      $push: { followers: users[0]._id, following: users[1]._id },
    });
    await users[3].updateOne({
      $push: {
        followers: users[0]._id,
        following: [users[0]._id, users[5]._id],
      },
    });
    await users[4].updateOne({ $push: { followers: users[1]._id } });
    await users[5].updateOne({ $push: { followers: users[3]._id } });

    // Create dummy videos with sample data
    console.log("Creating videos...");
    const videoDescriptions = [
      "فيديو رائع! 🎬 #فن #إبداع",
      "لحظات لا تُنسى 💫 #سفر #مغامرة",
      "تحدي جديد! 🔥 #تحدي #ترفيه",
      "الطبيعة الخلابة 🌿 #طبيعة #جمال",
      "وقت المرح! 🎉 #مرح #أصدقاء",
      "وصفة اليوم: كيكة الشوكولاتة 🍰 #طبخ #حلويات",
      "تحدي البرمجة: بناء تطبيق في ساعة 💻 #برمجة #تكنولوجيا",
      "قصيدة الصباح ☀️ #شعر #أدب",
      "تمرين اليوم: القوة والتحمل 💪 #رياضة #لياقة",
      "رحلتي إلى الجبال 🏔️ #سفر #طبيعة",
      "لحظات إبداعية في الرسم 🎨 #فن #رسم",
      "نصائح للمبتدئين في التصوير 📷 #تصوير #نصائح",
      "أجمل غروب شمس 🌅 #غروب #جمال",
      "تحدي الرقص الجديد 💃 #رقص #تحدي",
      "وصفة سريعة للفطور 🥞 #فطور #طبخ",
      "يوم في حياتي 📹 #يومياتي #حياة",
      "رحلة التسوق 🛍️ #تسوق #موضة",
      "نصائح للدراسة الفعالة 📚 #تعليم #نصائح",
      "تجربة مطعم جديد 🍕 #طعام #تجربة",
      "لعبة مثيرة! 🎮 #ألعاب #ترفيه",
    ];

    const videos = [];
    const availableVideos = [
      "video-1.mp4",
      "video-2.mp4",
      "video-3.mp4",
      "video-4.mp4",
      "video-5.mp4",
      "video1.mp4",
      "video2.mp4",
    ]; // 7 videos available

    for (let i = 0; i < 20; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomLikesCount = Math.floor(Math.random() * 100) + 10;
      const likingUsers = users
        .filter((u) => Math.random() > 0.5)
        .map((u) => u._id)
        .slice(0, randomLikesCount);

      const comments = [];
      const commentTexts = [
        "رائع! 👏",
        "أحببت هذا المحتوى! ❤️",
        "استمر في الإبداع! 🔥",
        "محتوى مميز جداً! ⭐",
        "شكراً على المشاركة! 🙏",
        "هذا ملهم حقاً! 💫",
        "أفضل فيديو شاهدته اليوم! 🎬",
        "محتوى قيّم ومفيد! 📚",
      ];

      const randomCommentsCount = Math.floor(Math.random() * 8) + 2;
      for (let j = 0; j < randomCommentsCount; j++) {
        const randomCommenter = users[Math.floor(Math.random() * users.length)];
        comments.push({
          user: randomCommenter._id,
          text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          createdAt: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ),
        });
      }

      // Cycle through available videos
      const videoFile = availableVideos[i % availableVideos.length];

      videos.push({
        user: randomUser._id,
        videoUrl: `uploads/${videoFile}`,
        description: videoDescriptions[i % videoDescriptions.length],
        likes: likingUsers,
        comments: comments,
        views: Math.floor(Math.random() * 50000) + 500,
        createdAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ),
      });
    }

    await Video.insertMany(videos);
    console.log(`Created ${videos.length} videos`);

    console.log("✅ Seed data created successfully!");
    console.log("\nTest user credentials:");
    console.log("Email: ahmed@tikbook.com | Password: 123456");
    console.log("Email: sara@tikbook.com | Password: 123456");
    console.log("Email: mohamed@tikbook.com | Password: 123456");
    console.log(
      "\nNote: Video files are not included. Place actual video files in the uploads folder or use the mobile app to upload videos."
    );

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
