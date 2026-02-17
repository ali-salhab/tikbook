import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Text, Image } from "react-native";
import LottieView from "lottie-react-native";
import { Video } from "expo-av";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const AnimatedGift = ({ gift, sender, onComplete, isCombo = false }) => {
  const lottieRef = useRef(null);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const translateY = useSharedValue(50);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // 3D Entrance animation with rotation
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSequence(
      withSpring(isCombo ? 1.8 : 1.2, {
        damping: 8,
        stiffness: 100,
      }),
      withSpring(isCombo ? 1.5 : 1, {
        damping: 10,
        stiffness: 100,
      }),
    );
    translateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    // 3D Rotation for depth effect
    rotateX.value = withSequence(
      withTiming(15, { duration: 300 }),
      withTiming(-5, { duration: 200 }),
      withTiming(0, { duration: 200 }),
    );
    rotateY.value = withSequence(
      withTiming(15, { duration: 300 }),
      withTiming(-15, { duration: 400 }),
      withTiming(0, { duration: 300 }),
    );

    // Pulsing glow effect
    glowOpacity.value = withSequence(
      withTiming(0.8, { duration: 400 }),
      withTiming(0.3, { duration: 600 }),
      withTiming(0.6, { duration: 400 }),
    );

    // Auto complete after gift duration
    const timer = setTimeout(
      () => {
        exitAnimation();
      },
      (gift.duration || 3) * 1000,
    );

    return () => clearTimeout(timer);
  }, []);

  const exitAnimation = () => {
    opacity.value = withTiming(0, { duration: 500 }, (finished) => {
      if (finished && onComplete) {
        runOnJS(onComplete)();
      }
    });
    scale.value = withTiming(0.3, { duration: 500 });
    translateY.value = withTiming(-100, {
      duration: 500,
      easing: Easing.in(Easing.cubic),
    });
    rotateY.value = withTiming(180, { duration: 500 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { perspective: 1000 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const renderAnimation = () => {
    if (gift.animationType === "lottie") {
      return (
        <LottieView
          ref={lottieRef}
          source={{ uri: gift.animationUrl }}
          autoPlay
          loop={false}
          style={[
            styles.lottieAnimation,
            gift.fullScreen && styles.fullScreenAnimation,
          ]}
        />
      );
    } else if (gift.animationType === "gif") {
      return (
        <Image
          source={{ uri: gift.animationUrl }}
          style={[
            styles.gifAnimation,
            gift.fullScreen && styles.fullScreenAnimation,
          ]}
          resizeMode="contain"
        />
      );
    } else if (gift.animationType === "video") {
      return (
        <Video
          source={{ uri: gift.animationUrl }}
          style={[
            styles.videoAnimation,
            gift.fullScreen && styles.fullScreenAnimation,
          ]}
          resizeMode="contain"
          shouldPlay
          isLooping={false}
          isMuted={false}
          volume={0.8}
        />
      );
    }
    return null;
  };

  return (
    <View
      style={[styles.container, gift.fullScreen && styles.fullScreenContainer]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.animationWrapper,
          animatedStyle,
          gift.fullScreen && styles.fullScreenWrapper,
        ]}
      >
        {/* Glow effect behind animation */}
        <Animated.View style={[styles.glowBackground, glowStyle]} />

        {renderAnimation()}

        {/* Sender Info */}
        <View style={styles.senderInfo}>
          <Image
            source={{ uri: sender.profileImage || sender.avatar }}
            style={styles.senderAvatar}
          />
          <View style={styles.senderTextContainer}>
            <Text style={styles.senderName} numberOfLines={1}>
              {sender.username}
            </Text>
            <View style={styles.giftNameRow}>
              <Text style={styles.giftIcon}>{gift.thumbnailUrl}</Text>
              <Text style={styles.giftName}>{gift.nameAr || gift.name}</Text>
            </View>
          </View>
        </View>

        {/* Combo Badge with enhanced animation */}
        {isCombo && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboText}>🔥 COMBO! 🔥</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: height * 0.15,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  fullScreenContainer: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
  },
  animationWrapper: {
    alignItems: "center",
  },
  fullScreenWrapper: {
    width: width,
    height: height,
    justifyContent: "center",
  },
  lottieAnimation: {
    width: 300,
    height: 300,
  },
  gifAnimation: {
    width: 300,
    height: 300,
  },
  videoAnimation: {
    width: 300,
    height: 300,
    borderRadius: 12,
    backgroundColor: "#000",
  },
  fullScreenAnimation: {
    width: width * 0.9,
    height: height * 0.6,
  },
  glowBackground: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  senderInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 12,
    gap: 10,
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  senderTextContainer: {
    gap: 2,
  },
  senderName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    maxWidth: 150,
  },
  giftNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  giftIcon: {
    fontSize: 16,
  },
  giftName: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "600",
  },
  comboBadge: {
    position: "absolute",
    top: -30,
    right: -20,
    backgroundColor: "#FF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    transform: [{ rotate: "15deg" }],
    shadowColor: "#FF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  comboText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default AnimatedGift;
