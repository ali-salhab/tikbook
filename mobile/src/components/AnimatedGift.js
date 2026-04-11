import React, { useEffect, useRef, useState, useMemo } from "react";
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

// ─── Lottie JSON cache ────────────────────────────────────────────────────────
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
  } catch (_) { return null; }
};

// ─── Effect particle definitions ─────────────────────────────────────────────
const EFFECT_CHARS = {
  sparkles: ["✨","💫","⭐","🌟"],
  hearts:   ["❤️","🩷","💛","💜","🧡","💚","💙"],
  stars:    ["⭐","🌟","✨","💫","⚡"],
  confetti: ["🎊","🎉","🎈","🎀","🎁"],
  bubbles:  ["🫧","⚪","🔵","🟣","🟡"],
  roses:    ["🌹","🌸","🌺","💐","🌻"],
  fire:     ["🔥","💥","⚡","✨"],
  snow:     ["❄️","🌨","⛄","🤍","🌸"],
  none:     [],
  custom:   null, // use gift.effectCustomChar
};

const EFFECT_SIZE_MAP = { tiny: 10, small: 14, medium: 20, large: 26, huge: 34 };
const EFFECT_SPEED_MAP = { slow: 1400, medium: 850, fast: 450 };

// ─── Single floating particle ─────────────────────────────────────────────────
const Particle = ({ char, x, delay, size, speedMs }) => {
  const opacity   = useSharedValue(0);
  const tY        = useSharedValue(0);
  const tX        = useSharedValue(0);
  const sc        = useSharedValue(0.4);
  const rot       = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const driftX = (Math.random() - 0.5) * 60;
      const driftY = 90 + Math.random() * 70;
      opacity.value = withSequence(
        withTiming(1, { duration: 220 }),
        withTiming(0, { duration: speedMs * 0.55, easing: Easing.out(Easing.cubic) })
      );
      tY.value  = withTiming(-driftY, { duration: speedMs, easing: Easing.out(Easing.quad) });
      tX.value  = withTiming(driftX,  { duration: speedMs, easing: Easing.inOut(Easing.sin) });
      sc.value  = withSequence(withSpring(1.4, { damping: 7 }), withTiming(0.5, { duration: speedMs * 0.6 }));
      rot.value = withTiming((Math.random() - 0.5) * 360, { duration: speedMs, easing: Easing.linear });
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: tY.value },
      { translateX: tX.value },
      { scale: sc.value },
      { rotate: `${rot.value}deg` },
    ],
  }));

  return (
    <Animated.Text style={[{ position: "absolute", left: x, bottom: 0, fontSize: size, zIndex: 1200 }, style]}>
      {char}
    </Animated.Text>
  );
};

// ─── Particle field ───────────────────────────────────────────────────────────
const ParticleField = ({ gift }) => {
  const rawTypes    = gift.effectType;
  const effectTypes = Array.isArray(rawTypes) ? rawTypes : (rawTypes ? [rawTypes] : ["sparkles"]);
  const effectCount = Math.max(0, Math.min(30, gift.effectCount ?? 8));
  const effectSize  = EFFECT_SIZE_MAP[gift.effectSize  || "medium"] || 20;
  const speedMs     = EFFECT_SPEED_MAP[gift.effectSpeed || "medium"] || 850;

  if ((effectTypes.length === 1 && effectTypes[0] === "none") || effectCount === 0) return null;

  const chars = effectTypes.length === 1 && effectTypes[0] === "custom"
    ? [gift.effectCustomChar || "✨"]
    : [...new Set(effectTypes.flatMap(t =>
        t === "custom" ? [gift.effectCustomChar || "✨"] :
        t === "none"   ? [] :
        (EFFECT_CHARS[t] || EFFECT_CHARS.sparkles)
      ))].filter(Boolean);

  const particles = useMemo(
    () => Array.from({ length: effectCount }, (_, i) => ({
      key: i,
      char: chars.length ? chars[i % chars.length] : "✨",
      x: 10 + ((i * 43) % 220),
      delay: i * (effectCount > 12 ? 80 : 120),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectCount, JSON.stringify(effectTypes), gift.effectCustomChar]
  );

  return (
    <View style={styles.particleContainer} pointerEvents="none">
      {particles.map((p) => (
        <Particle key={p.key} char={p.char} x={p.x} delay={p.delay} size={effectSize} speedMs={speedMs} />
      ))}
    </View>
  );
};

// ─── Sender pill ─────────────────────────────────────────────────────────────
const SenderPill = ({ sender, gift, bottom = false }) => (
  <View style={[styles.senderRow, bottom && styles.senderRowBottom]}>
    {sender?.profileImage || sender?.avatar ? (
      <Image source={{ uri: sender.profileImage || sender.avatar }} style={styles.senderAvatar} />
    ) : (
      <View style={[styles.senderAvatar, styles.senderAvatarPlaceholder]}>
        <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 14 }}>
          {(sender?.username || "?").charAt(0).toUpperCase()}
        </Text>
      </View>
    )}
    <View>
      <Text style={styles.senderName} numberOfLines={1}>{sender?.username || ""}</Text>
      <Text style={styles.giftName}>🎁 {gift.nameAr || gift.name}</Text>
    </View>
  </View>
);

