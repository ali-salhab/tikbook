import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated } from "react-native"; // Removed Easing, animation not desired for frame typically

const ProfileBadgeFrame = ({ profileImage, badgeImage, size = 100 }) => {
  // Styles based on size
  const imageSize = size;
  const badgeSize = size * 1.35; // Frame is typically slightly larger than avatar

  const styles = StyleSheet.create({
    container: {
      width: badgeSize, // Container fits the badge
      height: badgeSize,
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
    },
    profileImage: {
      width: imageSize,
      height: imageSize,
      borderRadius: imageSize / 2,
      backgroundColor: "#ddd",
      position: "absolute", // Center it
    },
    badgeFrame: {
      position: "absolute",
      width: badgeSize,
      height: badgeSize,
      zIndex: 1, // On top
    },
  });

  return (
    <View style={styles.container}>
      {/* Profile Image - Centered and Circular */}
      {profileImage ? (
        <Image
          source={{ uri: profileImage }}
          style={styles.profileImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.profileImage} />
      )}

      {/* Badge/Frame Overlay - Static Image */}
      {badgeImage && (
        <Image
          source={{ uri: badgeImage }}
          style={styles.badgeFrame}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

export default ProfileBadgeFrame;
