import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// ─── Foreground notification handler ─────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Android notification channel (required for Android 8+) ──────────────────
export const setupAndroidChannel = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "الإشعارات",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF2D92",
      sound: "default",
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }
};

// ─── Permission request ───────────────────────────────────────────────────────
export const requestUserPermission = async () => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
};

// ─── Get Expo push token ──────────────────────────────────────────────────────
export const getPushToken = async () => {
  try {
    // Ensure Android channel exists
    await setupAndroidChannel();

    // Request permission first
    const granted = await requestUserPermission();
    if (!granted) {
      console.warn("Push notification permission denied");
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      console.error("Project ID not found in Constants");
      return null;
    }

    // Retry up to 3 times on transient errors
    let lastError = null;
    for (let i = 0; i < 3; i++) {
      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        console.log("✅ Expo Push Token:", token);
        return token;
      } catch (err) {
        lastError = err;
        console.warn(
          `Expo token fetch failed (attempt ${i + 1}/3):`,
          err?.message || err,
        );
        await new Promise((res) => setTimeout(res, 800 * (i + 1)));
      }
    }
    throw lastError || new Error("Expo token fetch failed after retries");
  } catch (error) {
    console.error("Error getting Expo Push Token:", error);
    return null;
  }
};

// Legacy alias
export const getFCMToken = getPushToken;

// ─── Save token to backend ────────────────────────────────────────────────────
export const saveTokenToBackend = async (userToken, pushToken, baseUrl) => {
  if (!pushToken || !userToken) return;
  try {
    await axios.put(
      `${baseUrl}/users/fcm-token`,
      { token: pushToken },
      { headers: { Authorization: `Bearer ${userToken}` }, timeout: 5000 },
    );
    console.log("✅ Push token saved to backend");
  } catch (error) {
    console.error("Error saving push token to backend:", error);
  }
};

// ─── Resolve navigation target from notification data ────────────────────────
const resolveNavTarget = (data = {}) => {
  if (!data) return null;

  if (data.screen === "LiveRoom" && data.roomId) {
    return { screen: "LiveRoom", params: { roomId: data.roomId } };
  }
  if (data.screen === "UserProfile" && data.userId) {
    return { screen: "UserProfile", params: { userId: data.userId } };
  }
  if (data.screen === "Chat" && data.chatId) {
    return { screen: "Chat", params: { chatId: data.chatId } };
  }

  // Social interactions → Activity screen
  const activityTypes = [
    "like",
    "comment",
    "follow",
    "new_video",
    "live_stream",
  ];
  if (data.screen === "Activity" || activityTypes.includes(data.type)) {
    return { screen: "Activity", params: {} };
  }

  // Generic passthrough
  if (data.screen) {
    const { screen, ...rest } = data;
    return { screen, params: rest };
  }

  return null;
};

// ─── Notification listeners (foreground & background tap) ────────────────────
export const notificationListener = (navigationRef) => {
  const foregroundSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log(
        "🔔 Notification received (foreground):",
        notification.request.content.title,
      );
    },
  );

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response?.notification?.request?.content?.data || {};
      console.log("👆 Notification tapped:", data);
      const target = resolveNavTarget(data);
      if (!target) return;

      // Mark as handled so cold-start won't re-navigate
      const notifId = response?.notification?.request?.identifier;
      if (notifId)
        AsyncStorage.setItem("@lastHandledNotifId", notifId).catch(() => {});

      let attempts = 0;
      const tryNavigate = () => {
        if (navigationRef?.isReady()) {
          navigationRef.navigate(target.screen, target.params);
        } else if (attempts < 50) {
          attempts++;
          setTimeout(tryNavigate, 100);
        }
      };
      tryNavigate();
    },
  );

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
};

// ─── Handle cold-start (app killed, opened via notification tap) ──────────────
export const handleInitialNotification = async (navigationRef) => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;

    // Deduplicate: skip if this notification was already handled in a previous session
    const notifId = response?.notification?.request?.identifier;
    const STORAGE_KEY = "@lastHandledNotifId";
    const lastHandled = await AsyncStorage.getItem(STORAGE_KEY);
    if (notifId && lastHandled === notifId) return;

    const data = response?.notification?.request?.content?.data || {};
    const target = resolveNavTarget(data);
    if (!target) return;

    // Mark as handled so next cold start won't re-navigate
    if (notifId) await AsyncStorage.setItem(STORAGE_KEY, notifId);

    let attempts = 0;
    const tryNavigate = () => {
      if (navigationRef?.isReady()) {
        navigationRef.navigate(target.screen, target.params);
      } else if (attempts < 50) {
        attempts++;
        setTimeout(tryNavigate, 100);
      }
    };
    tryNavigate();
  } catch (e) {
    console.error("handleInitialNotification error:", e);
  }
};

export const setBackgroundMessageHandler = () => {
  console.log("Background messages handled by expo-notifications");
};
