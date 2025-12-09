const mongoose = require("mongoose");
const User = require("./models/User");
const dotenv = require("dotenv");

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/tikbook"
    );

    console.log("Connected to MongoDB");

    // Check if admin already exists
    const adminExists = await User.findOne({ email: "admin@tikbook.com" });

    if (adminExists) {
      console.log("Admin user already exists! Updating password...");
      adminExists.password = "123456";
      adminExists.isAdmin = true;
      await adminExists.save();
      console.log("✅ Admin password updated to: 123456");
    } else {
      // Create admin user
      const admin = await User.create({
        username: "admin",
        email: "admin@tikbook.com",
        password: "123456",
        isAdmin: true,
        bio: "TikBook Administrator",
      });
      console.log("✅ Admin user created successfully!");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email: admin@tikbook.com");
    console.log("🔑 Password: 123456");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Use these credentials to log in to the admin panel");
    console.log("Admin Panel URL: http://localhost:5173");

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
};

createAdminUser();
