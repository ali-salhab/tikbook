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
    },
    profileImage: {
      width: size * 0.7,
      height: size * 0.7,
      borderRadius: (size * 0.7) / 2,
      backgroundColor: "#ddd",
    },
    badgeFrame: {
      position: "absolute",
      width: size,
      height: size,
      top: 0,
      left: 0,
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

      {/* Badge Frame Overlay */}
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
