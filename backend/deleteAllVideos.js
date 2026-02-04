const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Video = require("./models/Video");

const deleteAllVideos = async () => {
    try {
        await mongoose.connect(
            process.env.MONGO_URI || "mongodb://localhost:27017/tikbook"
        );
        console.log("✅ MongoDB Connected");

        // Delete all videos
        const result = await Video.deleteMany({});
        console.log(`🗑️  Deleted ${result.deletedCount} videos from database`);

        console.log("✅ Database cleanup complete!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

deleteAllVideos();
