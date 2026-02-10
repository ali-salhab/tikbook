import React from "react";
import { View, StyleSheet } from "react-native";
import AnimatedLogo from "./AnimatedLogo";

const LoadingIndicator = () => {
  return (
    <View style={styles.container}>
      <AnimatedLogo size={120} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
});

export default LoadingIndicator;
