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
  const iconSize = isSmall ? 18 : 24;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: iconSize, height: iconSize, borderRadius: iconSize / 2 }}
        resizeMode="contain"
      />
    );
  }

  const fontSize = isSmall ? 9 : 11;
  const paddingH = isSmall ? 4 : 7;
  const paddingV = isSmall ? 1 : 3;

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
