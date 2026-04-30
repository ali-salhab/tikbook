import React from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";

const VIP_COLORS = {
  1:  "#8B4513",
  2:  "#C0C0C0",
  3:  "#FFD700",
  4:  "#9B59B6",
  5:  "#E67E22",
  6:  "#8E44AD",
  7:  "#C0392B",
  8:  "#E74C3C",
  9:  "#1ABC9C",
  10: "#3498DB",
  11: "#34495E",
  12: "#16A085",
  13: "#F39C12",
  14: "#D35400",
  15: "#FFD700",
};

// CDN badge art is usually a wide strip ("VIP12"). A square + resizeMode cover
// crops the first letter; contain + enough width fixes "IP1" instead of "VIP1".
const imageDims = (sizeKey) => {
  if (sizeKey === "small") return { w: 42, h: 22 };
  if (sizeKey === "medium") return { w: 76, h: 34 };
  return { w: 112, h: 42 }; // large — live room host row
};

const VipBadge = ({ level, size = "small", imageUrl }) => {
  if (!level || level <= 0) return null;
  const color = VIP_COLORS[level] || "#FFD700";
  const sizeKey =
    size === "large" || size === "medium" || size === "small" ? size : "small";

  if (imageUrl) {
    const { w, h } = imageDims(sizeKey);
    return (
      <View
        style={{
          width: w,
          height: h,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: w, height: h }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const isSmall = sizeKey === "small";
  const isMedium = sizeKey === "medium";
  const fontSize = isSmall ? 9 : isMedium ? 11 : 14;
  const paddingH = isSmall ? 5 : isMedium ? 8 : 12;
  const paddingV = isSmall ? 2 : isMedium ? 3 : 4;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius: isSmall ? 3 : isMedium ? 5 : 6,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize,
            ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
          },
        ]}
      >
        VIP{level}
      </Text>
    </View>
  );
};

export const getVipColor = (level) => VIP_COLORS[level] || "#FFD700";

const styles = StyleSheet.create({
  badge: {
    alignSelf: "center",
  },
  text: {
    color: "#FFF",
    fontWeight: "bold",
    letterSpacing: 0,
  },
});

export default VipBadge;
