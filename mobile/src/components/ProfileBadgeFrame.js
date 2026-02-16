import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated, Easing } from "react-native";

const ProfileBadgeFrame = ({ profileImage, badgeImage, size = 100 }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (badgeImage) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [badgeImage]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    },
    profileImage: {
      width: size * 0.72,
      height: size * 0.72,
      borderRadius: (size * 0.72) / 2,
      backgroundColor: "#ddd",
    },
    badgeFrame: {
      position: "absolute",
      width: size * 1.4,
      height: size * 1.4,
      top: -size * 0.2,
      left: -size * 0.2,
    },
  });

  return (
    <View style={styles.container}>
      {/* Profile Image */}
      {profileImage ? (
        <Image
          source={{ uri: profileImage }}
          style={styles.profileImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.profileImage} />
      )}

      {/* Badge Frame Overlay - Transparent PNG */}
      {badgeImage && (
        <Animated.Image
          source={{ uri: badgeImage }}
          style={[styles.badgeFrame, { transform: [{ rotate: spin }] }]}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

export default ProfileBadgeFrame;
