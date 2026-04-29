import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

const BAR_COUNT = 4;

/**
 * Animated sound-wave bars shown around a speaking user.
 * Props:
 *   active  – boolean – whether the user is currently speaking
 *   color   – string  – bar colour (default cyan)
 *   size    – 'small' | 'large'
 */
const SoundWave = React.memo(({ active, color = "#33CCFF", size = "small" }) => {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.25)),
  ).current;

  useEffect(() => {
    if (active) {
      const loops = anims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 90),
            Animated.timing(anim, {
              toValue: 1,
              duration: 200 + i * 60,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.25,
              duration: 200 + i * 60,
              useNativeDriver: true,
            }),
          ]),
        ),
      );
      loops.forEach((l) => l.start());
      return () => loops.forEach((l) => l.stop());
    } else {
      anims.forEach((a) => {
        a.stopAnimation();
        a.setValue(0.25);
      });
    }
  }, [active]);

  const barH = size === "large" ? 18 : 11;
  const barW = size === "large" ? 3 : 2;
  const gap = size === "large" ? 3 : 2;

  return (
    <View style={[styles.container, { gap }]}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: barW,
            height: barH,
            borderRadius: barW,
            backgroundColor: color,
            transform: [{ scaleY: anim }],
          }}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default SoundWave;
