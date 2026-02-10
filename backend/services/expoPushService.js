const axios = require("axios");

/**
 * Send push notification via Expo Push Notification Service
 * Supports both Expo push tokens (ExponentPushToken[...]) and FCM tokens
 */
const sendExpoPushNotification = async (token, title, body, data = {}) => {
  try {
    // Check if it's an Expo push token
    if (
      !token ||
      (!token.startsWith("ExponentPushToken[") &&
        !token.startsWith("ExpoPushToken["))
    ) {
      console.log("Not an Expo push token, skipping Expo notification");
      return null;
    }

    const message = {
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data,
      priority: "high",
      channelId: "default", // For Android
    };

    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      message,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
      },
    );

    console.log("Successfully sent Expo notification:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending Expo notification:",
      error.response?.data || error.message,
    );
    return null;
  }
};

/**
 * Send push notifications to multiple Expo tokens
 */
const sendMulticastExpoPushNotification = async (
  tokens,
  title,
  body,
  data = {},
) => {
  try {
    if (!tokens || tokens.length === 0) {
      return null;
    }

    // Filter only Expo tokens
    const expoTokens = tokens.filter(
      (token) =>
        token.startsWith("ExponentPushToken[") ||
        token.startsWith("ExpoPushToken["),
    );

    if (expoTokens.length === 0) {
      console.log("No valid Expo tokens found");
      return null;
    }

    const messages = expoTokens.map((token) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data,
      priority: "high",
      channelId: "default",
    }));

    const response = await axios.post(
      "https://exp.host/--/api/v2/push/send",
      messages,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`Successfully sent ${expoTokens.length} Expo notifications`);
    return response.data;
  } catch (error) {
    console.error(
      "Error sending multicast Expo notification:",
      error.response?.data || error.message,
    );
    return null;
  }
};

/**
 * Validate if a token is an Expo push token
 */
const isExpoPushToken = (token) => {
  return (
    token &&
    (token.startsWith("ExponentPushToken[") ||
      token.startsWith("ExpoPushToken["))
  );
};

module.exports = {
  sendExpoPushNotification,
  sendMulticastExpoPushNotification,
  isExpoPushToken,
};
