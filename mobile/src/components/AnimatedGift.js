import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Image,
} from "react-native";
import LottieView from "lottie-react-native";
import { Video, Audio } from "expo-av";
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
  const soundRef = useRef(null);

  // Shared values — used by both render paths
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const translateY = useSharedValue(60);

  // ── Sound + entrance animation ─────────────────────────────────────
  useEffect(() => {
    if (gift.soundUrl) {
      (async () => {
        try {
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
          const { sound } = await Audio.Sound.createAsync(
            { uri: gift.soundUrl },
            { shouldPlay: true, volume: 1.0 },
          );
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s) => {
            if (s.didJustFinish) sound.unloadAsync().catch(() => {});
          });
        } catch (_) {}
      })();
    }

    const isVideo =
      gift.animationType === "video" || gift.animationType === "webm_alpha";
    const duration = (gift.duration || 3) * 1000;

    if (isVideo) {
      opacity.value = withTiming(1, { duration: 350 });
      // Fallback timer — exits if onPlaybackStatusUpdate never fires
      const timer = setTimeout(exitAnimation, duration + 500);
      return () => {
        clearTimeout(timer);
        if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      };
    } else {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withSpring(isCombo ? 1.8 : 1.2, { damping: 8, stiffness: 100 }),
        withSpring(isCombo ? 1.5 : 1.0, { damping: 10, stiffness: 100 }),
      );
      translateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      const timer = setTimeout(exitAnimation, duration);
      return () => {
        clearTimeout(timer);
        if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
      };
    }
  }, []);

  // ── Exit ──────────────────────────────────────────────────────────────────
  const exitAnimation = () => {
    opacity.value = withTiming(0, { duration: 450 }, (done) => {
      if (done && onComplete) runOnJS(onComplete)();
    });
    scale.value = withTiming(0.4, { duration: 450 });
    translateY.value = withTiming(-80, {
      duration: 450,
      easing: Easing.in(Easing.cubic),
    });
  };

  // ── Animated styles ───────────────────────────────────────────────────────
  // Full-screen video: ONLY opacity (no scale/translate so the video isn't distorted)
  const videoFadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Standard gifts: full entrance animation
  const standardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  // ── WEBM alpha: rendered as full-screen video (transparent in future rebuild) ──
  if (gift.animationType === "webm_alpha") {
    const videoUri = gift.webmUrl || gift.animationUrl;
    return (
      <Animated.View
        style={[styles.webmAlphaContainer, videoFadeStyle]}
        pointerEvents="none"
      >
        <Video
          source={{ uri: videoUri }}
          style={styles.webmAlphaVideo}
          resizeMode="contain"
          shouldPlay
          isLooping={false}
          isMuted={!!gift.soundUrl}
          volume={gift.soundUrl ? 0 : 1.0}
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish) exitAnimation();
          }}
        />
        <View style={styles.tiktokSender} pointerEvents="none">
          <Image
            source={{ uri: sender?.profileImage || sender?.avatar }}
            style={styles.tiktokAvatar}
          />
          <View>
            <Text style={styles.tiktokUsername}>{sender?.username}</Text>
            <Text style={styles.tiktokGiftLabel}>🎁 {gift.nameAr || gift.name}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // ── Full-screen opaque video (TikTok dark-overlay style) ─────────────────
  if (gift.animationType === "video") {
    const videoUri = gift.webmUrl || gift.animationUrl;
    return (
      <Animated.View
        style={[styles.tiktokContainer, videoFadeStyle]}
        pointerEvents="none"
      >
        {/* Video fills every pixel — no black bars */}
        <Video
          source={{ uri: videoUri }}
          style={styles.tiktokVideo}
          resizeMode="cover"
          shouldPlay
          isLooping={false}
          isMuted={!!gift.soundUrl}
          volume={gift.soundUrl ? 0 : 1.0}
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish) exitAnimation();
          }}
        />

        {/* Dark gradient at bottom so sender info is readable */}
        <View style={styles.tiktokGradient} />

        {/* Sender info — bottom left like TikTok */}
        <View style={styles.tiktokSender}>
          <Image
            source={{ uri: sender?.profileImage || sender?.avatar }}
            style={styles.tiktokAvatar}
          />
          <View>
            <Text style={styles.tiktokUsername}>{sender?.username}</Text>
            <Text style={styles.tiktokGiftLabel}>
              🎁 {gift.nameAr || gift.name}
            </Text>
          </View>
        </View>

        {/* Gift name — top center */}
        <View style={styles.tiktokTitleWrap}>
          <Text style={styles.tiktokTitle}>{gift.nameAr || gift.name}</Text>
        </View>
      </Animated.View>
    );
  }

  // ── STANDARD GIFT (lottie / gif / small video) ────────────────────────────
  const renderAnimation = () => {
    if (gift.animationType === "lottie") {
      // Support both legacy `animationUrl` and new `lottieUrl` field
      const lottieSource = gift.animationUrl || gift.lottieUrl;
      return (
        <LottieView
          ref={lottieRef}
          source={{ uri: lottieSource }}
          autoPlay
          loop={false}
          style={[styles.lottieAnim, gift.fullScreen && styles.largeAnim]}
        />
      );
    }
    if (gift.animationType === "gif") {
      return (
        <Image
          source={{ uri: gift.animationUrl }}
          style={[styles.gifAnim, gift.fullScreen && styles.largeAnim]}
          resizeMode="contain"
        />
      );
    }
    if (gift.animationType === "video" || gift.animationType === "webm_alpha") {
      const videoUri = gift.webmUrl || gift.animationUrl;
      return (
        <Video
          source={{ uri: videoUri }}
          style={[styles.smallVideoAnim, { backgroundColor: "transparent" }]}
          resizeMode="contain"
          shouldPlay
          isLooping={false}
          isMuted={!!gift.soundUrl}
          volume={gift.soundUrl ? 0 : 1.0}
          onPlaybackStatusUpdate={(s) => {
            if (s.didJustFinish) exitAnimation();
          }}
        />
      );
    }
    // Fallback: if gift has lottieUrl with no explicit animationType
    if (gift.lottieUrl) {
      return (
        <LottieView
          ref={lottieRef}
          source={{ uri: gift.lottieUrl }}
          autoPlay
          loop={false}
          style={[styles.lottieAnim, gift.fullScreen && styles.largeAnim]}
        />
      );
    }
    return null;
  };

  return (
    <View style={styles.standardContainer} pointerEvents="none">
      <Animated.View style={[styles.card, standardStyle]}>
        {/* Glow halo */}
        <View style={styles.glow} />

        {/* Animation */}
        {renderAnimation()}

        {/* Sender row */}
        <View style={styles.senderRow}>
          <Image
            source={{ uri: sender?.profileImage || sender?.avatar }}
            style={styles.senderAvatar}
          />
          <View>
            <Text style={styles.senderName} numberOfLines={1}>
              {sender?.username}
            </Text>
            <Text style={styles.giftName}>{gift.nameAr || gift.name}</Text>
          </View>
        </View>

        {/* Combo badge */}
        {isCombo && (
          <View style={styles.comboBadge}>
            <Text style={styles.comboText}>🔥 COMBO!</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

/* ─────────────────────────── styles ─────────────────────────── */
const styles = StyleSheet.create({
  // ── WebM alpha: full-screen, fully transparent ─────────────────────────
  webmAlphaContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  webmAlphaVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },

  // ── TikTok half-screen (middle → bottom) ──────────────────────────────
  tiktokContainer: {
    position: "absolute",
    top: height * 0.45,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  tiktokVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tiktokGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
    background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
    // React Native doesn't support CSS gradients — use backgroundColor trick:
    backgroundColor: "transparent",
  },
  tiktokSender: {
    position: "absolute",
    bottom: 24,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  tiktokAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  tiktokUsername: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  tiktokGiftLabel: {
    color: "#FFD700",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  tiktokTitleWrap: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  tiktokTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },

  // ── Standard gift ────────────────────────────────────────────────────────
  standardContainer: {
    position: "absolute",
    top: height * 0.12,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  card: {
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FFD700",
    opacity: 0.18,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 50,
    elevation: 20,
  },
  lottieAnim: { width: 260, height: 260 },
  gifAnim: { width: 260, height: 260 },
  smallVideoAnim: { width: 260, height: 260, borderRadius: 12 },
  largeAnim: { width: width * 0.85, height: height * 0.5 },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
  },
  senderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  senderName: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 160,
  },
  giftName: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  comboBadge: {
    position: "absolute",
    top: -28,
    right: -16,
    backgroundColor: "#FF4444",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    transform: [{ rotate: "12deg" }],
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  comboText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default AnimatedGift;
