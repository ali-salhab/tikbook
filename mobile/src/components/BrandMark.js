import React from "react";
import { Image, StyleSheet } from "react-native";
import { brandIconSource } from "../theme/brand";

/**
 * شعار التطبيق الموحّد (نفس ملف أيقونة المتجر عند التحديث).
 */
const BrandMark = ({ size = 100, style, resizeMode = "contain", circular = true }) => (
  <Image
    source={brandIconSource}
    style={[
      styles.mark,
      circular && styles.markRound,
      { width: size, height: size },
      style,
    ]}
    resizeMode={resizeMode}
    accessibilityLabel="TikBook"
  />
);

const styles = StyleSheet.create({
  mark: {},
  markRound: {
    borderRadius: 999,
  },
});

export default BrandMark;
