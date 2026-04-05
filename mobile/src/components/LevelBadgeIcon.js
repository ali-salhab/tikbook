/**
 * LevelBadgeIcon — renders a level badge.
 * Accepts either a dynamic imageUrl/lottieUrl (from backend)
 * or falls back to static level number display.
 *
 * @param {number}  level    - level number
 * @param {string}  size     - "small" | "medium" | "large"
 * @param {string}  imageUrl - remote image URL (optional)
 * @param {string}  color    - accent color for fallback badge
 */
import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, View, Text } from "react-native";
import LottieView from "lottie-react-native";
import { ms, fs } from "../utils/responsive";
import { fetchLottieJson, getCachedLottieJson } from "../live/services/lottieCache";
// Static assets for legacy numeric levels 1-3
const LEVEL_IMAGES = {
  1: require("../../assets/images/level1.png"),
  2: require("../../assets/images/level2.png"),
  3: require("../../assets/images/level3.png"),
};

const SIZE_MAP = {
  small:  ms(44),
  medium: ms(64),
  large:  ms(100),
};

const LevelBadgeIcon = ({ level = 1, size = "small", imageUrl, lottieUrl, color = "#FFD700" }) => {
  const dim = SIZE_MAP[size] || SIZE_MAP.small;
  const lottieRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [lottieJson, setLottieJson] = useState(() => (lottieUrl && !imageUrl ? getCachedLottieJson(lottieUrl) : null));

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [imageUrl]);

  useEffect(() => {
    let active = true;
    if (!lottieUrl || imageUrl) { setLottieJson(null); return; }
    const cached = getCachedLottieJson(lottieUrl);
    if (cached) { setLottieJson(cached); return; }
    fetchLottieJson(lottieUrl)
      .then((data) => { if (active && data) setLottieJson(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [lottieUrl, imageUrl]);

  // Numeric fallback (shown while loading or when nothing set)
  const Fallback = (
    <View style={[styles.fallback, { width: dim, height: dim, borderColor: color, backgroundColor: color + "22" }]}>
      <Text style={[styles.fallbackText, { color, fontSize: dim * 0.38 }]}>{level}</Text>
    </View>
  );

  // 1. Remote image URL (priority)
  if (imageUrl && !imgError) {
    return (
      <View style={{ width: dim, height: dim }}>
        {!imgLoaded && Fallback}
        <Image
          source={{ uri: imageUrl }}
          style={[styles.img, { width: dim, height: dim, position: imgLoaded ? "relative" : "absolute", opacity: imgLoaded ? 1 : 0 }]}
          resizeMode="contain"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  // 2. Remote Lottie (when no image)
  if (lottieJson) {
    return (
      <LottieView
        ref={lottieRef}
        source={lottieJson}
        autoPlay
        loop
        style={{ width: dim, height: dim }}
      />
    );
  }

  // 3. Static asset for levels 1-3
  const staticSource = LEVEL_IMAGES[level];
  if (staticSource) {
    return (
      <Image
        source={staticSource}
        style={[styles.img, { width: dim, height: dim * 0.46 }]}
        resizeMode="contain"
      />
    );
  }

  // 4. Numeric fallback
  return Fallback;
};

const styles = StyleSheet.create({
  img: {},
  fallback: {
    borderRadius: ms(12),
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    fontWeight: "900",
  },
});

export default LevelBadgeIcon;
