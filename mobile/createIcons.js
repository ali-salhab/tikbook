const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

async function createIcons() {
  const logoPath = path.join(__dirname, "assets", "logo.jpg");

  if (!fs.existsSync(logoPath)) {
    console.error("❌ Logo file not found:", logoPath);
    return;
  }

  console.log("📱 Creating app icons from logo.jpg...");

  // App icon (1024x1024 for iOS and Android)
  await sharp(logoPath)
    .resize(1024, 1024, { fit: "cover", position: "center" })
    .png()
    .toFile(path.join(__dirname, "assets", "icon.png"));
  console.log("✅ Created icon.png (1024x1024)");

  // Splash screen (2000x2000 with logo centered)
  await sharp({
    create: {
      width: 2000,
      height: 2000,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(800, 800, { fit: "inside" })
          .toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toFile(path.join(__dirname, "assets", "splash.png"));
  console.log("✅ Created splash.png (2000x2000)");

  // Adaptive icon (1024x1024)
  await sharp(logoPath)
    .resize(1024, 1024, { fit: "cover", position: "center" })
    .png()
    .toFile(path.join(__dirname, "assets", "adaptive-icon.png"));
  console.log("✅ Created adaptive-icon.png (1024x1024)");

  // Favicon (48x48)
  await sharp(logoPath)
    .resize(48, 48, { fit: "cover", position: "center" })
    .png()
    .toFile(path.join(__dirname, "assets", "favicon.png"));
  console.log("✅ Created favicon.png (48x48)");

  console.log("\n🎉 All icons created successfully!");
  console.log("📋 Next steps:");
  console.log("   1. Run: npx expo start --clear");
  console.log("   2. Rebuild your app to see the new icons");
}

createIcons().catch((err) => {
  console.error("❌ Error creating icons:", err);
  process.exit(1);
});
