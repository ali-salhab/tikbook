import React, { useEffect, useRef } from "react";
import { View, Image, Animated, StyleSheet, Easing } from "react-native";

const AnimatedLogo = ({ size = 100, style }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Bouncing animation
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -20,
          duration: 500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]),
    );

    // Scaling pulse animation
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    // Gentle rotation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    // Start all animations
    bounceAnimation.start();
    scaleAnimation.start();
    rotateAnimation.start();

    // Cleanup
    return () => {
      bounceAnimation.stop();
      scaleAnimation.stop();
      rotateAnimation.stop();
    };
  }, [bounceAnim, scaleAnim, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { translateY: bounceAnim },
              { scale: scaleAnim },
              { rotate: rotate },
            ],
          },
        ]}
      >
        <Image
          source={require("../../assets/logo.jpg")}
          style={[styles.logo, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    borderRadius: 20,
  },
});

export default AnimatedLogo;
