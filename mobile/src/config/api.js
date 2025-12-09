// API Configuration
// Change this to your computer's local IP address when testing on a physical device
// You can find your IP address by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)

const API_CONFIGS = {
  // For Android Emulator
  ANDROID_EMULATOR: "http://10.0.2.2:5000/api",

  // For iOS Simulator
  IOS_SIMULATOR: "http://localhost:5000/api",

  // For Physical Device (Using ADB Reverse with VPN)
  // PHYSICAL_DEVICE: "http://10.228.255.240:5000/api",
  PHYSICAL_DEVICE: "http://10.228.255.240:5000/api",

  // For Production
  PRODUCTION: "https://your-production-api.com/api",
};

// Agora Configuration
export const AGORA_APP_ID = "230f860f09764dbbaf85a413912f768c"; // Replace with your App ID

// Automatically detect and use the appropriate API URL
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";

export const getApiUrl = () => {
  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === "expo";

  // Check if it's a physical device (not emulator/simulator)
  // Use expo-device for more reliable detection in dev clients
  const isDevice = Device.isDevice;

  console.log("🔍 Device Detection:");
  console.log("  - Platform:", Platform.OS);
  console.log("  - isDevice:", isDevice);
  console.log("  - isExpoGo:", isExpoGo);
  console.log("  - __DEV__:", __DEV__);

  if (__DEV__) {
    // Automatically detect if running on device or emulator
    // If isDevice is true OR undefined (sometimes happens in dev builds), assume physical device to be safe
    if (isDevice || isDevice === undefined) {
      // Physical device - use your computer's local IP
      console.log("📱 Using Physical Device API:", API_CONFIGS.PHYSICAL_DEVICE);
      return API_CONFIGS.PHYSICAL_DEVICE;
    } else if (Platform.OS === "android") {
      // Android Emulator
      console.log(
        "🤖 Using Android Emulator API:",
        API_CONFIGS.ANDROID_EMULATOR
      );
      return API_CONFIGS.ANDROID_EMULATOR;
    } else if (Platform.OS === "ios") {
      // iOS Simulator
      console.log("🍎 Using iOS Simulator API:", API_CONFIGS.IOS_SIMULATOR);
      return API_CONFIGS.IOS_SIMULATOR;
    }
    return API_CONFIGS.PHYSICAL_DEVICE;
  } else {
    // Production mode
    return API_CONFIGS.PRODUCTION;
  }
};

export const BASE_URL = getApiUrl();

export default {
  BASE_URL,
  API_CONFIGS,
  getApiUrl,
};