const ComboBadge = () => (
  <View style={styles.comboBadge}><Text style={styles.comboText}>🔥 COMBO!</Text></View>
);

// ─── Entry animation builder ──────────────────────────────────────────────────
const buildEntryAnimation = (scale, translateY, rotate, entryEffect, isCombo) => {
  const big = isCombo ? 2.1 : 1.4;
  const settle = isCombo ? 1.7 : 1.05;
  switch (entryEffect) {
    case "zoom":
      scale.value = withSequence(withTiming(big * 1.1, { duration: 500, easing: Easing.out(Easing.back(3)) }), withSpring(settle, { damping: 8 }));
      translateY.value = withSpring(0, { damping: 8, stiffness: 90 });
      break;
    case "slide":
      scale.value = withSpring(settle, { damping: 10 });
      translateY.value = withSequence(withTiming(-30, { duration: 55 }), withSpring(0, { damping: 8, stiffness: 80 }));
      break;
    case "flip":
      rotate.value = withSequence(withTiming(180, { duration: 350 }), withTiming(0, { duration: 350 }));
      scale.value = withSpring(settle, { damping: 8 });
      translateY.value = withSpring(0, { damping: 10 });
      break;
    case "rubber":
      scale.value = withSequence(
        withTiming(big * 1.3, { duration: 280 }),
        withTiming(settle * 0.85, { duration: 170 }),
        withTiming(big * 1.1, { duration: 140 }),
        withSpring(settle, { damping: 10 })
      );
      translateY.value = withSpring(0, { damping: 10 });
      break;
    default: // pop
      scale.value = withSequence(withSpring(big, { damping: 5, stiffness: 130 }), withSpring(settle, { damping: 9, stiffness: 90 }));
      translateY.value = withSpring(0, { damping: 10, stiffness: 80 });
  }
};

// ─── Dance animation builder ──────────────────────────────────────────────────
const buildDanceAnimation = (rotate, translateX, scaleLoop, danceStyle) => {
  switch (danceStyle) {
    case "bounce":
      scaleLoop.value = withRepeat(withSequence(withTiming(1.22, { duration: 220 }), withTiming(0.9, { duration: 220 })), -1, true);
      break;
    case "spin":
      rotate.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
      break;
    case "float":
      translateX.value = withRepeat(withSequence(withTiming(10, { duration: 600, easing: Easing.inOut(Easing.sin) }), withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.sin) })), -1, true);
      scaleLoop.value = withRepeat(withSequence(withTiming(1.06, { duration: 500 }), withTiming(0.96, { duration: 500 })), -1, true);
      break;
    case "pulse":
      scaleLoop.value = withRepeat(withSequence(withTiming(1.3, { duration: 300 }), withTiming(0.9, { duration: 300 })), -1, true);
      break;
    case "none":
      break;
    default: // wiggle
      rotate.value = withRepeat(withSequence(
        withTiming(9,  { duration: 90, easing: Easing.linear }),
        withTiming(-9, { duration: 90, easing: Easing.linear }),
        withTiming(6,  { duration: 90, easing: Easing.linear }),
        withTiming(-6, { duration: 90, easing: Easing.linear }),
        withTiming(0,  { duration: 70, easing: Easing.linear }),
        withTiming(0,  { duration: 200 }),
      ), -1, false);
      translateX.value = withRepeat(withSequence(
        withTiming(14,  { duration: 320, easing: Easing.inOut(Easing.sin) }),
        withTiming(-14, { duration: 320, easing: Easing.inOut(Easing.sin) }),
      ), -1, true);
      scaleLoop.value = withRepeat(withSequence(withTiming(1.18, { duration: 260 }), withTiming(0.93, { duration: 260 })), -1, true);
  }
};

