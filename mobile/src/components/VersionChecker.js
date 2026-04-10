import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  ActivityIndicator,
  Alert,
  Platform,
  AppState,
} from "react-native";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { BASE_URL } from "../config/api";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

/**
 * VersionChecker Component
 * - Checks for updates on startup
 * - Forced updates block usage until the user installs the new APK
 * - Optional updates can be skipped
 * - Android APK downloads happen inside the app with percentage progress
 */
export default function VersionChecker({ children }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [isCheckingVersion, setIsCheckingVersion] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState("");

  const currentAppVersion =
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    "1.0.0";
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const progressPercent = useMemo(
    () => Math.max(0, Math.min(100, Math.round(downloadProgress * 100))),
    [downloadProgress],
  );

  useEffect(() => {
    checkForUpdates();

    // Re-check whenever the app comes back to the foreground
    const appStateRef = { current: AppState.currentState };
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current !== "active" && nextState === "active") {
        checkForUpdates();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const isNewerVersion = (newVersion, currentVersion) => {
    const parseVersion = (v) =>
      String(v || "0.0.0")
        .split(".")
        .map((n) => parseInt(n, 10) || 0);

    const [newMajor, newMinor, newPatch] = parseVersion(newVersion);
    const [curMajor, curMinor, curPatch] = parseVersion(currentVersion);

    if (newMajor > curMajor) return true;
    if (newMajor === curMajor && newMinor > curMinor) return true;
    if (newMajor === curMajor && newMinor === curMinor && newPatch > curPatch)
      return true;

    return false;
  };

  const checkForUpdates = async () => {
    try {
      setIsCheckingVersion(true);

      const response = await axios.get(`${BASE_URL}/versions/latest`, {
        params: { platform },
        timeout: 8000,
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
        setUpdateData(null);
      }
    } catch (error) {
      console.log("Error checking for updates:", error?.message || error);
      setUpdateAvailable(false);
      setUpdateData(null);
    } finally {
      setIsCheckingVersion(false);
    }
  };

  const openExternalLink = async () => {
    if (!updateData?.url) return;
    try {
      await Linking.openURL(updateData.url);
    } catch (error) {
      Alert.alert(
        "Error",
        "Could not open the download link. Please try again.",
      );
    }
  };

  const openDownloadedApk = async (fileUri) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await Linking.openURL(contentUri);
    } catch (error) {
      console.log("Error opening APK installer:", error?.message || error);
      await openExternalLink();
    }
  };

  const handleUpdate = async () => {
    if (!updateData?.url || isDownloading) return;

    setDownloadError("");

    const isAndroidDirectApk =
      Platform.OS === "android" && /\.apk(\?|$)/i.test(updateData.url);

    if (!isAndroidDirectApk) {
      await openExternalLink();
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const targetUri = `${FileSystem.cacheDirectory}tikbook-update-${updateData.version}.apk`;

      const downloader = FileSystem.createDownloadResumable(
        updateData.url,
        targetUri,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (totalBytesExpectedToWrite > 0) {
            setDownloadProgress(totalBytesWritten / totalBytesExpectedToWrite);
          }
        },
      );

      const result = await downloader.downloadAsync();

      if (!result?.uri) {
        throw new Error("Download finished without a file.");
      }

      setDownloadProgress(1);
      await openDownloadedApk(result.uri);
    } catch (error) {
      console.log("APK download/install error:", error);

      const message = /network|internet|timeout|host|download|connection/i.test(
        String(error?.message || ""),
      )
        ? "Network error while downloading the update. Check your internet connection and try again."
        : "Could not download or install the update. You can retry or open the link in the browser.";

      setDownloadError(message);
      Alert.alert("Update failed", message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSkip = () => {
    if (!isDownloading) {
      setUpdateAvailable(false);
    }
  };

  const renderProgress = () => {
    if (!isDownloading && !downloadError) return null;

    return (
      <View style={styles.progressSection}>
        {isDownloading ? (
          <>
            <View style={styles.progressBarTrack}>
              <View
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </>
        ) : null}

        {downloadError ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{downloadError}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderUpdateCard = (forced = false) => (
    <View style={forced ? styles.forcedUpdateCard : styles.updateCard}>
      {!forced && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleSkip}
          disabled={isDownloading}
        >
          <Ionicons name="close" size={28} color="#666" />
        </TouchableOpacity>
      )}

      <Ionicons
        name={forced ? "alert-circle" : "cloud-download"}
        size={64}
        color={forced ? "#FE2C55" : "#52c41a"}
        style={styles.icon}
      />

      <Text style={styles.title}>
        {forced ? "تحديث مهم متاح" : "تحديث جديد متاح"}
      </Text>
      <Text style={styles.version}>الإصدار {updateData?.version}</Text>

      <Text style={styles.description}>
        {updateData?.description ||
          (forced
            ? "يجب تحديث التطبيق للمتابعة. يرجى تحديث التطبيق الآن."
            : "يوجد إصدار جديد من التطبيق. يمكنك تنزيله الآن من داخل التطبيق.")}
      </Text>

      {renderProgress()}

      {forced ? (
        <>
          <TouchableOpacity
            style={styles.updateButtonForced}
            onPress={handleUpdate}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="download" size={22} color="#FFF" />
            )}
            <Text style={styles.buttonTextForced}>
              {isDownloading ? `جارٍ التنزيل ${progressPercent}%` : "تحديث الآن"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.browserButton}
            onPress={openExternalLink}
            disabled={isDownloading}
          >
            <Text style={styles.browserButtonText}>فتح الرابط في المتصفح</Text>
          </TouchableOpacity>

          <Text style={styles.warning}>يجب تحديث التطبيق للاستمرار</Text>
        </>
      ) : (
        <>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isDownloading}
            >
              <Text style={styles.skipButtonText}>تخطي</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdate}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="download" size={20} color="#FFF" />
              )}
              <Text style={styles.buttonText}>
                {isDownloading ? `${progressPercent}%` : "تحديث"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.browserButtonInline}
            onPress={openExternalLink}
            disabled={isDownloading}
          >
            <Text style={styles.browserButtonText}>فتح الرابط في المتصفح</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <>
      {children}

      <Modal
        visible={Boolean(updateAvailable && updateData)}
        animationType={updateData?.priority === "force" ? "fade" : "slide"}
        transparent={updateData?.priority !== "force"}
        onRequestClose={updateData?.priority === "force" ? undefined : handleSkip}
      >
        {updateData?.priority === "force" ? (
          <View style={styles.modalContainer}>{renderUpdateCard(true)}</View>
        ) : (
          <View style={styles.overlay}>{renderUpdateCard(false)}</View>
        )}
      </Modal>

      {isCheckingVersion && (
        <View style={styles.checkingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="#FE2C55" />
          <Text style={styles.checkingText}>Checking for updates…</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  checkingOverlay: {
    position: "absolute",
    top: 54,
    alignSelf: "center",
    backgroundColor: "rgba(17,24,39,0.86)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 9999,
  },
  checkingText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
    maxHeight: "85%",
  },
  forcedUpdateCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 34,
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginBottom: 18,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  progressSection: {
    width: "100%",
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 10,
    width: "100%",
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FE2C55",
    borderRadius: 999,
  },
  progressText: {
    marginTop: 8,
    textAlign: "center",
    color: "#111827",
    fontWeight: "700",
  },
  errorBox: {
    marginTop: 10,
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#991b1b",
    fontSize: 13,
    lineHeight: 18,
  },
  warning: {
    fontSize: 13,
    color: "#999",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  skipButton: {
    backgroundColor: "#f3f4f6",
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },
  updateButton: {
    backgroundColor: "#FE2C55",
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  updateButtonForced: {
    backgroundColor: "#FE2C55",
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonTextForced: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  browserButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  browserButtonInline: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  browserButtonText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
