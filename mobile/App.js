import React, { useEffect } from "react";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  requestUserPermission,
  notificationListener,
} from "./src/services/notificationService";
import messaging from "@react-native-firebase/messaging";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      // Set a hard timeout of 8 seconds to ensure the app always becomes ready
      const timeoutId = setTimeout(() => {
        console.log("⚠️ App preparation timed out, forcing ready state...");
        setAppIsReady(true);
      }, 8000);

      try {
        // Request Notification Permission (Don't await it if it hangs)
        requestUserPermission().catch(e => console.warn("Permission request failed:", e));

        // Pre-load fonts, make any API calls you need to do here
        // No async operations needed at this time.
      } catch (e) {
        console.warn("Failed to initialize app resources:", e);
      } finally {
        clearTimeout(timeoutId);
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    // Setup notification listeners (foreground, background, quit)
    const unsubscribe = notificationListener();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  useEffect(() => {
    messaging()
      .getToken()
      .then((token) => console.log("MY FCM TOKEN:", token));
  }, []);

  if (!appIsReady) {
    return null;
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
