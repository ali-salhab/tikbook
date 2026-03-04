import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUpload } from "../context/UploadContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FloatingUploadOverlay = () => {
  const { uploading, uploadProgress, uploadDone, error } = useUpload();
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0)).current;

  // Pop in / out
  useEffect(() => {
    if (uploading || uploadDone || error) {
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
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          left: 16,
          transform: [{ scale }],
        },
      ]}
      pointerEvents={uploading ? "auto" : "none"}
    >
      <View
        style={[
          styles.circle,
          uploadDone && styles.circleSuccess,
          error && styles.circleError,
        ]}
      >
        {/* Background Vertical Fill */}
        {!uploadDone && !error && (
          <View style={[styles.fill, { height: `${currentProgress}%` }]} />
        )}

        {/* Content */}
        {uploadDone ? (
          <Ionicons name="checkmark" size={28} color="#FFF" />
        ) : error ? (
          <Ionicons name="alert" size={28} color="#FFF" />
        ) : (
          <Text style={styles.percentageText}>{currentProgress}%</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.6)", // Dark semi-transparent
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
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
    backgroundColor: "rgba(254, 44, 85, 0.9)", // Brand color
  },
  percentageText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    zIndex: 2,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default FloatingUploadOverlay;
