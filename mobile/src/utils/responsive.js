/**
 * Responsive utility functions for React Native
 * Base design dimensions: 375 x 812 (iPhone 8 / typical mid-size phone)
 */
import { Dimensions, PixelRatio } from "react-native";

// Base design dimensions
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Safe window size when modules load before the native runtime is fully ready
 * (avoids Hermes "Property 'width' doesn't exist" / [runtime not ready]).
 */
export function getWindowDimensions() {
  try {
    const win = Dimensions.get("window");
    if (
      win != null &&
      typeof win.width === "number" &&
      typeof win.height === "number" &&
      !Number.isNaN(win.width) &&
      !Number.isNaN(win.height)
    ) {
      return { width: win.width, height: win.height };
    }
  } catch {
    // runtime not ready
  }
  return { width: BASE_WIDTH, height: BASE_HEIGHT };
}

/**
 * Scale a width-based value proportionally
 * @param {number} size - size on base 375px wide design
 */
export const wp = (size) => {
  const { width } = getWindowDimensions();
  return (width / BASE_WIDTH) * size;
};

/**
 * Scale a height-based value proportionally
 * @param {number} size - size on base 812px tall design
 */
export const hp = (size) => {
  const { height } = getWindowDimensions();
  return (height / BASE_HEIGHT) * size;
};

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

export const SCREEN = {
  get width() {
    return getWindowDimensions().width;
  },
  get height() {
    return getWindowDimensions().height;
  },
};
