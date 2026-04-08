import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions, Text, Image } from "react-native";
import { Video, Audio } from "expo-av";
import LottieView from "lottie-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const _lottieCache = {};
const fetchLottieJson = async (url) => {
  if (!url) return null;
  if (_lottieCache[url]) return _lottieCache[url];
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    _lottieCache[url] = json;
    return json;
  } catch (_) {
    return null;
  }
};

const SPARKLE_CHARS = ["✨", "⭐", "💫", "🌟", "❤️", "🎉", "💥", "🔥"];

const Sparkle = ({ delay, x }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scaleS = useSharedValue(0.3);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
      translateY.value = withTiming(-90 - Math.random() * 50, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
      scaleS.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withTiming(0.4, { duration: 400 })
      );
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scaleS.value }],
  }));

  const char = SPARKLE_CHARS[Math.floor(x * 7) % SPARKLE_CHARS.length];

  return (
    <Animated.Text
      style={[
        { position: "absolute", left: x, bottom: 0, fontSize: 20, zIndex: 1100 },
        style,
      ]}
    >
      {char}
    </Animated.Text>
  );
};

const Sparkles = () => {
  const items = Array.from({ length: 8 }, (_, i) => ({
    key: i,
    x: 20 + ((i * 37) % 210),
    delay: i * 110,
  }));
  return (
    <View style={styles.sparkleContainer} pointerEvents="none">
      {items.map((s) => (
        <Sparkle key={s.key} x={s.x} delay={s.delay} />
      ))}
    </View>
  );
};

const SenderPill = ({ sender, gift, bottom = false }) => (
  <View style={[styles.senderRow, bottom && styles.senderRowBottom]}>
    {sender?.profileImage || sender?.avatar ? (
      <Image
        source={{ uri: sender.profileImage || sender.avatar }}
        style={styles.senderAvatar}
      />
    ) : (
      <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder]}>
        <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 14 }}>
          {(sender?.username || "?").charAt(0).toUpperCase()}
        </Text>
      </View>
    )}
    <View>
      <Text style={styles.senderName} numberOfLines={1}>
        {sender?.username || ""}
      </Text>
      <Text style={styles.giftName}>🎁 {gift.nameAr || gift.name}</Text>
    </View>
  </View>
);

const ComboBadge = () => (
  <View style={styles.comboBadge}>
    <Text style={styles.comboText}>🔥 COMBO!</Text>
  </View>
);

