import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Easing,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Audio, Video, ResizeMode, InterruptionModeIOS } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import SoundService from "../../services/soundService";
import ProfileBadgeFrame from "../../components/ProfileBadgeFrame";
import VipBadge from "../../components/VipBadge";
import type { LiveRoomUser, VipTierConfig } from "../types";

export type JoinLayoutStyle = "card" | "ticker" | "video-fullscreen";
export type JoinEffectPreset = "none" | "glow" | "pulse" | "aurora" | "ring";

type Props = {
  user: LiveRoomUser | null;
  joinAnimationUrl?: string | null;
  joinSoundUrl?: string | null;
  specialJoinText?: string | null;
  vipTier?: VipTierConfig | null;
  /** millis — admin configured per VIP level (defaults 5000) */
  displayDurationMs?: number;
  joinVideoUrl?: string | null;
  /** PNG/WebP شفاف يحيط بكارت الانضمام بالكامل (من الإدمن) */
  joinCardFrameImageUrl?: string | null;
  /** إطار حول صورة المستخدم فقط (Lottie/PNG من أنماط VIP) */
  avatarFrameUrl?: string | null;
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
  avatarFrameUrl,
  layoutStyle = "card",
  effectPreset = "none",
  vipBadgeIconUrl,
  onDone,
}: Props) => {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
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
  const layout = layoutStyle;
  const effect = effectPreset || "none";
  const dwellMs = clampDur(displayDurationMs);
  const isFullscreenJoinVideo = layout === "video-fullscreen";
  const joinVideoTrimmed =
    typeof joinVideoUrl === "string" ? joinVideoUrl.trim() : "";
  const showVideo =
    joinVideoTrimmed.length > 4 &&
    (joinVideoTrimmed.startsWith("http://") ||
      joinVideoTrimmed.startsWith("https://") ||
      joinVideoTrimmed.startsWith("file:") ||
      joinVideoTrimmed.startsWith("file://"));

  const rawAvatarFrame =
    typeof avatarFrameUrl === "string" ? avatarFrameUrl.trim() : "";
  const effectiveAvatarFrame =
    rawAvatarFrame &&
    (rawAvatarFrame.startsWith("http://") ||
      rawAvatarFrame.startsWith("https://") ||
      rawAvatarFrame.startsWith("file:") ||
      rawAvatarFrame.startsWith("file://"))
      ? rawAvatarFrame
      : "";

  const joinCardFrameTrimmed =
    typeof joinCardFrameImageUrl === "string" ? joinCardFrameImageUrl.trim() : "";
  const cardFrameOverlayUri =
    joinCardFrameTrimmed &&
    (joinCardFrameTrimmed.startsWith("http://") ||
      joinCardFrameTrimmed.startsWith("https://") ||
      joinCardFrameTrimmed.startsWith("file:") ||
      joinCardFrameTrimmed.startsWith("file://"))
      ? joinCardFrameTrimmed
      : "";

  const resolveActiveBadgeImageUrl = (badge: unknown): string => {
    if (badge == null || badge === "") return "";
    if (typeof badge === "string") return badge.trim();
    if (typeof badge !== "object") return "";
    const o = badge as { imageUrl?: unknown; image?: unknown };
    if (typeof o.imageUrl === "string" && o.imageUrl.trim()) return o.imageUrl.trim();
    if (typeof o.image === "string" && o.image.trim()) return o.image.trim();
    return "";
  };

  const badgeImgUrl = resolveActiveBadgeImageUrl(user?.activeBadge);

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
    const hasSeparateJoinSound =
      Boolean(soundUrlEffective && String(soundUrlEffective).startsWith("http"));
    if (hasSeparateJoinSound) {
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

  const separateJoinSoundPlaying = Boolean(
    (joinSoundUrl && String(joinSoundUrl).startsWith("http")) ||
      (user?.joinSoundUrl && String(user.joinSoundUrl).startsWith("http")),
  );
  const joinVideoMuted = separateJoinSoundPlaying;

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
  ) : layout === "video-fullscreen" ? (
    <View style={styles.fullscreenVideoContainer}>
      {showVideo ? (
        <Video
          source={{ uri: joinVideoTrimmed }}
          style={styles.fullscreenVideo}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted={joinVideoMuted}
          useNativeControls={false}
        />
      ) : (
        <View style={styles.fullscreenVideoPlaceholder}>
          {profileUri ? (
            <Image source={{ uri: profileUri }} style={styles.fullscreenAvatar} />
          ) : (
            <View style={[styles.fullscreenAvatar, styles.avatarPlaceholder]} />
          )}
        </View>
      )}
      
      {/* Overlay content on top of video */}
      <View style={styles.fullscreenOverlay}>
        <View style={styles.fullscreenContent}>
          <View style={styles.fullscreenTitleRow}>
            <Text style={[styles.fullscreenLabel, { color: nameColor }]}>
              {joinTitle}
            </Text>
            {Number(user?.vipLevel) > 0 ? (
              <VipBadge
                level={Number(user?.vipLevel)}
                size="medium"
                imageUrl={vipBadgeIconUrl || undefined}
              />
            ) : null}
          </View>
          <Text style={styles.fullscreenSubLabel}>انضم للغرفة</Text>
          {badgeImgUrl ? (
            <Image source={{ uri: badgeImgUrl }} style={styles.fullscreenBadge} resizeMode="contain" />
          ) : null}
        </View>
      </View>
    </View>
  ) : (
    <View style={styles.joinCardRoot}>
      <View style={styles.joinCardContentWrap}>
        {/* صف يثبت الصورة على يمين الكارد حتى في وضع RTL للتطبيق */}
        <View style={styles.avatarHeroRow} pointerEvents="none">
          <View style={styles.avatarHeroSlot}>
            {effectiveAvatarFrame ? (
              <View style={styles.avatarFramedWrap}>
                <ProfileBadgeFrame
                  profileImage={profileUri || undefined}
                  badgeImage={effectiveAvatarFrame}
                  size={50}
                  showSparks={false}
                />
                {user?.isVerified ? (
                  <View style={styles.verifiedDotHero}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.avatarHeroPlainWrap}>
                {profileUri ? (
                  <Image source={{ uri: profileUri }} style={styles.avatarHeroImg} />
                ) : (
                  <View style={[styles.avatarHeroImg, styles.avatarPlaceholder]} />
                )}
                {user?.isVerified ? (
                  <View style={styles.verifiedDotHero}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardPanel}>
          <View style={styles.cardPanelRow}>
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
              {badgeImgUrl ? (
                <Image source={{ uri: badgeImgUrl }} style={styles.rewardBadgeInline} resizeMode="contain" />
              ) : null}
            </View>
            {showVideo ? (
              <View style={styles.videoBox} collapsable={false}>
                <Video
                  source={{ uri: joinVideoTrimmed }}
                  style={styles.video}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted={joinVideoMuted}
                  useNativeControls={false}
                />
              </View>
            ) : null}
          </View>
        </View>

        {cardFrameOverlayUri ? (
          <Image
            pointerEvents="none"
            source={{ uri: cardFrameOverlayUri }}
            style={styles.joinCardPngFrame}
            resizeMode="stretch"
          />
        ) : null}
      </View>
    </View>
  );

  /** Video داخل Animated مع opacity يختفي على أندرويد — الإبقاء على الإزاحة فقط */
  const containerAnimStyle = {
    top: insets.top + 10,
    transform: [{ translateY }],
    ...(Platform.OS === "android" ? {} : { opacity }),
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={
        isFullscreenJoinVideo
          ? {
              position: "absolute",
              top: 0,
              left: 0,
              width: winW,
              height: winH,
              zIndex: 65,
              opacity,
            }
          : [
              styles.container,
              layout === "ticker" ? styles.containerTicker : null,
              containerAnimStyle,
            ]
      }
      needsOffscreenAlphaCompositing={Platform.OS === "ios"}
    >
      <View
        style={
          isFullscreenJoinVideo
            ? { width: winW, height: winH, position: "relative" }
            : styles.shell
        }
      >
        {isFullscreenJoinVideo ? (
          inner
        ) : (
          <>
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

        {(effect === "glow" || effect === "aurora") && layout !== "ticker" ? (
          <Animated.View
            style={[
              styles.cardJoinShell,
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
              layout === "ticker" ? styles.cardTicker : styles.cardJoinShell,
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
          </>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
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
  /** غلاف شفاف — لا overflow:hidden حتى تُرى الصورة خارج اللوحة */
  cardJoinShell: {
    alignSelf: "stretch",
    borderRadius: 18,
    backgroundColor: "transparent",
    overflow: "visible",
    paddingHorizontal: 3,
    paddingVertical: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  joinCardRoot: {
    position: "relative",
    overflow: "visible",
    alignItems: "stretch",
    width: "100%",
    paddingTop: 6,
    /** يمنع انعكاس اتجاه RTL على موضع الصورة */
    direction: "ltr",
  },
  /** يضمن أن طبقة إطار PNG تُقاس على مساحة الكارت + جزء البروفايل البارز */
  joinCardContentWrap: {
    position: "relative",
    alignSelf: "stretch",
    width: "100%",
  },
  /** إطار PNG من الإدمن: يُمدَّد ليغطي الكارت والصورة البارزة؛ الوسط يبقى شفافاً في الملف */
  joinCardPngFrame: {
    position: "absolute",
    top: -48,
    left: -14,
    right: -14,
    bottom: -12,
    zIndex: 24,
  },
  /** صف بعرض الكارد: الصورة دائماً على يمين الحافة (بصرياً) */
  avatarHeroRow: {
    position: "absolute",
    top: -42, // Adjusted to position avatar higher
    left: 0,
    right: 0,
    zIndex: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    paddingRight: 12, // Increased padding for better alignment
    paddingLeft: 12,
    direction: "ltr",
  },
  avatarHeroSlot: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10, // Ensure avatar appears above the card
    marginBottom: -28, // Make avatar protrude from the card
  },
  avatarFramedWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarHeroPlainWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarHeroImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  verifiedDotHero: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(8,12,27,0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  cardPanel: {
    marginTop: 28, // Adjusted to account for protruding avatar
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(8, 12, 27, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingTop: 24, // More space at the top for the avatar
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
  /** اتجاه ثابت: النص يبدأ من اليسار البصري والفيديو قرب الصورة على اليمين */
  cardPanelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    direction: "ltr",
  },
  videoBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.15)",
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
  rewardBadgeInline: {
    width: 28,
    height: 28,
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(0,0,0,0.2)",
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
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
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
  // Full screen video styles
  fullscreenVideoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 65,
  },
  fullscreenVideo: {
    width: "100%",
    height: "100%",
  },
  fullscreenVideoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.8)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  fullscreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
    paddingBottom: 80,
  },
  fullscreenContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  fullscreenTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  fullscreenLabel: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "800",
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: "center",
  },
  fullscreenSubLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  fullscreenBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.6)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
});

export default JoinAnimation;
