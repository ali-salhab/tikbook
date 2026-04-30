import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Easing,
  type LayoutChangeEvent,
} from "react-native";
import { Audio, Video, ResizeMode, InterruptionModeIOS } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import SoundService from "../../services/soundService";
import VipBadge from "../../components/VipBadge";
import type { LiveRoomUser, VipTierConfig } from "../types";

export type JoinLayoutStyle = "card" | "ticker";
export type JoinEffectPreset = "none" | "glow" | "pulse" | "aurora" | "ring";

type BadgeLike = { imageUrl?: string; name?: string } | null | undefined;

type Props = {
  user: LiveRoomUser | null;
  joinAnimationUrl?: string | null;
  joinSoundUrl?: string | null;
  specialJoinText?: string | null;
  vipTier?: VipTierConfig | null;
  /** millis — admin configured per VIP level (defaults 5000) */
  displayDurationMs?: number;
  joinVideoUrl?: string | null;
  joinCardFrameImageUrl?: string | null;
  layoutStyle?: JoinLayoutStyle | null;
  effectPreset?: JoinEffectPreset | null;
  vipBadgeIconUrl?: string | null;
  onDone?: () => void;
};

const clampDur = (ms: unknown) => {
  const v = typeof ms === "number" ? ms : 5000;
  return Math.min(30000, Math.max(2000, Number.isFinite(v) ? v : 5000));
};

