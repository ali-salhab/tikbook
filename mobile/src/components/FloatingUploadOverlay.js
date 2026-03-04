import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUpload } from "../context/UploadContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FloatingUploadOverlay = () => {
  const { uploading, uploadProgress, uploadDone } = useUpload();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(120)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Slide in / out
  useEffect(() => {
    if (uploading) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 10,
        tension: 80,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 120,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [uploading]);

  // Animate progress bar width
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: uploadProgress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [uploadProgress]);

  if (!uploading) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 70,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.card}>
        {/* Icon */}
        <View style={styles.iconBox}>
          {uploadDone ? (
            <Ionicons name="checkmark-circle" size={26} color="#4CAF50" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={26} color="#FE2C55" />
          )}
        </View>

        {/* Text + bar */}
        <View style={styles.content}>
          <Text style={styles.title}>
            {uploadDone ? "تم الرفع بنجاح ✅" : "جاري رفع المنشور..."}
          </Text>
          <View style={styles.barBg}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                    extrapolate: "clamp",
                  }),
                  backgroundColor: uploadDone ? "#4CAF50" : "#FE2C55",
                },
              ]}
            />
          </View>
          <Text style={styles.percent}>{Math.round(uploadProgress)}%</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconBox: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "right",
  },
  barBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  percent: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    textAlign: "right",
  },
});

export default FloatingUploadOverlay;
