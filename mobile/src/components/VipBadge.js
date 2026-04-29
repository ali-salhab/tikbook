import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

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

const VipBadge = ({ level, size = "small", imageUrl }) => {
  if (!level || level <= 0) return null;
  const color = VIP_COLORS[level] || "#FFD700";
  const isSmall = size === "small";
  const isMedium = size === "medium";
  const iconSize = isSmall ? 22 : isMedium ? 32 : 40;

  if (imageUrl) {
    return (
      <View
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: Math.max(4, iconSize * 0.2),
          overflow: "hidden",
          alignSelf: "center",
        }}
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="cover"
        />
      </View>
    );
  }

  const fontSize = isSmall ? 9 : isMedium ? 11 : 13;
  const paddingH = isSmall ? 4 : isMedium ? 7 : 9;
  const paddingV = isSmall ? 1 : isMedium ? 3 : 4;

  return (
    <View style={[styles.badge, { backgroundColor: color, paddingHorizontal: paddingH, paddingVertical: paddingV, borderRadius: isSmall ? 3 : 5 }]}>
      <Text style={[styles.text, { fontSize }]}>VIP{level}</Text>
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
    letterSpacing: 0.3,
  },
});

export default VipBadge;
