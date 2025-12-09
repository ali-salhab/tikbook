import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../config/api";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

/**
 * VersionChecker Component
 * Checks for app updates on startup and prompts user if needed
 * - Forced updates: blocks the app until user upgrades
 * - Optional updates: allows user to skip
 */
export default function VersionChecker({ children }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [isCheckingVersion, setIsCheckingVersion] = useState(true);

  const currentAppVersion = Constants.expoConfig?.version || "1.0.0";
  const platform = "android"; // or 'ios' - can be detected via Platform.OS

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      setIsCheckingVersion(true);

      const response = await axios.get(`${BASE_URL}/versions/latest`, {
        params: {
          platform: platform,
        },
      });

      const latestVersion = response.data;

      if (
        latestVersion &&
        isNewerVersion(latestVersion.version, currentAppVersion)
      ) {
        setUpdateData(latestVersion);
        setUpdateAvailable(true);
      } else {
        setUpdateAvailable(false);
      }
    } catch (error) {
      console.log("Error checking for updates:", error.message);
      // Silently fail - don't block the app if the check fails
      setUpdateAvailable(false);
    } finally {
      setIsCheckingVersion(false);
    }
  };

  /**
   * Compare version strings (e.g., "1.2.3")
   * Returns true if newVersion > currentVersion
   */
  const isNewerVersion = (newVersion, currentVersion) => {
    const parseVersion = (v) => v.split(".").map(Number);
    const [newMajor, newMinor, newPatch] = parseVersion(newVersion);
    const [curMajor, curMinor, curPatch] = parseVersion(currentVersion);

    if (newMajor > curMajor) return true;
    if (newMajor === curMajor && newMinor > curMinor) return true;
    if (newMajor === curMajor && newMinor === curMinor && newPatch > curPatch)
      return true;

    return false;
  };

  const handleUpdate = async () => {
    if (updateData?.url) {
      try {
        await Linking.openURL(updateData.url);
      } catch (error) {
        Alert.alert(
          "Error",
          "Could not open the download link. Please try again."
        );
      }
    }
  };

  const handleSkip = () => {
    setUpdateAvailable(false);
  };

  // Show loading spinner while checking version
  if (isCheckingVersion) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FE2C55" />
        <Text style={styles.loadingText}>جاري التحقق من التحديثات...</Text>
      </View>
    );
  }

  // If no update available, render children normally
  if (!updateAvailable || !updateData) {
    return children;
  }

  // If update is FORCED, block the app
  if (updateData.priority === "force") {
    return (
      <Modal visible={true} animationType="fade" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.updateCard}>
            <Ionicons
              name="alert-circle"
              size={64}
              color="#FE2C55"
              style={styles.icon}
            />
            <Text style={styles.title}>تحديث مهم متاح</Text>
            <Text style={styles.version}>الإصدار {updateData.version}</Text>

            <Text style={styles.description}>
              {updateData.description ||
                "يجب تحديث التطبيق للمتابعة. يرجى تحديث التطبيق الآن."}
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
            >
              <Ionicons name="download" size={20} color="#FFF" />
              <Text style={styles.buttonText}>تحديث الآن</Text>
            </TouchableOpacity>

            <Text style={styles.warning}>
              يجب تحديث التطبيق للمتابعة في استخدام التطبيق
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // If update is OPTIONAL, show a prompt that can be dismissed
  return (
    <Modal
      visible={updateAvailable}
      animationType="slide"
      transparent={true}
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.updateCard}>
          <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>

          <Ionicons
            name="checkmark-circle"
            size={64}
            color="#52c41a"
            style={styles.icon}
          />

          <Text style={styles.title}>تحديث جديد متاح</Text>
          <Text style={styles.version}>الإصدار {updateData.version}</Text>

          <Text style={styles.description}>
            {updateData.description ||
              "يوجد نسخة جديدة من التطبيق. هل تريد التحديث الآن؟"}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>تخطي</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
            >
              <Ionicons name="download" size={20} color="#FFF" />
              <Text style={styles.buttonText}>تحديث</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Render children behind the modal for reference */}
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  updateCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  version: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1890ff",
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  warning: {
    fontSize: 12,
    color: "#999",
    marginTop: 16,
    fontStyle: "italic",
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  updateButton: {
    backgroundColor: "#FE2C55",
  },
  skipButton: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  skipButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "700",
  },
});
