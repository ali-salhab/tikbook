import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context/AppContext";

/**
 * Drop this as the first child of any screen container (SafeAreaView / View with flex:1).
 * It fills the parent absolutely with the app brand gradient.
 *
 *   <SafeAreaView style={{ flex: 1 }}>
 *     <GradientBackground />
 *     // ...rest of screen
 *   </SafeAreaView>
 */
const GradientBackground = () => {
  const { theme } = useApp();
  return (
    <LinearGradient
      colors={
        theme.id === "dark"
          ? ["#080614", "#0E0B1E", "#130F24"]
          : ["#EEE8F8", "#E8E0F5", "#EBF0F8"]
      }
      locations={[0, 0.55, 1]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
};

export default GradientBackground;
