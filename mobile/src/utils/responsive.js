/**
 * Responsive utility functions for React Native
 * Base design dimensions: 375 x 812 (iPhone 8 / typical mid-size phone)
 */
import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base design dimensions
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale a width-based value proportionally
 * @param {number} size - size on base 375px wide design
 */
export const wp = (size) => (SCREEN_WIDTH / BASE_WIDTH) * size;

/**
 * Scale a height-based value proportionally
 * @param {number} size - size on base 812px tall design
 */
export const hp = (size) => (SCREEN_HEIGHT / BASE_HEIGHT) * size;

/**
 * Moderate scale - width-based but with a damping factor to avoid too-large values on big screens
 * @param {number} size - base size
 * @param {number} factor - damping (0 = constant, 1 = fully proportional). Default 0.5
 */
export const ms = (size, factor = 0.5) => size + (wp(size) - size) * factor;

/**
 * Scale a font size. Caps scaling to avoid excessively large text on tablets.
 * @param {number} size - base font size
 */
export const fs = (size) => {
  const scaled = ms(size, 0.4);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

export const SCREEN = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
