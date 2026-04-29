import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet } from "react-native";
import { getWindowDimensions } from "../utils/responsive";

const { width } = getWindowDimensions();

// Emoji sets per type
const PARTICLE_CHARS = {
  hearts:   ["❤️", "🩷", "💛", "💜", "🧡", "💙"],
  roses:    ["🌹", "🌸", "🌺", "💐"],
  stars:    ["⭐", "🌟", "✨", "💫"],
  sparkles: ["✨", "💫", "⭐", "🌟"],
  confetti: ["🎊", "🎉", "🎈", "🎀"],
};

const getChars = (type, customChar) => {
  if (type === "custom") return [customChar || "❤️"];
  return PARTICLE_CHARS[type] || PARTICLE_CHARS.hearts;
};

// Single floating particle using RN Animated (no Reanimated needed here)
const FlyingParticle = ({ char, startX, startY, size }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const tY = useRef(new Animated.Value(0)).current;
  const tX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const driftX = (Math.random() - 0.5) * 80;
    const driftY = 100 + Math.random() * 80;
    const duration = 900 + Math.random() * 500;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: duration * 0.55, delay: duration * 0.3, useNativeDriver: true }),
      ]),
      Animated.timing(tY, { toValue: -driftY, duration, useNativeDriver: true }),
      Animated.timing(tX, { toValue: driftX, duration, useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, damping: 7 }),
        Animated.timing(scale, { toValue: 0.5, duration: duration * 0.55, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          fontSize: size,
          left: startX,
          top: startY,
          opacity,
          transform: [{ translateY: tY }, { translateX: tX }, { scale }],
        },
      ]}
    >
      {char}
    </Animated.Text>
  );
};

/**
 * CommentParticles
 *
 * Renders a burst of flying emoji around the comment area when a gift is sent.
 *
 * Props:
 *   gift          – gift object with commentParticleType / commentParticleChar / commentParticleCount
 *   anchorY       – Y position (bottom of screen, particles fly up from here)
 *   onDone        – callback after all particles have finished
 */
const CommentParticles = ({ gift, anchorY, onDone }) => {
  const type  = gift?.commentParticleType || "hearts";
  const count = Math.min(30, Math.max(0, gift?.commentParticleCount ?? 8));
  const chars = getChars(type, gift?.commentParticleChar);

  useEffect(() => {
    if (!count || type === "none") {
      onDone?.();
      return;
    }
    const t = setTimeout(() => onDone?.(), 1800);
    return () => clearTimeout(t);
  }, []);

  if (!count || type === "none") return null;

  const particles = Array.from({ length: count }, (_, i) => ({
    key: i,
    char: chars[i % chars.length],
    startX: 16 + Math.random() * (width * 0.72),
    startY: anchorY ?? 0,
    size: 14 + Math.floor(Math.random() * 12),
  }));

  return (
    <>
      {particles.map(({ key, ...p }) => (
        <FlyingParticle key={key} {...p} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    zIndex: 999,
  },
});

export default CommentParticles;
