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
      lightColor: "#FF3366",
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

// ─── Normalize FCM / Expo payloads (custom fields arrive as strings) ───────────
const normalizePayload = (raw = {}) => {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null || v === "") continue;
    if (typeof v === "object") continue;
    out[String(k)] = typeof v === "string" ? v : String(v);
  }
  return out;
};

// Maps push `data` to root Stack / nested targets (see AppNavigator).
const resolveNavTarget = (raw = {}) => {
  const data = normalizePayload(raw);
  const type = data.type || "";
  const screen = data.screen || "";
  const videoId = data.videoId || "";
  const userId = data.userId || "";
  const roomId = data.roomId || "";
  const badgeId = data.badgeId || "";

  if (screen === "LiveStreamsListScreen") {
    return { screen: "LiveStreamsList", params: {} };
  }

  if (
    screen === "LiveRoom" ||
    type === "live_room_started" ||
    type === "moderator_assigned"
  ) {
    if (roomId)
      return { screen: "LiveRoom", params: { roomId: String(roomId) } };
    return {
      screen: "MainTabs",
      params: { screen: "LiveRooms", params: {} },
    };
  }

  if (screen === "Chat") {
    if (data.chatId)
      return { screen: "Chat", params: { chatId: data.chatId } };
    if (userId) {
      return {
        screen: "Chat",
        params: { userId, username: "", profileImage: null },
      };
    }
    return null;
  }

  // Any notify tied to a video → Home feed scrolled to clip
  if (videoId) {
    return {
      screen: "MainTabs",
      params: {
        screen: "Home",
        params: { videoId },
      },
    };
  }

  if (
    screen === "UserProfile" ||
    type === "follow" ||
    (userId &&
      /^interaction/i.test(type) &&
      !videoId &&
      !roomId)
  ) {
    if (userId) return { screen: "UserProfile", params: { userId } };
  }

  if (type === "live_stream") {
    return { screen: "LiveStreamsList", params: {} };
  }

  if (screen === "MyBadges" || type === "badge_gift") {
    return badgeId
      ? { screen: "MyBadges", params: { badgeId } }
      : { screen: "MyBadges", params: {} };
  }

  if (screen === "VerificationRequest" || type === "verification_rejected") {
    return { screen: "VerificationRequest", params: {} };
  }

  if (screen === "Profile" || type === "verification_approved") {
    return {
      screen: "MainTabs",
      params: { screen: "Profile", params: {} },
    };
  }

  if (
    type === "vip_assigned" ||
    type === "vip_removed" ||
    type === "vip_auto_upgrade"
  ) {
    return { screen: "VipProfile", params: {} };
  }

  if (screen === "Wallet") {
    return { screen: "Wallet", params: {} };
  }

  if (
    screen === "SystemNotifications" ||
    type === "admin" ||
    type === "admin_broadcast" ||
    type === "system" ||
    type === "announcement" ||
    type === "promo" ||
    type === "update"
  ) {
    return { screen: "SystemNotifications", params: {} };
  }

  if (screen === "Activity") {
    if (userId) return { screen: "UserProfile", params: { userId } };
    return { screen: "Activity", params: {} };
  }

  const listOnlyTypes = [
    "like",
    "comment",
    "follow",
    "mention",
    "new_video",
  ];
  if (listOnlyTypes.includes(type)) {
    if (userId && (type === "follow" || type === "mention")) {
      return { screen: "UserProfile", params: { userId } };
    }
    return { screen: "Activity", params: {} };
  }

  if (screen) {
    const { screen: scr, ...rest } = data;
    return { screen: scr, params: rest };
  }

  return { screen: "Activity", params: {} };
};

const NAV_MAX_ATTEMPTS = 110;
const NAV_RETRY_MS = 120;

function scheduleNavigateToTarget(navigationRef, target) {
  let attempts = 0;
  const run = () => {
    if (!target?.screen) return;
    if (navigationRef?.isReady?.()) {
      try {
        navigationRef.navigate(target.screen, target.params);
      } catch (e) {
        console.warn("Push navigation failed:", e?.message || e);
      }
      return;
    }
    if (attempts < NAV_MAX_ATTEMPTS) {
      attempts += 1;
      setTimeout(run, NAV_RETRY_MS);
    }
  };
  run();
}

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

      const notifId = response?.notification?.request?.identifier;
      if (notifId)
        AsyncStorage.setItem("@lastHandledNotifId", notifId).catch(() => {});

      scheduleNavigateToTarget(navigationRef, target);
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

    if (notifId) await AsyncStorage.setItem(STORAGE_KEY, notifId);

    scheduleNavigateToTarget(navigationRef, target);
  } catch (e) {
    console.error("handleInitialNotification error:", e);
  }
};

export const setBackgroundMessageHandler = () => {
  console.log("Background messages handled by expo-notifications");
};
