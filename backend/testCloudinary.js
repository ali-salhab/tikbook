const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;

dotenv.config();

console.log("🔍 Checking Cloudinary Configuration...\n");

// Check if environment variables are set
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log("Environment Variables:");
console.log("  CLOUDINARY_CLOUD_NAME:", cloudName ? "✅ Set" : "❌ Missing");
console.log("  CLOUDINARY_API_KEY:", apiKey ? "✅ Set" : "❌ Missing");
console.log("  CLOUDINARY_API_SECRET:", apiSecret ? "✅ Set" : "❌ Missing");
console.log();

if (!cloudName || !apiKey || !apiSecret) {
    console.error("❌ Cloudinary credentials are missing!");
    console.log("\n📝 Please add them to your .env file:");
    console.log("   CLOUDINARY_CLOUD_NAME=your_cloud_name");
    console.log("   CLOUDINARY_API_KEY=your_api_key");
    console.log("   CLOUDINARY_API_SECRET=your_api_secret");
    console.log("\n🔗 Get credentials from: https://cloudinary.com/console");
    process.exit(1);
}

// Check for placeholder values
if (
    cloudName.includes("your_") ||
    apiKey.includes("your_") ||
    apiSecret.includes("your_")
) {
    console.error("❌ Cloudinary credentials contain placeholder values!");
    console.log("\n📝 Please replace them with actual values from Cloudinary dashboard");
    console.log("🔗 Get credentials from: https://cloudinary.com/console");
    process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

// Test connection by fetching account details
console.log("🔌 Testing Cloudinary connection...\n");

cloudinary.api
    .ping()
    .then((result) => {
        console.log("✅ Cloudinary connection successful!");
        console.log("   Status:", result.status);
        console.log("\n🎉 Your Cloudinary is configured correctly!");
        console.log("\n📊 Account Info:");
        return cloudinary.api.usage();
    })
    .then((usage) => {
        console.log("   Cloud Name:", cloudName);
        console.log("   Storage Used:", (usage.storage.usage / 1024 / 1024).toFixed(2), "MB");
        console.log("   Bandwidth Used:", (usage.bandwidth.usage / 1024 / 1024).toFixed(2), "MB");
        console.log("   Resources:", usage.resources || 0);
        console.log("\n✅ Everything is ready for video uploads!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Cloudinary connection failed!");
        console.error("   Error:", error.message);
        console.log("\n🔍 Possible issues:");
        console.log("   1. Invalid credentials (check Cloud Name, API Key, API Secret)");
        console.log("   2. Network connectivity issues");
        console.log("   3. Cloudinary account suspended or expired");
        console.log("\n🔗 Verify credentials at: https://cloudinary.com/console");
        process.exit(1);
    });
