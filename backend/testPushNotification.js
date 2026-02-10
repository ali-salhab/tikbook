/**
 * Test Push Notification Sender for Expo
 *
 * This script sends test notifications to your Expo push token
 * to test all notification scenarios:
 * 1. App Closed (Terminated)
 * 2. App in Background
 * 3. App in Foreground
 * 4. Notification with navigation data
 *
 * Usage: node testPushNotification.js
 */

const axios = require("axios");

// Your Expo Push Token
const EXPO_PUSH_TOKEN = "ExponentPushToken[XCJnCCBTHNFSNLE8cZHflM]";

/**
 * Send a push notification via Expo Push API
 */
async function sendExpoPushNotification(token, title, body, data = {}) {
  const message = {
    to: token,
    sound: "default",
    title: title,
    body: body,
    data: data,
    priority: "high",
  };

  try {
    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      message,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ Notification sent successfully!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error sending notification:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * Test scenarios
 */
async function runNotificationTests() {
  console.log("🚀 Starting Notification Tests...\n");
  console.log(`📱 Target Token: ${EXPO_PUSH_TOKEN}\n`);
  console.log("=".repeat(60));

  // Test 1: Simple notification
  console.log("\n📬 Test 1: Simple Notification (No navigation)");
  await sendExpoPushNotification(
    EXPO_PUSH_TOKEN,
    "مرحباً من TikBook! 👋",
    "هذا اشعار تجريبي بسيط",
  );
  await sleep(3000);

  // Test 2: Notification with navigation to Activity Screen
  console.log("\n📬 Test 2: Navigate to Activity Screen");
  await sendExpoPushNotification(
    EXPO_PUSH_TOKEN,
    "💬 تعليق جديد",
    "علق أحمد على فيديو الخاص بك",
    {
      screen: "Activity",
      params: {},
    },
  );
  await sleep(3000);

  // Test 3: Notification with navigation to specific video
  console.log("\n📬 Test 3: Navigate to Specific Video");
  await sendExpoPushNotification(
    EXPO_PUSH_TOKEN,
    "❤️ إعجاب جديد",
    "أعجب محمد بالفيديو الخاص بك",
    {
      screen: "MainTabs",
      params: {
        screen: "Home",
        params: {
          videoId: "698987caaa810253b290ee91",
        },
      },
    },
  );
  await sleep(3000);

  // Test 4: Notification to profile
  console.log("\n📬 Test 4: Navigate to User Profile");
  await sendExpoPushNotification(
    EXPO_PUSH_TOKEN,
    "👤 متابع جديد",
    "بدأ سارة في متابعتك",
    {
      screen: "UserProfile",
      params: {
        userId: "507f1f77bcf86cd799439011",
      },
    },
  );
  await sleep(3000);

  // Test 5: Notification to chat
  console.log("\n📬 Test 5: Navigate to Chat");
  await sendExpoPushNotification(
    EXPO_PUSH_TOKEN,
    "💬 رسالة جديدة",
    "أرسل أحمد رسالة لك",
    {
      screen: "Chat",
      params: {
        userId: "507f1f77bcf86cd799439011",
        username: "ahmed",
      },
    },
  );
  await sleep(3000);

  // Test 6: Rich notification with emoji
  console.log("\n📬 Test 6: Rich Notification");
  await sendExpoPushNotification(
    EXPO_PUSH_TOKEN,
    "🎉 مبروك!",
    "وصل فيديوك إلى 1000 مشاهدة! 🚀✨",
    {
      screen: "Profile",
      params: {},
    },
  );

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed!\n");
  console.log("📋 Test Instructions:");
  console.log(
    "1. Test with app CLOSED - Force quit the app, then run this script",
  );
  console.log(
    "2. Test with app in BACKGROUND - Open app, go to home screen, run script",
  );
  console.log("3. Test with app in FOREGROUND - Keep app open, run script");
  console.log(
    "4. Test notification TAPS - Tap on each notification to test navigation\n",
  );
}

// Helper function to pause between tests
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run interactive menu
async function main() {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n" + "=".repeat(60));
  console.log("🔔 TikBook Push Notification Test Utility");
  console.log("=".repeat(60));
  console.log(`\n📱 Token: ${EXPO_PUSH_TOKEN}\n`);
  console.log("Select test to run:");
  console.log("1. Run all tests (6 notifications with 3s delay)");
  console.log("2. Send single simple notification");
  console.log("3. Send notification with navigation to Activity");
  console.log("4. Send notification with navigation to Video");
  console.log("5. Send notification with navigation to Profile");
  console.log("6. Send custom notification");
  console.log("0. Exit\n");

  readline.question("Enter your choice (0-6): ", async (choice) => {
    console.log("");

    try {
      switch (choice) {
        case "1":
          await runNotificationTests();
          break;

        case "2":
          await sendExpoPushNotification(
            EXPO_PUSH_TOKEN,
            "إشعار تجريبي 📱",
            "هذا اشعار تجريبي من TikBook",
          );
          break;

        case "3":
          await sendExpoPushNotification(
            EXPO_PUSH_TOKEN,
            "نشاط جديد 🔔",
            "لديك إشعارات جديدة",
            { screen: "Activity" },
          );
          break;

        case "4":
          await sendExpoPushNotification(
            EXPO_PUSH_TOKEN,
            "فيديو جديد 🎥",
            "شاهد هذا الفيديو الرائع",
            {
              screen: "MainTabs",
              params: {
                screen: "Home",
                params: { videoId: "698987caaa810253b290ee91" },
              },
            },
          );
          break;

        case "5":
          await sendExpoPushNotification(
            EXPO_PUSH_TOKEN,
            "ملف شخصي 👤",
            "زار أحدهم ملفك الشخصي",
            { screen: "Profile" },
          );
          break;

        case "6":
          readline.question("Enter title: ", async (title) => {
            readline.question("Enter body: ", async (body) => {
              await sendExpoPushNotification(EXPO_PUSH_TOKEN, title, body);
              readline.close();
              process.exit(0);
            });
          });
          return; // Don't close readline yet

        case "0":
          console.log("👋 Goodbye!");
          readline.close();
          process.exit(0);
          return;

        default:
          console.log("❌ Invalid choice");
      }
    } catch (error) {
      console.error("Error:", error.message);
    }

    readline.close();
  });
}

// Run the main function
main();
