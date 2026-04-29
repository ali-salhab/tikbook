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
  Easing,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useUpload } from "../context/UploadContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PILL_W = 160;
const PILL_H = 54;

const FloatingUploadOverlay = () => {
  const { uploading, uploadProgress, uploadDone, error, resetUpload } =
    useUpload();
  const insets = useSafeAreaInsets();

  const scale = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const position = useRef(
    new Animated.ValueXY({ x: SCREEN_WIDTH - PILL_W - 16, y: insets.top + 60 }),
  ).current;

  const [showDetails, setShowDetails] = useState(false);
  const glowLoop = useRef(null);

  const startGlow = () => {
    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
      ]),
    );
    glowLoop.current.start();
  };

  const stopGlow = () => {
    glowLoop.current?.stop();
    glowPulse.setValue(1);
  };

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
        const finalX =
          gesture.moveX < SCREEN_WIDTH / 2 ? 16 : SCREEN_WIDTH - PILL_W - 16;
        Animated.spring(position, {
          toValue: {
            x: finalX,
            y: Math.max(
              insets.top + 10,
              Math.min(SCREEN_HEIGHT - 100, gesture.moveY - 28),
            ),
          },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (uploading || uploadDone || error) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 40,
      }).start();
    }
    if (uploading) {
      startGlow();
    } else {
      stopGlow();
    }
    if (uploadDone) {
      // Auto-show details on success so the user sees the success message
      setShowDetails(true);
      setTimeout(() => {
        setShowDetails(false);
        Animated.timing(scale, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => resetUpload());
      }, 5000);
    }
    if (!uploading && !uploadDone && !error) {
      Animated.timing(scale, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [uploading, uploadDone, error]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: uploadProgress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress]);

  const dismiss = () => {
    setShowDetails(false);
    Animated.timing(scale, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => resetUpload());
  };

  const borderColor = error ? "#FF4444" : uploadDone ? "#25D366" : "#FF3366";
  const shadowColor = error ? "#FF4444" : uploadDone ? "#25D366" : "#FF3366";

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            shadowColor,
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { scale },
            ],
          },
        ]}
        pointerEvents={uploading || uploadDone || error ? "auto" : "none"}
      >
        {/* Animated glow ring */}
        <Animated.View
          style={[styles.glowRing, { borderColor, opacity: glowPulse }]}
          pointerEvents="none"
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowDetails(true)}
          style={styles.pillTouch}
        >
          <BlurView intensity={80} tint="dark" style={styles.blurPill}>
            <View style={[styles.pillBorder, { borderColor }]} />
            <View style={styles.pillContent}>
              {uploadDone ? (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#25D366" />
                  <Text style={[styles.pillLabel, { color: "#25D366" }]}>
                    تم النشر!
                  </Text>
                </>
              ) : error ? (
                <>
                  <Ionicons name="alert-circle" size={22} color="#FF4444" />
                  <Text style={[styles.pillLabel, { color: "#FF4444" }]}>
                    فشل الرفع
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color="#FFF"
                  />
                  <View style={styles.progressArea}>
                    <Text style={styles.pillLabel}>
                      {Math.round(uploadProgress)}%
                    </Text>
                    <View style={styles.miniBar}>
                      <Animated.View
                        style={[
                          styles.miniBarFill,
                          { width: progressBarWidth },
                        ]}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => (error ? dismiss() : setShowDetails(false))}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => (error ? dismiss() : setShowDetails(false))}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تفاصيل الرفع</Text>
              <TouchableOpacity
                onPress={() => (error ? dismiss() : setShowDetails(false))}
              >
                <Ionicons name="close-circle" size={28} color="#555" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {uploadDone ? (
                <>
                  <View style={[styles.iconCircle, { borderColor: "#25D366" }]}>
                    <Ionicons
                      name="checkmark-circle"
                      size={52}
                      color="#25D366"
                    />
                  </View>
                  <Text style={styles.modalBigTitle}>تم النشر بنجاح!</Text>
                  <Text style={styles.modalSub}>
                    سيكون المحتوى متاحاً قريباً
                  </Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={dismiss}>
                    <Text style={styles.closeBtnText}>حسناً</Text>
                  </TouchableOpacity>
                </>
              ) : error ? (
                <>
                  <View style={[styles.iconCircle, { borderColor: "#FF4444" }]}>
                    <Ionicons name="alert-circle" size={52} color="#FF4444" />
                  </View>
                  <Text style={styles.modalBigTitle}>فشل الرفع</Text>
                  <Text style={styles.modalSub}>
                    {error?.response?.data?.message ||
                      error?.message ||
                      "حدث خطأ أثناء رفع الفيديو"}
                  </Text>
                  <TouchableOpacity style={styles.closeBtn} onPress={dismiss}>
                    <Text style={styles.closeBtnText}>إغلاق</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={[styles.iconCircle, { borderColor: "#FF3366" }]}>
                    <Text style={styles.bigPercent}>
                      {Math.round(uploadProgress)}%
                    </Text>
                  </View>
                  <Text style={styles.modalBigTitle}>جارٍ الرفع...</Text>
                  <Text style={styles.modalSub}>يرجى عدم إغلاق التطبيق</Text>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        { width: progressBarWidth },
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
    width: PILL_W,
    height: PILL_H,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
  },
  glowRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: PILL_H / 2 + 4,
    borderWidth: 2,
  },
  pillTouch: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    overflow: "hidden",
  },
  blurPill: {
    flex: 1,
    borderRadius: PILL_H / 2,
    overflow: "hidden",
  },
  pillBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PILL_H / 2,
    borderWidth: 1.5,
  },
  pillContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  pillLabel: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  progressArea: { flex: 1, gap: 3 },
  miniBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    backgroundColor: "#FF3366",
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    width: "82%",
    maxWidth: 380,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  modalBody: { padding: 30, alignItems: "center" },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  bigPercent: { color: "#FF3366", fontSize: 22, fontWeight: "800" },
  modalBigTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 3,
    marginTop: 20,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FF3366",
    borderRadius: 3,
  },
  closeBtn: {
    marginTop: 24,
    backgroundColor: "#FF3366",
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 25,
  },
  closeBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});

export default FloatingUploadOverlay;
