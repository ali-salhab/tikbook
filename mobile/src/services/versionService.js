import axios from "axios";
import Constants from "expo-constants";
import { Alert } from "react-native";

class VersionService {
  async checkVersion(baseUrl) {
    try {
      const response = await axios.get(`${baseUrl}/version`);
      const { currentVersion, minVersion, updateRequired, updateUrl, message } =
        response.data;

      // Get app version from app.json
      const appVersion = Constants.expoConfig?.version || "1.0.0";

      console.log("App version:", appVersion);
      console.log("Server version:", currentVersion);
      console.log("Min version:", minVersion);

      // Compare versions
      if (this.isVersionLower(appVersion, minVersion)) {
        return {
          needsUpdate: true,
          isForced: updateRequired,
          message: message || "يتوفر تحديث جديد",
          updateUrl,
        };
      }

      return {
        needsUpdate: false,
        isForced: false,
        message: message || "أنت تستخدم أحدث إصدار",
      };
    } catch (error) {
      // Silently fail - version check is optional
      console.log("Version check skipped (backend not reachable)");
      return {
        needsUpdate: false,
        isForced: false,
        message: "",
      };
    }
  }

  isVersionLower(current, minimum) {
    const currentParts = current.split(".").map(Number);
    const minimumParts = minimum.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      if (currentParts[i] < minimumParts[i]) {
        return true;
      }
      if (currentParts[i] > minimumParts[i]) {
        return false;
      }
    }
    return false;
  }

  showUpdateDialog(message, isForced, updateUrl) {
    const buttons = isForced
      ? [{ text: "تحديث الآن", onPress: () => this.openUpdateUrl(updateUrl) }]
      : [
          { text: "لاحقاً", style: "cancel" },
          { text: "تحديث", onPress: () => this.openUpdateUrl(updateUrl) },
        ];

    Alert.alert("تحديث متوفر", message, buttons, {
      cancelable: !isForced,
    });
  }

  openUpdateUrl(url) {
    if (url) {
      // In production, this would open the app store
      console.log("Opening update URL:", url);
      // Linking.openURL(url);
    }
  }
}

export default new VersionService();
