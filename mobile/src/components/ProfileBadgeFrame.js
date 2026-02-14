import React from "react";
import { View, Image, StyleSheet } from "react-native";

const ProfileBadgeFrame = ({ profileImage, badgeImage, size = 100 }) => {
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
      width: size * 0.65,
      height: size * 0.65,
      borderRadius: (size * 0.65) / 2,
      backgroundColor: "#ddd",
    },
    badgeFrame: {
      position: "absolute",
      width: size * 1.1,
      height: size * 1.1,
      top: -size * 0.05,
      left: -size * 0.05,
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
