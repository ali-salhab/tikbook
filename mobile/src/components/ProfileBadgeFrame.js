import React, { useEffect, useRef, useState } from "react";
import { View, Image, Text, Animated } from "react-native";
import LottieView from "lottie-react-native";

const NUM_SPARKS = 8;

// Mix of star/sparkle unicode glyphs — different shapes each time
const GLYPHS = ["✦", "✧", "✸", "✹", "⋆", "✺", "★", "✩"];

function randomSpark(radius) {
  const angle = Math.random() * 2 * Math.PI;
  const r     = radius * (0.78 + Math.random() * 0.44);
  const fontSize = 6 + Math.random() * 10;
  const glyph    = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  const rotation = Math.random() * 60 - 30; // slight tilt for variety
  return { x: r * Math.cos(angle), y: r * Math.sin(angle), fontSize, glyph, rotation };
}

/** A single golden sparkle glyph — appears, optionally pulses, then fades and jumps elsewhere */
const Spark = ({ radius }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.6)).current;
  const [spark, setSpark] = useState(() => randomSpark(radius));
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    const runCycle = () => {
      if (!alive.current) return;
      const holdMs  = 150 + Math.random() * 350;
      const fadeMs  = 400 + Math.random() * 600;
      const pauseMs = 1200 + Math.random() * 4000;

      Animated.sequence([
        // pop in
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1,   duration: 100, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 1,   duration: 100, useNativeDriver: true }),
        ]),
        // hold
        Animated.timing(opacity, { toValue: 0.85, duration: holdMs, useNativeDriver: true }),
        // fade out + shrink
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0,   duration: fadeMs, useNativeDriver: true }),
          Animated.timing(scale,   { toValue: 0.4, duration: fadeMs, useNativeDriver: true }),
        ]),
        Animated.delay(pauseMs),
      ]).start(({ finished }) => {
        if (finished && alive.current) {
          setSpark(randomSpark(radius));
          scale.setValue(0.6);
          runCycle();
        }
      });
    };

    const t = setTimeout(runCycle, Math.random() * 5500);
    return () => {
      alive.current = false;
      clearTimeout(t);
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, []);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        fontSize: spark.fontSize,
        color: "#FFE566",
        opacity,
        zIndex: 3,
        textShadowColor: "#FFD700",
        textShadowRadius: spark.fontSize * 1.2,
        textShadowOffset: { width: 0, height: 0 },
        transform: [
          { translateX: spark.x - spark.fontSize * 0.45 },
          { translateY: spark.y - spark.fontSize * 0.45 },
          { rotate: `${spark.rotation}deg` },
          { scale },
        ],
      }}
    >
      {spark.glyph}
    </Animated.Text>
  );
};

const ProfileBadgeFrame = ({ profileImage, badgeImage, size = 100, showSparks = false }) => {
  const imageSize = size;
  const badgeSize = size * 1.35;
  const ringRadius = badgeSize * 0.44;

  return (
    <View
      style={{
        width: badgeSize,
        height: badgeSize,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Profile image */}
      {profileImage ? (
        <Image
          source={{ uri: profileImage }}
          style={{
            position: "absolute",
            width: imageSize,
            height: imageSize,
            borderRadius: imageSize / 2,
            backgroundColor: "#ddd",
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            position: "absolute",
            width: imageSize,
            height: imageSize,
            borderRadius: imageSize / 2,
            backgroundColor: "#ddd",
          }}
        />
      )}

      {/* Badge frame — sits above avatar: PNG/image renders as <Image>, Lottie JSON renders animated */}
      {badgeImage && (
        (/\.(json)($|\?)/i.test(badgeImage) || (badgeImage.includes("/raw/upload/") && !/\.(png|jpe?g|webp|gif)($|\?)/i.test(badgeImage))) ? (
          <LottieView
            source={{ uri: badgeImage }}
            autoPlay
            loop
            style={{ position: "absolute", width: badgeSize, height: badgeSize, zIndex: 1 }}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={{ uri: badgeImage }}
            style={{ position: "absolute", width: badgeSize, height: badgeSize, zIndex: 1 }}
            resizeMode="fill"
          />
        )
      )}

      {/* Golden sparkle glints — appear on the frame surface */}
      {badgeImage && showSparks &&
        Array.from({ length: NUM_SPARKS }).map((_, i) => (
          <Spark key={i} radius={ringRadius} />
        ))}
    </View>
  );
};

export default ProfileBadgeFrame;
