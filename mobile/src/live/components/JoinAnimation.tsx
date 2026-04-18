import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import type { LiveRoomUser, VipTierConfig } from "../types";

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
  const soundRef = useRef<Audio.Sound | null>(null);

  // Show for every user — no VIP gate
  const isVisible = Boolean(user?._id);

  const joinTitle = useMemo(() => {
    if (!user) return "";
    if (specialJoinText) return specialJoinText.replace("{username}", user.username);
    const vip = Number(user.vipLevel || 0);
    return `${user.username} joined${vip > 0 ? ` (VIP${vip})` : ""}`;
  }, [user, specialJoinText]);

  useEffect(() => {
    let mounted = true;

    if (!isVisible) {
      return () => {
        mounted = false;
      };
    }

    // Play join sound
    const soundUrl = joinSoundUrl || user?.joinSoundUrl;
    if (soundUrl) {
      // Set audio mode to mix with Agora's active session before creating sound
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
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
      Animated.delay(3500),
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
        {/* Avatar */}
        {user?.profileImage ? (
          <Image source={{ uri: user.profileImage }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View style={styles.textWrap}>
          <Text style={[styles.label, vipTier?.usernameColor ? { color: vipTier.usernameColor } : undefined]} numberOfLines={1}>
            {joinTitle}
          </Text>
          <Text style={styles.subLabel}>انضم للغرفة</Text>
        </View>
        {null /* lottie overlay reserved for future native build */}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  textWrap: {
    flex: 1,
  },
  label: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "800",
  },
  subLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    marginTop: 1,
  },
  animation: {
    height: 48,
    width: 48,
  },
});

export default JoinAnimation;
