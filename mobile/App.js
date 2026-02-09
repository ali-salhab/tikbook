import React, { useEffect } from "react";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  requestUserPermission,
  notificationListener,
} from "./src/services/notificationService";
import { useNetInfo } from "@react-native-community/netinfo";
import { View, Text, StyleSheet, Platform } from "react-native";
import Constants from "expo-constants";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const netInfo = useNetInfo();

  useEffect(() => {
    async function prepare() {
      // Set a hard timeout of 8 seconds to ensure the app always becomes ready
      const timeoutId = setTimeout(() => {
        console.log("⚠️ App preparation timed out, forcing ready state...");
        setAppIsReady(true);
      }, 8000);

      try {
        // Request Notification Permission (Don't await it if it hangs)
        requestUserPermission().catch((e) =>
          console.warn("Permission request failed:", e),
        );

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
    // Notification listener is now handled in AppNavigator with access to navigation setup
    // But we can keep requestUserPermission here for early permission request
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {netInfo.isConnected === false && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>لا يوجد اتصال بالانترنت</Text>
          </View>
        )}
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: "#FE2C55",
    paddingVertical: 10,
    paddingTop:
      Platform.OS === "android" ? (Constants.statusBarHeight || 0) + 10 : 40,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
  },
  offlineText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});
