import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import BrandMark from "../components/BrandMark";
import { brandGradient } from "../theme/brand";

const SplashScreen = ({ navigation, onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={brandGradient.colors}
      locations={brandGradient.locations}
      start={brandGradient.start}
      end={brandGradient.end}
      style={styles.container}
    >
      <StatusBar style="light" />
      <BrandMark size={88} style={styles.logo} />
      <LottieView
        source={require("../../assets/lottie-loader.json")}
        style={styles.loader}
        autoPlay
        loop
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    marginBottom: 16,
  },
  loader: {
    width: 120,
    height: 120,
  },
});

export default SplashScreen;