const JoinAnimation = ({
  user,
  joinAnimationUrl: _joinAnimationUrl,
  joinSoundUrl,
  specialJoinText,
  vipTier,
  displayDurationMs,
  joinVideoUrl,
  joinCardFrameImageUrl,
  layoutStyle = "card",
  effectPreset = "none",
  vipBadgeIconUrl,
  onDone,
}: Props) => {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;
  const translateXTicker = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const [tickerWrapW, setTickerWrapW] = useState(0);
  const [tickerContentW, setTickerContentW] = useState(0);

  const isVisible = Boolean(user?._id);
  const profileUri = user?.profileImage || user?.avatar || "";
  const layout = layoutStyle === "ticker" ? "ticker" : "card";
  const effect = effectPreset || "none";
  const dwellMs = clampDur(displayDurationMs);
  const showVideo =
    typeof joinVideoUrl === "string" &&
    joinVideoUrl.length > 4 &&
    (joinVideoUrl.startsWith("http") || joinVideoUrl.startsWith("file"));

  const activeBadge = user?.activeBadge as BadgeLike;
  const badgeImgUrl =
    activeBadge &&
    typeof activeBadge === "object" &&
    typeof activeBadge.imageUrl === "string" &&
    activeBadge.imageUrl.trim()
      ? activeBadge.imageUrl.trim()
      : typeof activeBadge === "object" && typeof (activeBadge as { image?: string }).image === "string"
        ? String((activeBadge as { image?: string }).image).trim()
        : "";

  const joinTitle = useMemo(() => {
    if (!user) return "";
    if (specialJoinText) return specialJoinText.replace("{username}", user.username);
    const vip = Number(user.vipLevel || 0);
    return `${user.username} انضم${vip > 0 ? ` (VIP${vip})` : ""}`;
  }, [user, specialJoinText]);

  const onTickerLayoutWrap = (e: LayoutChangeEvent) => {
    setTickerWrapW(e.nativeEvent.layout.width);
  };
  const onTickerLayoutInner = (e: LayoutChangeEvent) => {
    setTickerContentW(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (!isVisible || layout !== "ticker" || tickerWrapW <= 0 || tickerContentW <= 0) return;
    const travel = Math.max(40, tickerContentW + 24);
    translateXTicker.setValue(tickerWrapW + 16);
    const loop = Animated.loop(
      Animated.timing(translateXTicker, {
        toValue: -travel,
        duration: Math.round(6000 + travel * 12),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      translateXTicker.stopAnimation();
    };
  }, [isVisible, layout, tickerWrapW, tickerContentW, translateXTicker, user?._id]);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    pulse.setValue(0);
    glow.setValue(0);
    ringPulse.setValue(0);

    let pulseLoop: Animated.CompositeAnimation | null = null;
    let glowLoop: Animated.CompositeAnimation | null = null;
    let ringLoop: Animated.CompositeAnimation | null = null;

    if (effect === "pulse") {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      );
      pulseLoop.start();
    } else if (effect === "glow" || effect === "aurora") {
      glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ]),
      );
      glowLoop.start();
    } else if (effect === "ring") {
      ringLoop = Animated.loop(
        Animated.timing(ringPulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
      );
      ringLoop.start();
    }

    const soundUrlEffective = joinSoundUrl || user?.joinSoundUrl;
    if (soundUrlEffective && String(soundUrlEffective).startsWith("http")) {
      if (Platform.OS === "ios") {
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        }).catch(() => {});
      }
      Audio.Sound.createAsync({ uri: soundUrlEffective }, { shouldPlay: true, volume: 1.0 })
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
    } else {
      SoundService.play("join").catch(() => {});
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
      Animated.delay(dwellMs),
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
      opacity.stopAnimation();
      translateY.stopAnimation();
      pulseLoop?.stop();
      glowLoop?.stop();
      ringLoop?.stop();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [user?._id]);

  if (!isVisible) {
    return null;
  }

  const tint = vipTier?.color || "#6366f1";
  const nameColor = vipTier?.usernameColor || vipTier?.color || "#F9FAFB";

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const ringScale = ringPulse.interpolate({
    inputRange: [0, 0.85, 1],
    outputRange: [1, 1.06, 1],
  });

  const inner = layout === "ticker" ? (
    <View style={styles.tickerOuter} onLayout={onTickerLayoutWrap}>
      <Animated.View style={[styles.tickerInner, { transform: [{ translateX: translateXTicker }] }]}>
        <View style={styles.tickerCluster} onLayout={onTickerLayoutInner}>
          {profileUri ? (
            <Image source={{ uri: profileUri }} style={styles.tAvatar} />
          ) : (
            <View style={[styles.tAvatar, styles.avatarPlaceholder]} />
          )}
          {user?.isVerified ? (
            <Ionicons name="checkmark-circle" size={16} color="#38bdf8" style={styles.verifiedIc} />
          ) : null}
          {badgeImgUrl ? <Image source={{ uri: badgeImgUrl }} style={styles.miniBadgeImg} /> : null}
          {Number(user?.vipLevel) > 0 ? (
            <VipBadge
              level={Number(user?.vipLevel)}
              size="small"
              imageUrl={vipBadgeIconUrl || undefined}
            />
          ) : null}
          <Text style={[styles.tickerLabel, { color: nameColor }]} numberOfLines={1}>
            {joinTitle}
          </Text>
          <Text style={styles.tickerSub} numberOfLines={1}>
            انضم للغرفة
          </Text>
        </View>
      </Animated.View>
    </View>
  ) : (
    <View style={styles.row}>
      {/* Optional join clip */}
      {showVideo ? (
        <View style={styles.videoBox}>
          <Video
            source={{ uri: joinVideoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
          />
        </View>
      ) : null}

      {/* Avatar cluster */}
      <View style={styles.avatarCluster}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        {user?.isVerified ? (
          <View style={styles.verifiedDot}>
            <Ionicons name="checkmark" size={11} color="#fff" />
          </View>
        ) : null}
      </View>

      {/* Award / medal badge */}
      {badgeImgUrl ? <Image source={{ uri: badgeImgUrl }} style={styles.rewardBadgeImg} /> : null}

      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={[styles.label, { color: nameColor }]} numberOfLines={1}>
            {joinTitle}
          </Text>
          {Number(user?.vipLevel) > 0 ? (
            <VipBadge
              level={Number(user?.vipLevel)}
              size="small"
              imageUrl={vipBadgeIconUrl || undefined}
            />
          ) : null}
        </View>
        <Text style={styles.subLabel}>انضم للغرفة</Text>
      </View>
    </View>
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        layout === "ticker" ? styles.containerTicker : null,
        {
          opacity,
          top: insets.top + 10,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.shell}>
        {effect === "ring" && layout !== "ticker" ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                opacity: ringPulse.interpolate({
                  inputRange: [0, 0.6, 1],
                  outputRange: [0.45, 0.2, 0.45],
                }),
                transform: [{ scale: ringScale }],
              },
              { borderColor: tint },
            ]}
          />
        ) : null}

        {/* PNG overlay frame */}
        {joinCardFrameImageUrl &&
        joinCardFrameImageUrl.startsWith("http") &&
        layout !== "ticker" ? (
          <Image
            source={{ uri: joinCardFrameImageUrl }}
            style={styles.pngFrame}
            resizeMode="contain"
          />
        ) : null}

        {(effect === "glow" || effect === "aurora") && layout !== "ticker" ? (
          <Animated.View
            style={[
              styles.card,
              {
                borderColor: tint,
                borderWidth: 1.5,
                shadowColor: effect === "aurora" ? "#c084fc" : tint,
                shadowOpacity: glowOpacity,
                shadowRadius: effect === "aurora" ? 22 : 16,
                shadowOffset: { width: 0, height: 0 },
                elevation: 12,
              },
            ]}
          >
            {inner}
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              layout === "ticker" ? styles.cardTicker : styles.card,
              layout !== "ticker" && vipTier?.color && effect === "none"
                ? { borderColor: vipTier.color }
                : null,
              layout !== "ticker" && effect === "pulse"
                ? { transform: [{ scale: pulseScale }] }
                : null,
            ]}
          >
            {inner}
          </Animated.View>
        )}
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
  containerTicker: {
    left: 0,
    right: 0,
    paddingHorizontal: 0,
  },
  shell: {
    alignItems: "stretch",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    alignSelf: "center",
    top: -10,
    left: -6,
    right: -6,
    bottom: -10,
    borderRadius: 22,
    borderWidth: 2,
    opacity: 0.5,
  },
  pngFrame: {
    position: "absolute",
    left: -18,
    right: -18,
    top: -26,
    bottom: -26,
    zIndex: 3,
    width: undefined,
    height: undefined,
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
  cardTicker: {
    borderRadius: 0,
    backgroundColor: "rgba(12, 16, 32, 0.92)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    paddingVertical: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  videoBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  avatarCluster: {
    position: "relative",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  verifiedDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(8,12,27,0.95)",
  },
  verifiedIc: {
    marginHorizontal: 2,
  },
  miniBadgeImg: {
    width: 22,
    height: 22,
    borderRadius: 4,
    marginRight: 6,
    resizeMode: "contain",
  },
  rewardBadgeImg: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  label: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  subLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    marginTop: 1,
  },
  tickerOuter: {
    overflow: "hidden",
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: "center",
  },
  tickerInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  tickerCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
  },
  tickerLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 4,
    maxWidth: 520,
  },
  tickerSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginLeft: 6,
    fontWeight: "600",
  },
});

export default JoinAnimation;
