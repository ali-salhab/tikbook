#!/usr/bin/env node

/**
 * Quick Send - Send a notification instantly
 * Usage: node quickSend.js "Title" "Body" "screen"
 */

const axios = require("axios");

const EXPO_PUSH_TOKEN = "ExponentPushToken[XCJnCCBTHNFSNLE8cZHflM]";

async function sendNotification(title, body, screen) {
  const data = screen ? { screen } : {};

  const message = {
    to: EXPO_PUSH_TOKEN,
    sound: "default",
    title: title || "TikBook",
    body: body || "Test notification",
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

    console.log("✅ Notification sent!");
    console.log(`   Title: ${title}`);
    console.log(`   Body: ${body}`);
    if (screen) console.log(`   Navigate to: ${screen}`);
    console.log("\nResponse:", response.data);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const title = args[0];
const body = args[1];
const screen = args[2];

if (!title && !body) {
  // Send default test notification
  console.log("Sending default test notification...\n");
  sendNotification("مرحبا 👋", "اشعار تجريبي من TikBook");
} else {
  sendNotification(title, body, screen);
}
