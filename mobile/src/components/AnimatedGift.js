import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Text, Image } from "react-native";
import LottieView from "lottie-react-native";
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

  useEffect(() => {
    // Entrance animation
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(isCombo ? 1.5 : 1, {
      damping: 10,
      stiffness: 100,
    });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });

    // Auto complete after gift duration
    const timer = setTimeout(() => {
      exitAnimation();
    }, (gift.duration || 3) * 1000);

    return () => clearTimeout(timer);
  }, []);

  const exitAnimation = () => {
    opacity.value = withTiming(
      0,
      { duration: 500 },
      (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      }
    );
    scale.value = withTiming(0.5, { duration: 500 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
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
    }
    return null;
  };

  return (
    <View
      style={[
        styles.container,
        gift.fullScreen && styles.fullScreenContainer,
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.animationWrapper,
          animatedStyle,
          gift.fullScreen && styles.fullScreenWrapper,
        ]}
      >
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

        {/* Combo Badge */}
        {isCombo && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboText}>COMBO!</Text>
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
  fullScreenAnimation: {
    width: width * 0.9,
    height: height * 0.6,
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
    top: -20,
    right: -20,
    backgroundColor: "#FF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    transform: [{ rotate: "15deg" }],
  },
  comboText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default AnimatedGift;
