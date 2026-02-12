const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Notification = require("./models/Notification");

dotenv.config();

const testFollowNotification = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get two test users
    const users = await User.find().limit(2);

    if (users.length < 2) {
      console.log("❌ Need at least 2 users in database to test");
      process.exit(1);
    }

    const [user1, user2] = users;
    console.log("\n📋 Test Users:");
    console.log(`User 1: ${user1.username} (${user1._id})`);
    console.log(`User 2: ${user2.username} (${user2._id})`);

    // Check if user1 already follows user2
    const alreadyFollowing = user2.followers.includes(user1._id);
    console.log(
      `\n${alreadyFollowing ? "⚠️" : "✅"} User1 ${alreadyFollowing ? "already" : "does not"} follow User2`,
    );

    if (alreadyFollowing) {
      // Unfollow first for testing
      console.log("\n🔄 Unfollowing to reset state...");
      await user2.updateOne({ $pull: { followers: user1._id } });
      await user1.updateOne({ $pull: { following: user2._id } });
      console.log("✅ Unfollowed successfully");
    }

    // Simulate follow action
    console.log("\n🔄 Simulating follow action...");
    await user2.updateOne({ $push: { followers: user1._id } });
    await user1.updateOne({ $push: { following: user2._id } });
    console.log("✅ Follow relationships updated");

    // Create notification
    console.log("\n🔄 Creating notification...");
    const notification = new Notification({
      user: user2._id,
      type: "follow",
      fromUser: user1._id,
    });
    await notification.save();
    console.log("✅ Notification created:", notification._id);

    // Verify notification
    const savedNotification = await Notification.findById(notification._id)
      .populate("user", "username")
      .populate("fromUser", "username");

    console.log("\n📧 Notification Details:");
    console.log(`  To: ${savedNotification.user.username}`);
    console.log(`  From: ${savedNotification.fromUser.username}`);
    console.log(`  Type: ${savedNotification.type}`);
    console.log(`  Read: ${savedNotification.read}`);
    console.log(`  Created: ${savedNotification.createdAt}`);

    // Check unread count
    const unreadCount = await Notification.countDocuments({
      user: user2._id,
      read: false,
    });
    console.log(
      `\n📊 Unread notifications for ${user2.username}: ${unreadCount}`,
    );

    console.log("\n✅ Follow notification test completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
};

testFollowNotification();
