import messaging from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform, Alert } from "react-native";
import axios from "axios";
import * as Notifications from "expo-notifications";

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
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
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

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log("Authorization status:", authStatus);
  }
  return enabled;
};

// Get FCM Token
export const getFCMToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// Save Token to Backend
export const saveTokenToBackend = async (userToken, fcmToken, baseUrl) => {
  if (!fcmToken || !userToken) return;
  try {
    await axios.put(
      `${baseUrl}/users/fcm-token`,
      { token: fcmToken },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    console.log("FCM Token saved to backend");
  } catch (error) {
    console.error("Error saving FCM token to backend:", error);
  }
};

// Notification Listeners
export const notificationListener = () => {
  // Assume a message-notification contains a "type" property in the data payload of the screen to open

  try {
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log(
        "Notification caused app to open from background state:",
        remoteMessage.notification
      );
      // navigation.navigate(remoteMessage.data.type);
    });

    // Check whether an initial notification is available
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log(
            "Notification caused app to open from quit state:",
            remoteMessage.notification
          );
          // setInitialRoute(remoteMessage.data.type); // e.g. "Settings"
        }
      });

    // Foreground Message Handler
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("A new FCM message arrived!", JSON.stringify(remoteMessage));

      const { title, body } = remoteMessage.notification || {};

      if (title || body) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title || "New Notification",
            body: body || "",
            data: remoteMessage.data,
          },
          trigger: null, // Show immediately
        });
      }
    });

    return unsubscribe;
  } catch (error) {
    console.log("Notification listener error:", error);
    return () => {};
  }
};

// Background Message Handler
export const setBackgroundMessageHandler = () => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log("Message handled in the background!", remoteMessage);
  });
};
