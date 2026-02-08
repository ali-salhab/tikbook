import { PermissionsAndroid, Platform } from "react-native";
import axios from "axios";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Configure Expo Notifications to show alerts in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Request User Permission for Notifications
export const requestUserPermission = async () => {
  if (Platform.OS === "android") {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus === "granted") {
        console.log("Notification permission granted");
        return true;
      } else {
        console.log("Notification permission denied");
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
};

// Get Push Token (Expo)
export const getPushToken = async () => {
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      console.error("Project ID not found in Constants");
      return null;
    }
    // Retry a few times in case of transient network failure
    let lastError = null;
    for (let i = 0; i < 3; i++) {
      try {
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("Expo Push Token:", token);
        return token;
      } catch (err) {
        lastError = err;
        console.warn(`Expo token fetch failed (attempt ${i + 1}/3):`, err?.message || err);
        await new Promise((res) => setTimeout(res, 800 * (i + 1)));
      }
    }
    throw lastError || new Error("Expo token fetch failed after retries");
  } catch (error) {
    console.error("Error getting Expo Push token:", error);
    return null;
  }
};

// Legacy alias to avoid breaking other files immediately
export const getFCMToken = getPushToken;

// Save Token to Backend
export const saveTokenToBackend = async (userToken, pushToken, baseUrl) => {
  if (!pushToken || !userToken) return;
  try {
    await axios.put(
      `${baseUrl}/users/fcm-token`, // Keeping endpoint name for now to avoid breaking backend
      { token: pushToken },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    console.log("Push Token saved to backend");
  } catch (error) {
    console.error("Error saving Push token to backend:", error);
  }
};

// Notification Listeners
export const notificationListener = () => {
  // Listener for foreground notifications
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log("Foreground notification received:", notification);
  });

  // Listener for when a user taps on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log("Notification tapped:", response);
    // const data = response.notification.request.content.data;
    // navigation.navigate(data.type);
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
};

// Background Message Handler (Expo handles this internally when configured)
export const setBackgroundMessageHandler = () => {
  console.log("Background message handler setup (managed by expo-notifications)");
};
