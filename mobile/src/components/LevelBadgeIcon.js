/**
 * LevelBadgeIcon — renders the level badge PNG image for levels 1, 2, 3.
 * Uses the PNG files from assets/images/level1.png, level2.png, level3.png.
 *
 * @param {number} level - 1, 2, or 3
 * @param {string} size  - "small" | "medium" | "large"
 */
import React from "react";
import { Image, StyleSheet } from "react-native";
import { ms } from "../utils/responsive";

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

const LevelBadgeIcon = ({ level = 1, size = "small" }) => {
  const source = LEVEL_IMAGES[level] || LEVEL_IMAGES[1];
  const dim = SIZE_MAP[size] || SIZE_MAP.small;

  return (
    <Image
      source={source}
      style={[styles.img, { width: dim, height: dim * 0.46 }]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  img: {
    // transparent PNG — no background needed
  },
});

export default LevelBadgeIcon;
