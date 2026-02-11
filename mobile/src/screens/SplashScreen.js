import React, { useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";

const SplashScreen = ({ navigation, onFinish }) => {
  useEffect(() => {
    // Call onFinish after a short delay
    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ActivityIndicator size="large" color="#FFFFFF" />
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