// ─── Main AnimatedGift ────────────────────────────────────────────────────────
const AnimatedGift = ({ gift, sender, onComplete, isCombo = false }) => {
  const soundRef  = useRef(null);
  const hasExited = useRef(false);
  const [lottieJson, setLottieJson] = useState(null);

  const opacity    = useSharedValue(0);
  const scale      = useSharedValue(0.3);
  const translateY = useSharedValue(80);
  const translateX = useSharedValue(0);
  const rotate     = useSharedValue(0);
  const scaleLoop  = useSharedValue(1);

  const type        = gift?.animationType || "";
  const isVideo     = type === "video";
  const isWebmAlpha = type === "webm_alpha";
  const isPng       = type === "png";

  // Detect if the URL is actually an image (not a Lottie JSON)
  const animUrl = gift?.animationUrl || "";
  const animIsImage = /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(animUrl);

  // Only treat as lottie if typed as lottie AND the animationUrl is actually a JSON, not an image
  const isLottie = !isPng && !isVideo && !isWebmAlpha && (
    type === "lottie" || type === "" || !type
  ) && !animIsImage && (
    !!(gift.lottieUrl || "").match(/\.json($|\?)/i) ||
    !!(animUrl).match(/\.json($|\?)/i) ||
    type === "lottie"
  );

  // Show as image for: png type, any image URL regardless of type, or when lottie detection failed
  const showAsImage = isPng || animIsImage ||
    (!isVideo && !isWebmAlpha && !isLottie &&
      !!(gift.pngUrl || gift.thumbnailUrl || gift.animationUrl));

  console.log("[AnimatedGift]", JSON.stringify({
    name: gift?.name, type, isPng, isLottie, isVideo, isWebmAlpha, showAsImage, animIsImage,
    pngUrl: gift?.pngUrl, thumbnailUrl: gift?.thumbnailUrl, animationUrl: gift?.animationUrl
  }));

  const danceStyle  = gift.danceStyle  || "wiggle";
  const entryEffect = gift.entryEffect || "pop";
  const glowColor   = gift.glowColor   || "#FFD700";
  const glowOpacity = gift.glowOpacity ?? 0.25;

  useEffect(() => {
    if (!isLottie) return;
    const url = gift.lottieUrl || gift.animationUrl;
    fetchLottieJson(url).then((json) => { if (json) setLottieJson(json); });
  }, [isLottie, gift.lottieUrl, gift.animationUrl]);

  const playSound = async () => {
    if (!gift.soundUrl) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: gift.soundUrl }, { shouldPlay: true, volume: 1.0 });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => { if (s.didJustFinish) sound.unloadAsync().catch(() => {}); });
    } catch (_) {}
  };

  const exitAnimation = () => {
    if (hasExited.current) return;
    hasExited.current = true;
    cancelAnimation(scaleLoop);
    cancelAnimation(rotate);
    cancelAnimation(translateX);
    opacity.value    = withTiming(0, { duration: 620 }, (done) => { if (done && onComplete) runOnJS(onComplete)(); });
    scale.value      = withTiming(0.15, { duration: 620 });
    translateY.value = withTiming(-220, { duration: 620, easing: Easing.in(Easing.cubic) });
  };

  useEffect(() => {
    playSound();
    const duration = (gift.duration || 4) * 1000;

    if (isVideo || isWebmAlpha) {
      opacity.value = withTiming(1, { duration: 350 });
      const fallback = setTimeout(exitAnimation, duration + 600);
      return () => { clearTimeout(fallback); soundRef.current?.unloadAsync().catch(() => {}); };
    }

    opacity.value = withTiming(1, { duration: 200 });
    buildEntryAnimation(scale, translateY, rotate, entryEffect, isCombo);

    const danceTimer = setTimeout(() => buildDanceAnimation(rotate, translateX, scaleLoop, danceStyle), 380);
    const exitTimer  = setTimeout(exitAnimation, duration);

    return () => {
      clearTimeout(danceTimer);
      clearTimeout(exitTimer);
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const videoFadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const danceStyleAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value * scaleLoop.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // ── WebM alpha ───────────────────────────────────────────────────────────────
  if (isWebmAlpha) {
    return (
      <Animated.View style={[styles.webmAlphaContainer, videoFadeStyle]} pointerEvents="none">
        <Video source={{ uri: gift.webmUrl || gift.animationUrl }} style={styles.webmAlphaVideo}
          resizeMode="contain" shouldPlay isLooping={false} isMuted={!!gift.soundUrl}
          onPlaybackStatusUpdate={(s) => { if (s.didJustFinish) exitAnimation(); }} />
        <SenderPill sender={sender} gift={gift} />
      </Animated.View>
    );
  }

  // ── Full-screen video ────────────────────────────────────────────────────────
  if (isVideo) {
    return (
      <Animated.View style={[styles.tiktokContainer, videoFadeStyle]} pointerEvents="none">
        <Video source={{ uri: gift.webmUrl || gift.animationUrl }} style={styles.tiktokVideo}
          resizeMode="cover" shouldPlay isLooping={false} isMuted={!!gift.soundUrl}
          onPlaybackStatusUpdate={(s) => { if (s.didJustFinish) exitAnimation(); }} />
        <View style={styles.tiktokGradient} />
        <SenderPill sender={sender} gift={gift} bottom />
        <View style={styles.tiktokTitleWrap}>
          <Text style={styles.tiktokTitle}>{gift.nameAr || gift.name}</Text>
        </View>
      </Animated.View>
    );
  }

  // ── Lottie ───────────────────────────────────────────────────────────────────
  if (isLottie) {
    const sz = gift.fullScreen ? width * 0.85 : 230;
    const lottieSource = lottieJson
      ? lottieJson
      : (gift.lottieUrl || gift.animationUrl)
        ? { uri: gift.lottieUrl || gift.animationUrl }
        : null;
    return (
      <View style={styles.standardContainer} pointerEvents="none">
        <Animated.View style={[styles.card, danceStyleAnim]}>
          <View style={[styles.glow, { shadowColor: glowColor, shadowOpacity: Math.min(glowOpacity * 2.5 + 0.3, 0.95) }]} />
          {lottieSource
            ? <LottieView source={lottieSource} autoPlay loop style={{ width: sz, height: sz }} resizeMode="contain" />
            : <Image source={{ uri: gift.thumbnailUrl || gift.pngUrl || gift.animationUrl || undefined }} style={{ width: sz, height: sz }} resizeMode="contain" />
          }
          <SenderPill sender={sender} gift={gift} />
          {isCombo && <ComboBadge />}
        </Animated.View>
        <ParticleField gift={gift} />
      </View>
    );
  }

  // ── PNG / image (TikTok dance + admin-configured effects) ────────────────────
  const imgUri = gift.pngUrl || gift.thumbnailUrl || (animIsImage ? animUrl : null) || null;
  const imgSize = gift.fullScreen ? width * 0.88 : 230;

  if (!showAsImage) return null;

  return (
    <View style={styles.standardContainer} pointerEvents="none">
      <Animated.View style={[styles.card, danceStyleAnim]}>
        <View style={[styles.glow, { shadowColor: glowColor, shadowOpacity: Math.min(glowOpacity * 2.5 + 0.3, 0.95) }]} />
        <Image
          source={{ uri: imgUri }}
          style={{ width: imgSize, height: imgSize }}
          resizeMode="contain"
          onError={() => {}}
        />
        <SenderPill sender={sender} gift={gift} />
        {isCombo && <ComboBadge />}
      </Animated.View>
      <ParticleField gift={gift} />
    </View>
  );
};

const styles = StyleSheet.create({
  webmAlphaContainer: { position: "absolute", top: height * 0.38, left: 0, right: 0, bottom: 0, zIndex: 2000, backgroundColor: "transparent", alignItems: "center", justifyContent: "center" },
  webmAlphaVideo:     { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent" },
  tiktokContainer:    { position: "absolute", top: height * 0.42, left: 0, right: 0, bottom: 0, zIndex: 2000, backgroundColor: "transparent", overflow: "hidden" },
  tiktokVideo:        { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  tiktokGradient:     { position: "absolute", bottom: 0, left: 0, right: 0, height: height * 0.35, backgroundColor: "rgba(0,0,0,0.38)" },
  tiktokTitleWrap:    { position: "absolute", top: 16, left: 0, right: 0, alignItems: "center" },
  tiktokTitle:        { color: "#FFF", fontSize: 28, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.9)", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 8, letterSpacing: 1 },
  standardContainer:  { position: "absolute", top: height * 0.32, left: 0, right: 0, alignItems: "center", zIndex: 1500 },
  card:               { alignItems: "center" },
  glow:               { position: "absolute", width: 290, height: 290, borderRadius: 145, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 65, elevation: 24 },
  senderRow:          { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, backgroundColor: "rgba(0,0,0,0.76)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  senderRowBottom:    { position: "absolute", bottom: 24, left: 16, marginTop: 0 },
  senderAvatar:       { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "#FFD700" },
  senderAvatarPlaceholder: { backgroundColor: "rgba(160,32,240,0.5)", justifyContent: "center", alignItems: "center" },
  senderName:         { color: "#FFF", fontSize: 14, fontWeight: "700", maxWidth: 160 },
  giftName:           { color: "#FFD700", fontSize: 12, fontWeight: "600", marginTop: 2 },
  comboBadge:         { position: "absolute", top: -28, right: -16, backgroundColor: "#FF4444", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, transform: [{ rotate: "12deg" }], borderWidth: 2, borderColor: "#FFD700" },
  comboText:          { color: "#FFF", fontSize: 14, fontWeight: "800" },
  particleContainer:  { position: "absolute", bottom: 60, left: 0, width: 260, height: 150, overflow: "visible" },
});

export default AnimatedGift;
