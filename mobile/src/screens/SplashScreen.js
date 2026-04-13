import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";

const SplashScreen = ({ navigation, onFinish }) => {
  useEffect(() => {
    // Call onFinish after a short delay
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LottieView
        source={require("../../assets/lottie-loader.json")}
        style={{ width: 120, height: 120 }}
        autoPlay
        loop
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SplashScreen;
