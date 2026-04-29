import React from "react";
import { View, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { darkUi } from "../theme/brand";

const LoadingIndicator = () => {
  return (
    <View style={styles.container}>
      <LottieView
        source={require("../../assets/lottie-loader.json")}
        style={styles.lottie}
        autoPlay
        loop
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: darkUi.canvas,
  },
  lottie: {
    width: 120,
    height: 120,
  },
});

export default LoadingIndicator;
