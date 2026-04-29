import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { brandColors } from "../theme/brand";

/**
 * طبقة زجاجية: Blur + تدرج شفاف بألوان العلامة (لشريط التنقل، الرؤوس، البطاقات).
 */
const GlassBlurLayer = ({
  dark = true,
  style,
  intensity = Platform.OS === "ios" ? 48 : 90,
}) => (
  <View style={[styles.wrap, style]} pointerEvents="none">
    <BlurView
      intensity={intensity}
      tint={dark ? "dark" : "light"}
      style={StyleSheet.absoluteFill}
    />
    <LinearGradient
      colors={
        dark
          ? [
              brandColors.magentaSoft,
              brandColors.violetSoft,
              brandColors.cyanSoft,
              "rgba(20, 16, 34, 0.92)",
            ]
          : [
              "rgba(255, 240, 250, 0.65)",
              "rgba(243, 236, 255, 0.55)",
              "rgba(232, 250, 255, 0.5)",
              "rgba(255, 255, 255, 0.75)",
            ]
      }
      locations={dark ? [0, 0.35, 0.65, 1] : [0, 0.33, 0.66, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, styles.tint]}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  tint: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
});

export default GlassBlurLayer;
