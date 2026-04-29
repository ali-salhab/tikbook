import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context/AppContext";
import { screenBackgroundGradient } from "../theme/brand";

/**
 * ضعها كأول عنصر داخل الحاوية ذات flex:1 (مثل SafeAreaView).
 *
 *   <SafeAreaView style={{ flex: 1 }}>
 *     <GradientBackground />
 *     ...
 *   </SafeAreaView>
 */
const GradientBackground = () => {
  const { theme } = useApp();
  const spec =
    theme.id === "dark"
      ? screenBackgroundGradient.dark
      : screenBackgroundGradient.light;

  return (
    <LinearGradient
      colors={spec.colors}
      locations={spec.locations}
      start={spec.start}
      end={spec.end}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
};

export default GradientBackground;
