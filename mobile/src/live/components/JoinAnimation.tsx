import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import LottieView, { type AnimationObject } from "lottie-react-native";
import { Audio } from "expo-av";
import type { LiveRoomUser, VipTierConfig } from "../types";
import { fetchLottieJson, getCachedLottieJson } from "../services/lottieCache";

type Props = {
  user: LiveRoomUser | null;
  /** Optional Lottie URL override — used when the URL comes from VIP level config rather than the user object */
  joinAnimationUrl?: string | null;
  /** Sound URL to play on entry */
  joinSoundUrl?: string | null;
  /** Special join text from VIP tier config */
  specialJoinText?: string | null;
  /** VIP tier config for this user — used to pull color */
  vipTier?: VipTierConfig | null;
  onDone?: () => void;
};

const JoinAnimation = ({ user, joinAnimationUrl, joinSoundUrl, specialJoinText, vipTier, onDone }: Props) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;
  const [animationJson, setAnimationJson] = useState<unknown | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const isVisible = Boolean(user?._id && Number(user?.vipLevel || 0) > 0);

  const joinTitle = useMemo(() => {
    if (!user) return "";
    if (specialJoinText) return specialJoinText.replace("{username}", user.username);
    const vip = Number(user.vipLevel || 0);
    return `${user.username} joined${vip > 0 ? ` (VIP${vip})` : ""}`;
  }, [user, specialJoinText]);

  useEffect(() => {
    let mounted = true;

    if (!isVisible) {
      setAnimationJson(null);
      return () => {
        mounted = false;
      };
    }

    const url = joinAnimationUrl || user?.joinAnimationLottieUrl;
    const cached = getCachedLottieJson(url);
    if (cached) {
      setAnimationJson(cached);
    } else if (url) {
      fetchLottieJson(url).then((json) => {
        if (!mounted) return;
        setAnimationJson(json);
      });
    }

    // Play join sound
    const soundUrl = joinSoundUrl || user?.joinSoundUrl;
    if (soundUrl) {
      Audio.Sound.createAsync({ uri: soundUrl }, { shouldPlay: true, volume: 1.0 })
        .then(({ sound }) => {
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              sound.unloadAsync().catch(() => {});
              soundRef.current = null;
            }
          });
        })
        .catch(() => {});
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1700),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onDone?.();
    });

    return () => {
      mounted = false;
      opacity.stopAnimation();
      translateY.stopAnimation();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [user?._id]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.card, vipTier?.color ? { borderColor: vipTier.color } : undefined]}>
        <Text style={[styles.label, vipTier?.usernameColor ? { color: vipTier.usernameColor } : undefined]} numberOfLines={1}>
          {joinTitle}
        </Text>
        {animationJson ? (
          <LottieView source={animationJson as AnimationObject} autoPlay loop style={styles.animation} />
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    zIndex: 65,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "rgba(8, 12, 27, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  label: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "800",
  },
  animation: {
    height: 54,
    width: "100%",
  },
});

export default JoinAnimation;