const AnimatedGift = ({ gift, sender, onComplete, isCombo = false }) => {
  const soundRef = useRef(null);
  const hasExited = useRef(false);
  const [lottieJson, setLottieJson] = useState(null);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const translateY = useSharedValue(80);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scaleLoop = useSharedValue(1);

  const type = gift?.animationType || "";
  const isVideo = type === "video";
  const isWebmAlpha = type === "webm_alpha";
  const isLottie =
    type === "lottie" ||
    (!isVideo && !isWebmAlpha && !!(gift.lottieUrl || "").match(/\.json$/i));

  useEffect(() => {
    if (!isLottie) return;
    const url = gift.lottieUrl || gift.animationUrl;
    fetchLottieJson(url).then((json) => {
      if (json) setLottieJson(json);
    });
  }, [isLottie, gift.lottieUrl, gift.animationUrl]);

  const playSound = async () => {
    if (!gift.soundUrl) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: gift.soundUrl },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.didJustFinish) sound.unloadAsync().catch(() => {});
      });
    } catch (_) {}
  };

  const exitAnimation = () => {
    if (hasExited.current) return;
    hasExited.current = true;
    cancelAnimation(scaleLoop);
    cancelAnimation(rotate);
    cancelAnimation(translateX);
    opacity.value = withTiming(0, { duration: 420 }, (done) => {
      if (done && onComplete) runOnJS(onComplete)();
    });
    scale.value = withTiming(0.15, { duration: 420 });
    translateY.value = withTiming(-160, {
      duration: 420,
      easing: Easing.in(Easing.cubic),
    });
  };

  useEffect(() => {
    playSound();
    const duration = (gift.duration || 3) * 1000;

    if (isVideo || isWebmAlpha) {
      opacity.value = withTiming(1, { duration: 350 });
      const fallback = setTimeout(exitAnimation, duration + 600);
      return () => {
        clearTimeout(fallback);
        soundRef.current?.unloadAsync().catch(() => {});
      };
    }

    opacity.value = withTiming(1, { duration: 220 });
    scale.value = withSequence(
      withSpring(isCombo ? 2.1 : 1.4, { damping: 5, stiffness: 180 }),
      withSpring(isCombo ? 1.7 : 1.05, { damping: 9, stiffness: 120 })
    );
    translateY.value = withSpring(0, { damping: 10, stiffness: 100 });

    const danceTimer = setTimeout(() => {
      rotate.value = withRepeat(
        withSequence(
          withTiming(9, { duration: 90, easing: Easing.linear }),
          withTiming(-9, { duration: 90, easing: Easing.linear }),
          withTiming(6, { duration: 90, easing: Easing.linear }),
          withTiming(-6, { duration: 90, easing: Easing.linear }),
          withTiming(0, { duration: 70, easing: Easing.linear }),
          withTiming(0, { duration: 220 })
        ),
        -1,
        false
      );
      translateX.value = withRepeat(
        withSequence(
          withTiming(14, { duration: 320, easing: Easing.inOut(Easing.sin) }),
          withTiming(-14, { duration: 320, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      scaleLoop.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 260 }),
          withTiming(0.93, { duration: 260 })
        ),
        -1,
        true
      );
    }, 380);

    const exitTimer = setTimeout(exitAnimation, duration);

    return () => {
      clearTimeout(danceTimer);
      clearTimeout(exitTimer);
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const videoFadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const danceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value * scaleLoop.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  if (isWebmAlpha) {
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
          onPlaybackStatusUpdate={(s) => {
            if (s.didJustFinish) exitAnimation();
          }}
        />
        <SenderPill sender={sender} gift={gift} />
      </Animated.View>
    );
  }

  if (isVideo) {
    const videoUri = gift.webmUrl || gift.animationUrl;
    return (
      <Animated.View
        style={[styles.tiktokContainer, videoFadeStyle]}
        pointerEvents="none"
      >
        <Video
          source={{ uri: videoUri }}
          style={styles.tiktokVideo}
          resizeMode="cover"
          shouldPlay
          isLooping={false}
          isMuted={!!gift.soundUrl}
          onPlaybackStatusUpdate={(s) => {
            if (s.didJustFinish) exitAnimation();
          }}
        />
        <View style={styles.tiktokGradient} />
        <SenderPill sender={sender} gift={gift} bottom />
        <View style={styles.tiktokTitleWrap}>
          <Text style={styles.tiktokTitle}>{gift.nameAr || gift.name}</Text>
        </View>
      </Animated.View>
    );
  }

  if (isLottie) {
    const lottieSize = gift.fullScreen ? width * 0.85 : 230;
    return (
      <View style={styles.standardContainer} pointerEvents="none">
        <Animated.View style={[styles.card, danceStyle]}>
          <View
            style={[
              styles.glow,
              { backgroundColor: gift.glowColor || "#A020F0" },
            ]}
          />
          {lottieJson ? (
            <LottieView
              source={lottieJson}
              autoPlay
              loop
              style={{ width: lottieSize, height: lottieSize }}
              resizeMode="contain"
            />
          ) : (
            <Image
              source={{ uri: gift.thumbnailUrl || gift.animationUrl || undefined }}
              style={{ width: lottieSize, height: lottieSize }}
              resizeMode="contain"
            />
          )}
          <SenderPill sender={sender} gift={gift} />
          {isCombo && <ComboBadge />}
        </Animated.View>
        <Sparkles />
      </View>
    );
  }

  const imgUri =
    gift.thumbnailUrl || gift.animationUrl || gift.imageUrl || gift.url;
  const imgSize = gift.fullScreen ? width * 0.88 : 230;

  return (
    <View style={styles.standardContainer} pointerEvents="none">
      <Animated.View style={[styles.card, danceStyle]}>
        <View
          style={[
            styles.glow,
            { backgroundColor: gift.glowColor || "#FFD700" },
          ]}
        />
        <Image
          source={{ uri: imgUri }}
          style={{ width: imgSize, height: imgSize }}
          resizeMode="contain"
        />
        <SenderPill sender={sender} gift={gift} />
        {isCombo && <ComboBadge />}
      </Animated.View>
      <Sparkles />
    </View>
  );
};

const styles = StyleSheet.create({
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
  tiktokContainer: {
    position: "absolute",
    top: height * 0.42,
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
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  tiktokTitleWrap: {
    position: "absolute",
    top: 16,
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
  standardContainer: {
    position: "absolute",
    top: height * 0.1,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1500,
  },
  card: {
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.22,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 24,
  },
  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    backgroundColor: "rgba(0,0,0,0.76)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  senderRowBottom: {
    position: "absolute",
    bottom: 24,
    left: 16,
    marginTop: 0,
  },
  senderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  senderAvatarPlaceholder: {
    backgroundColor: "rgba(160,32,240,0.5)",
    justifyContent: "center",
    alignItems: "center",
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
  sparkleContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    width: 250,
    height: 130,
    overflow: "visible",
  },
});

export default AnimatedGift;
