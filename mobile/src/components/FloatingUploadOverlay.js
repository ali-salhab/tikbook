import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUpload } from "../context/UploadContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FloatingUploadOverlay = () => {
  const { uploading, uploadProgress, uploadDone, error } = useUpload();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0)).current;
  const position = useRef(
    new Animated.ValueXY({ x: 16, y: insets.top + 60 }),
  ).current;
  const [showDetails, setShowDetails] = useState(false);

  // PanResponder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        position.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gesture) => {
        position.flattenOffset();

        // Snap to edges
        const finalX =
          gesture.moveX < SCREEN_WIDTH / 2 ? 16 : SCREEN_WIDTH - 76;

        Animated.spring(position, {
          toValue: {
            x: finalX,
            y: Math.max(
              insets.top + 10,
              Math.min(SCREEN_HEIGHT - 100, gesture.moveY - 30),
            ),
          },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    }),
  ).current;

  // Pop in / out with auto-hide on completion
  useEffect(() => {
    if (uploading) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 40,
      }).start();
    } else if (uploadDone) {
      // Show success for 2 seconds, then hide
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 40,
      }).start();

      setTimeout(() => {
        Animated.timing(scale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 2000);
    } else if (error) {
      // Show error
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 40,
      }).start();
    } else {
      Animated.timing(scale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [uploading, uploadDone, error]);

  const currentProgress = Math.round(uploadProgress);

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { scale },
            ],
          },
        ]}
        pointerEvents={uploading || uploadDone || error ? "auto" : "none"}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowDetails(true)}
          style={[
            styles.circle,
            uploadDone && styles.circleSuccess,
            error && styles.circleError,
          ]}
        >
          {/* Background Progress Fill */}
          {!uploadDone && !error && (
            <View style={[styles.fill, { height: `${currentProgress}%` }]} />
          )}

          {/* Content */}
          {uploadDone ? (
            <Ionicons name="checkmark-circle" size={32} color="#FFF" />
          ) : error ? (
            <Ionicons name="alert-circle" size={32} color="#FFF" />
          ) : (
            <View style={styles.progressContent}>
              <Ionicons name="cloud-upload-outline" size={24} color="#FFF" />
              <Text style={styles.percentageText}>{currentProgress}%</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetails(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل الرفع</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name="close-circle" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsContainer}>
              {uploadDone ? (
                <>
                  <View style={styles.successIcon}>
                    <Ionicons
                      name="checkmark-circle"
                      size={64}
                      color="#4CAF50"
                    />
                  </View>
                  <Text style={styles.detailsTitle}>تم الرفع بنجاح!</Text>
                  <Text style={styles.detailsSubtitle}>
                    تم رفع الفيديو الخاص بك وسيكون متاحاً قريباً
                  </Text>
                </>
              ) : error ? (
                <>
                  <View style={styles.errorIcon}>
                    <Ionicons name="alert-circle" size={64} color="#F44336" />
                  </View>
                  <Text style={styles.detailsTitle}>فشل الرفع</Text>
                  <Text style={styles.detailsSubtitle}>
                    {error?.response?.data?.message ||
                      error?.message ||
                      "حدث خطأ أثناء رفع الفيديو"}
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => setShowDetails(false)}
                  >
                    <Text style={styles.retryButtonText}>إغلاق</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressCircleText}>
                      {currentProgress}%
                    </Text>
                  </View>
                  <Text style={styles.detailsTitle}>جارِ الرفع...</Text>
                  <Text style={styles.detailsSubtitle}>
                    يرجى الانتظار حتى يكتمل رفع الفيديو
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${currentProgress}%` },
                      ]}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  circleSuccess: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  circleError: {
    backgroundColor: "#F44336",
    borderColor: "#F44336",
  },
  fill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(254, 44, 85, 0.9)",
  },
  progressContent: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  percentageText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 11,
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    width: "85%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  detailsContainer: {
    padding: 30,
    alignItems: "center",
  },
  successIcon: {
    marginBottom: 20,
  },
  errorIcon: {
    marginBottom: 20,
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  progressCircleText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FE2C55",
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
    textAlign: "center",
  },
  detailsSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginTop: 20,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FE2C55",
    borderRadius: 3,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#FE2C55",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default FloatingUploadOverlay;
