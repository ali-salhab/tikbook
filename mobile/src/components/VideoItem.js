import React, { useRef, useState, useEffect, memo, useMemo, useCallback, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
  InteractionManager,
  DeviceEventEmitter,
  PanResponder,
  Alert,
  Platform,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import SoundService from "../services/soundService";
import { AuthContext } from "../context/AuthContext";
import {
  Gesture,
  GestureDetector,
  TouchableOpacity as TouchableOpacityGH,
} from "react-native-gesture-handler";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ms, fs, getWindowDimensions } from "../utils/responsive";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getWindowDimensions();
/** Rail on screen start (= visual left under RTL mirror) — tight spacing vs icons */
const ACTION_RAIL_EDGE_INSET = Math.round(ms(8));
const ICON_SIZE = Math.round(Math.min(Math.max(SCREEN_WIDTH * 0.08, 26), 32));
const PROFILE_SIZE = Math.round(Math.min(Math.max(SCREEN_WIDTH * 0.118, 42), 48));
const FOLLOW_BUTTON_SIZE = Math.round(
  Math.min(Math.max(PROFILE_SIZE * 0.38, 16), 20),
);
const ACTION_RAIL_VERTICAL_GAP = Math.round(ms(6));
const MUSIC_DISC_OUTER_SIZE = Math.round(
  Math.min(Math.max(SCREEN_WIDTH * 0.14, 50), 58),
);
const MUSIC_DISC_INNER_SIZE = MUSIC_DISC_OUTER_SIZE - 10;
const MUSIC_DISC_CENTER_SIZE = Math.round(
  Math.min(Math.max(MUSIC_DISC_OUTER_SIZE * 0.2, 10), 13),
);
const MUSIC_DISC_ICON_SIZE = Math.round(
  Math.min(Math.max(MUSIC_DISC_INNER_SIZE * 0.22, 10), 14),
);
/* Tap-exclusion stripe alongside the rail — keep slim */
const ACTION_RAIL_CLEARANCE_SLACK = 20;
const ACTION_RAIL_WIDTH =
  Math.max(PROFILE_SIZE, MUSIC_DISC_OUTER_SIZE, ICON_SIZE) +
  14 +
  ACTION_RAIL_CLEARANCE_SLACK;
const PROGRESS_TRACK_HEIGHT = 3;
const PROGRESS_THUMB_SIZE = Math.round(
  Math.min(Math.max(SCREEN_WIDTH * 0.025, 8), 11),
);
// Top breathing room above the bar; bottom stays flush with cell bottom (= tab bar top).
const PROGRESS_WRAPPER_PADDING_TOP = 6;
const PROGRESS_THUMB_OFFSET =
  PROGRESS_WRAPPER_PADDING_TOP -
  Math.round((PROGRESS_THUMB_SIZE - PROGRESS_TRACK_HEIGHT) / 2);

const burstStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 56,
  },
  particleWrap: {
    position: "absolute",
  },
});

const FLYING_HEART_COUNT = 10;

const HEART_MIN = Math.round(ms(22));
const HEART_MAX = HEART_MIN + Math.round(ms(12));

/** Small Ionicons hearts that drift upward/fade — replaces Lottie on like / double-tap */
const LikeHeartBurst = memo(({ burstId, centerY }) => {
  const particles = useRef(
    Array.from({ length: FLYING_HEART_COUNT }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.4),
    })),
  ).current;

  useEffect(() => {
    if (!burstId) return;
    particles.forEach((p, i) => {
      const drift = (Math.random() - 0.5) * Math.round(ms(112));
      const rise = -(Math.round(ms(100)) + Math.random() * Math.round(ms(92)));
      const duration = 720 + Math.random() * 260;
      const heartSize = HEART_MIN + ((i % 4) / 3) * (HEART_MAX - HEART_MIN);

      p.translateY.setValue(0);
      p.translateX.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(0.55 + Math.random() * 0.45);

      Animated.parallel([
        Animated.timing(p.translateY, {
          toValue: rise,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(p.translateX, {
          toValue: drift,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(280),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 460,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, [burstId]);

  if (!burstId) return null;

  return (
    <View style={burstStyles.root} pointerEvents="none">
      {particles.map((p, i) => {
        const sz = HEART_MIN + ((i % 4) / 3) * (HEART_MAX - HEART_MIN);
        return (
        <Animated.View
          key={`h-${burstId}-${i}`}
          style={[
            burstStyles.particleWrap,
            {
              left: SCREEN_WIDTH / 2 - sz / 2,
              top: centerY - sz / 2,
              opacity: p.opacity,
              transform: [
                { translateX: p.translateX },
                { translateY: p.translateY },
                { scale: p.scale },
              ],
            },
          ]}
        >
          <Ionicons name="heart" size={sz} color="#FF3366" />
        </Animated.View>
        );
      })}
    </View>
  );
});

LikeHeartBurst.displayName = "LikeHeartBurst";

const VideoItem = memo(
  ({
    item,
    isActive,
    tabBarHeight,
    viewportHeight,
    userInfo,
    navigation,
    handleLike,
    handleSave,
    handleComment,
    handleShare,
    handleFollow,
    formatNumber,
  }) => {
    const { userToken } = useContext(AuthContext);
    const creatorUserId = useMemo(() => {
      const u = item?.user;
      if (!u || typeof u !== "object") return null;
      const raw = u._id ?? u.id;
      if (raw == null || raw === "") return null;
      return String(raw);
    }, [item?.user]);

    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMutedByModal, setIsMutedByModal] = useState(false);

    useEffect(() => {
      const sub = DeviceEventEmitter.addListener("UPDATE_MODAL_VISIBLE", ({ visible }) => {
        setIsMutedByModal(visible);
      });
      return () => sub.remove();
    }, []);
    const [isBuffering, setIsBuffering] = useState(false);
    const [progress, setProgress] = useState(0); // 0-1
    const [duration, setDuration] = useState(0);
    const durationRef = useRef(0);   // always up-to-date, readable inside PanResponder
    const progressRef = useRef(0);   // always up-to-date, readable inside PanResponder
    const progressBarWidth = useRef(0);
    const isSeeking = useRef(false);
    const isPlayingRef = useRef(false);
    const wasPlayingBeforeScrub = useRef(false);
    const lastScrubXRef = useRef(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const scrubThumbScale = useRef(new Animated.Value(1)).current;
    const playIconOpacity = useRef(new Animated.Value(0)).current;
    const playIconScale = useRef(new Animated.Value(0.6)).current;

    const [likeBurstId, setLikeBurstId] = useState(0);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const rotationRef = useRef(null);
    const itemHeight = Math.max(viewportHeight || SCREEN_HEIGHT, 1);

    // Simple, device-independent bottom positioning.
    // The video container's bottom edge sits exactly at the top of the bottom nav bar
    // (since itemHeight = SCREEN_HEIGHT - tabBarHeight from the parent).
    // Using fixed pixel offsets keeps the layout identical across all screen sizes.
    // Cell bottom aligns with top of bottom tab bar (see HomeScreen pageHeight).
    const TIMELINE_MIN_HEIGHT =
      PROGRESS_WRAPPER_PADDING_TOP +
      PROGRESS_TRACK_HEIGHT +
      Math.ceil(PROGRESS_THUMB_SIZE / 2) +
      4;
    const overlayBottomOffset = TIMELINE_MIN_HEIGHT + 38;
    const actionGap = ACTION_RAIL_VERTICAL_GAP;
    const zoomScale = useSharedValue(1);
    const zoomBase = useSharedValue(1);

    const mediaZoomStyle = useAnimatedStyle(() => ({
      transform: [{ scale: zoomScale.value }],
    }));

    const pinchGesture = Gesture.Pinch()
      .onUpdate((event) => {
        const nextScale = Math.min(Math.max(zoomBase.value * event.scale, 1), 3);
        zoomScale.value = nextScale;
      })
      .onEnd(() => {
        const finalScale = Math.min(Math.max(zoomScale.value, 1), 3);
        zoomBase.value = finalScale;
        zoomScale.value = withTiming(finalScale, { duration: 120 });
      });

    useEffect(() => {
      // shouldPlay={isActive} already handles play/pause declaratively.
      // This imperative effect only syncs local isPlaying state so the UI icon is correct.
      setIsPlaying(isActive);
    }, [isActive]);

    useEffect(() => {
      if (isActive) {
        rotationRef.current = Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        rotationRef.current.start();
      } else {
        if (rotationRef.current) rotationRef.current.stop();
      }
      return () => {
        if (rotationRef.current) rotationRef.current.stop();
      };
    }, [isActive]);

    // Memoize the interpolation node — creating a new one on every render leaks
    // native Animated nodes and exhausts the heap (OOM at MatrixMathHelper.decomposeMatrix).
    const spin = useRef(
      rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      })
    ).current;

    // Pause & unload on unmount so ExoPlayer always releases from the main thread.
    useEffect(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.pauseAsync().catch(() => {});
        }
      };
    }, []);

    useEffect(() => {
      if (!isActive) {
        zoomBase.value = 1;
        zoomScale.value = 1;
      }
    }, [isActive, zoomBase, zoomScale]);

    // Format ms -> m:ss
    const formatTime = (ms) => {
      const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const togglePlayback = () => {
      if (!videoRef.current || isImage(item.videoUrl)) return;

      InteractionManager.runAfterInteractions(() => {
        if (!videoRef.current) return;
        if (isPlaying) {
          videoRef.current
            .pauseAsync()
            .then(() => setIsPlaying(false))
            .catch(() => {});
        } else {
          videoRef.current
            .playAsync()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        }
      });

      playIconOpacity.setValue(1);
      playIconScale.setValue(0.6);
      Animated.parallel([
        Animated.spring(playIconScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(playIconOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    // --- Scrub: PanResponder captures touches before vertical FlatList scroll ---
    const applySeek = (x) => {
      const barW = progressBarWidth.current;
      if (!barW) return;
      const newP = Math.max(0, Math.min(x / barW, 1));
      progressRef.current = newP;
      setProgress(newP);
    };

    const commitSeek = useCallback(
      (x) => {
        const barW = progressBarWidth.current;
        const newP = barW
          ? Math.max(0, Math.min(x / barW, 1))
          : progressRef.current;
        progressRef.current = newP;
        setProgress(newP);
        setIsScrubbing(false);
        Animated.spring(scrubThumbScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }).start();

        const run = async () => {
          let dur = durationRef.current;
          const video = videoRef.current;
          if ((!dur || dur <= 0) && video) {
            try {
              const st = await video.getStatusAsync();
              if (st.isLoaded && st.durationMillis) {
                dur = st.durationMillis;
                durationRef.current = dur;
                setDuration(dur);
              }
            } catch {
              /* ignore */
            }
          }
          if (!video || !dur || dur <= 0) {
            isSeeking.current = false;
            return;
          }
          const targetMs = Math.min(
            Math.max(0, Math.floor(newP * dur)),
            Math.max(0, dur - 24),
          );
          isSeeking.current = true;
          try {
            await video.setPositionAsync(targetMs);
            if (wasPlayingBeforeScrub.current && isActive) {
              await video.playAsync();
            }
          } catch {
            /* ignore */
          } finally {
            isSeeking.current = false;
          }
        };
        run();
      },
      [isActive, scrubThumbScale],
    );

    const progressPanResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onStartShouldSetPanResponderCapture: () => true,
          onMoveShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponderCapture: () => true,
          onPanResponderGrant: (e) => {
            wasPlayingBeforeScrub.current = isPlayingRef.current;
            isSeeking.current = true;
            setIsScrubbing(true);
            Animated.spring(scrubThumbScale, {
              toValue: 1.8,
              useNativeDriver: true,
              friction: 6,
              tension: 80,
            }).start();
            const x = e.nativeEvent.locationX;
            lastScrubXRef.current = x;
            applySeek(x);
            const v = videoRef.current;
            if (v && wasPlayingBeforeScrub.current) {
              v.pauseAsync().catch(() => {});
            }
          },
          onPanResponderMove: (e) => {
            const x = e.nativeEvent.locationX;
            lastScrubXRef.current = x;
            applySeek(x);
          },
          onPanResponderRelease: () => {
            commitSeek(lastScrubXRef.current);
          },
          onPanResponderTerminate: () => {
            commitSeek(lastScrubXRef.current);
          },
        }),
      [commitSeek, scrubThumbScale],
    );

    const triggerLikeBurst = useCallback(() => {
      setLikeBurstId((n) => n + 1);
    }, []);

    const onLikePress = (fromDoubleTap = false) => {
      SoundService.play("like");
      const isLiked = !!item.isLiked;
      if (fromDoubleTap) {
        triggerLikeBurst();
      } else if (!isLiked) {
        triggerLikeBurst();
      }
      handleLike(item._id);
    };

    const handleDoubleTap = () => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Double tap — like (+ flying hearts)
        onLikePress(true);
      } else {
        // Single tap — play/pause
        togglePlayback();
      }
      lastTap.current = now;
    };

    const handleProfilePress = () => {
      SoundService.play("tap");
      if (!userToken) {
        Alert.alert(
          "تسجيل الدخول",
          "سجّل الدخول لعرض الملف الشخصي لهذا المستخدم.",
        );
        return;
      }
      if (!creatorUserId) {
        Alert.alert("تعذّر الفتح", "لا يمكن تحديد صاحب هذا الفيديو.");
        return;
      }
      if (String(creatorUserId) === String(userInfo?._id)) {
        navigation.navigate("MainTabs", { screen: "Profile" });
        return;
      }
      const rootish = navigation.getParent?.();
      if (rootish?.navigate) {
        rootish.navigate("UserProfile", { userId: creatorUserId });
      } else {
        navigation.navigate("UserProfile", { userId: creatorUserId });
      }
    };

    const isAlreadyFollowing =
      !!creatorUserId &&
      creatorUserId !== String(userInfo?._id) &&
      Array.isArray(item.user?.followers) &&
      item.user.followers.some(
        (f) => String(typeof f === "object" ? f?._id : f) === String(userInfo?._id),
      );

    const handleFollowPress = () => {
      SoundService.play("tap");
      if (!userToken) {
        Alert.alert(
          "تسجيل الدخول",
          "سجّل الدخول لمتابعة هذا المستخدم.",
        );
        return;
      }
      if (!creatorUserId || String(creatorUserId) === String(userInfo?._id)) return;
      if (isAlreadyFollowing) return;
      handleFollow?.(creatorUserId);
    };

    const isImage = (url) => {
      if (!url) return false;
      const lowerUrl = url.toLowerCase();
      return (
        lowerUrl.match(/\.(jpeg|jpg|png|gif|webp)$/) ||
        lowerUrl.includes("/image/upload/")
      );
    };

    return (
      <View style={[styles.videoContainer, { height: itemHeight }]}>
        {/* Pinch-zoom on full-frame media — action rail overlays on top */}
        <GestureDetector gesture={pinchGesture}>
          <Reanimated.View
            style={[styles.mediaLayer, mediaZoomStyle]}
          >
            {isImage(item.videoUrl) ? (
              <Image
                source={{ uri: item.videoUrl }}
                style={styles.video}
                resizeMode="cover"
              />
            ) : (
              <Video
                ref={videoRef}
                source={{ uri: item.videoUrl }}
                style={styles.video}
                resizeMode="cover"
                shouldPlay={isActive}
                isLooping
                isMuted={isMutedByModal}
                useNativeControls={false}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) {
                    setIsPlaying(status.isPlaying);
                    setIsBuffering(status.isBuffering || false);
                    if (status.durationMillis && status.durationMillis > 0) {
                      durationRef.current = status.durationMillis;
                      setDuration(status.durationMillis);
                      if (!isSeeking.current) {
                        const newP = status.positionMillis / status.durationMillis;
                        progressRef.current = newP;
                        setProgress(newP);
                      }
                    }
                  }
                }}
              />
            )}
          </Reanimated.View>
        </GestureDetector>

        {/* Tap zone: excludes left-side action rail */}
        <TouchableOpacityGH
          activeOpacity={1}
          onPress={handleDoubleTap}
          style={[
            styles.videoTapCatch,
            {
              left: ACTION_RAIL_EDGE_INSET + ACTION_RAIL_WIDTH,
              right: 0,
            },
          ]}
        >
          <View style={styles.videoTapCatchInner} />
        </TouchableOpacityGH>

        <LikeHeartBurst burstId={likeBurstId} centerY={itemHeight / 2} />

          {/* Play / Pause flash overlay */}
          <Animated.View
            style={[
              styles.playPauseOverlay,
              {
                opacity: playIconOpacity,
                transform: [{ scale: playIconScale }],
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.playPauseCircle}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={44}
                color="#FFF"
              />
            </View>
          </Animated.View>

        {/* Caption — rail مساحته على الشمال؛ النص باليمين (مناسب لعربية) */}
        <View
          style={[
            styles.bottomSection,
            {
              bottom: overlayBottomOffset,
              left: ACTION_RAIL_EDGE_INSET + ACTION_RAIL_WIDTH + Math.round(ms(8)),
              right: Math.round(ms(12)),
            },
          ]}
        >
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{item.user?.username || "—"}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.musicRow}>
              <Text style={styles.musicText}>
                الصوت الأصلي - {item.user?.username || ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Buffering indicator */}
        {!isImage(item.videoUrl) && isActive && isBuffering && !isPlaying && (
          <View style={styles.bufferingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="rgba(255,255,255,0.9)" />
          </View>
        )}

        {/* Timeline: time labels + scrub bar — flush to tab bar top edge */}
        {!isImage(item.videoUrl) && (
          <View style={styles.timelineSection} pointerEvents="box-none">
            {/* Time labels — only visible while scrubbing for a clean look */}
            {isScrubbing && (
              <View style={styles.progressMetaRow} pointerEvents="none">
                <Text style={styles.progressMetaText}>
                  {formatTime(progress * duration)}
                </Text>
                <Text style={styles.progressMetaTextDim}>
                  {formatTime(duration)}
                </Text>
              </View>
            )}

            {/* Scrub track — PanResponder wins over vertical FlatList */}
            <View
              {...progressPanResponder.panHandlers}
              collapsable={false}
              style={styles.progressBarWrapper}
              onLayout={(e) => {
                progressBarWidth.current = e.nativeEvent.layout.width;
              }}
            >
              {/* Time bubble — only visible while scrubbing */}
              {isScrubbing && (
                <View
                  style={[
                    styles.timeBubble,
                    {
                      left: `${progress * 100}%`,
                      bottom: PROGRESS_THUMB_SIZE + 10,
                      marginLeft: -28,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.timeBubbleText}>
                    {formatTime(progress * duration)}
                  </Text>
                  <View style={styles.timeBubbleTail} />
                </View>
              )}

              {/* Track bar (thicker while scrubbing) */}
              <View
                style={[
                  styles.progressBarBg,
                  isScrubbing && styles.progressBarBgActive,
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    isScrubbing && styles.progressBarFillActive,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>

              {/* Animated thumb — only fully visible while scrubbing */}
              <Animated.View
                style={[
                  styles.progressThumb,
                  {
                    left: `${progress * 100}%`,
                    marginLeft: -(PROGRESS_THUMB_SIZE / 2),
                    opacity: isScrubbing ? 1 : 0,
                    transform: [{ scale: scrubThumbScale }],
                  },
                ]}
                pointerEvents="none"
              />
            </View>
          </View>
        )}

        {/* عمود الإعجاب/التعليق — يسار الشاشة (تحت RTL يظهر بمحاذاة البداية) */}
        <View
          collapsable={false}
          style={[
            styles.rightActions,
            { left: ACTION_RAIL_EDGE_INSET, bottom: overlayBottomOffset + 7, gap: actionGap },
          ]}
        >
          {/* Profile Image + Follow */}
          <View style={styles.profileContainer}>
            <TouchableOpacityGH
              activeOpacity={0.85}
              onPress={handleProfilePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={styles.profileImageWrapper}>
                {item.user?.profileImage ? (
                  <Image
                    source={{ uri: item.user.profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <Text style={styles.profileEmoji}>👤</Text>
                )}
              </View>
            </TouchableOpacityGH>
            {creatorUserId &&
              String(creatorUserId) !== String(userInfo?._id) &&
              !isAlreadyFollowing && (
              <TouchableOpacityGH
                activeOpacity={0.8}
                onPress={handleFollowPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.followButton}
              >
                <Ionicons name="add" size={14} color="#FFF" />
              </TouchableOpacityGH>
            )}
          </View>

          {/* Like — icon at fixed size (no scale-in clip); hitSlop preserves comfortable tap */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLikePress(false)}
            hitSlop={{ top: 14, bottom: 10, left: 14, right: 14 }}
          >
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={ICON_SIZE}
              color={item.isLiked ? "#FF3366" : "#FFF"}
            />
            <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
              {formatNumber(item.likes || 0)}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              SoundService.play("tap");
              handleComment(item);
            }}
          >
            <Ionicons
              name="chatbubble-ellipses-sharp"
              size={ICON_SIZE}
              color="#FFF"
            />
            <Text style={styles.actionText}>
              {formatNumber(item.comments || 0)}
            </Text>
          </TouchableOpacity>

          {/* Bookmark Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              SoundService.play("tap");
              handleSave(item._id);
            }}
          >
            <Ionicons
              name={item.isSaved ? "bookmark" : "bookmark-outline"}
              size={ICON_SIZE}
              color="#FFF"
            />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              SoundService.play("tap");
              handleShare(item);
            }}
          >
            <Ionicons name="arrow-redo-sharp" size={ICON_SIZE} color="#FFF" />
          </TouchableOpacity>

          {/* Rotating Music Disc */}
          <TouchableOpacityGH style={styles.musicDiscContainer} onPress={handleProfilePress}>
            <Animated.View style={[styles.musicDiscOuter, { transform: [{ rotate: spin }] }]}>
              <View style={styles.musicDiscInner}>
                {item.user?.profileImage ? (
                  <Image
                    source={{ uri: item.user.profileImage }}
                    style={styles.musicDiscImage}
                  />
                ) : (
                  <View style={styles.musicDiscPlaceholder}>
                    <Ionicons
                      name="musical-note"
                      size={MUSIC_DISC_ICON_SIZE}
                      color="#FFF"
                    />
                  </View>
                )}
              </View>
              <View style={styles.musicDiscCenter} />
            </Animated.View>
          </TouchableOpacityGH>
        </View>
      </View>
    );
  },
);

VideoItem.displayName = "VideoItem";

const styles = StyleSheet.create({
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "relative",
    overflow: "hidden",
    direction: "ltr",
  },
  mediaLayer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
    overflow: "hidden",
    zIndex: 2,
  },
  videoTapCatch: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 40,
    /* left / right set inline — reserve side rail */
  },
  videoTapCatchInner: {
    flex: 1,
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  playPauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 54,
  },
  playPauseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  progressBarWrapper: {
    paddingTop: PROGRESS_WRAPPER_PADDING_TOP,
    paddingBottom: 0,
    justifyContent: "flex-end",
    minHeight: 32,
  },
  progressBarBg: {
    height: PROGRESS_TRACK_HEIGHT,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: PROGRESS_TRACK_HEIGHT,
    overflow: "hidden",
  },
  progressBarBgActive: {
    height: PROGRESS_TRACK_HEIGHT + 2,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: PROGRESS_TRACK_HEIGHT + 2,
  },
  progressBarFill: {
    height: PROGRESS_TRACK_HEIGHT,
    backgroundColor: "#FFF",
    borderRadius: PROGRESS_TRACK_HEIGHT,
  },
  progressBarFillActive: {
    height: PROGRESS_TRACK_HEIGHT + 2,
    backgroundColor: "#FF3366",
    borderRadius: PROGRESS_TRACK_HEIGHT + 2,
  },
  progressThumb: {
    position: "absolute",
    top: PROGRESS_THUMB_OFFSET,
    width: PROGRESS_THUMB_SIZE,
    height: PROGRESS_THUMB_SIZE,
    borderRadius: PROGRESS_THUMB_SIZE / 2,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#FF3366",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 5,
  },
  timeBubble: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  timeBubbleText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timeBubbleTail: {
    position: "absolute",
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "rgba(0,0,0,0.75)",
  },
  bufferingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 998,
  },
  timelineSection: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    zIndex: 200,
    flexDirection: "column",
    justifyContent: "flex-end",
    direction: "ltr",
  },
  progressMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 14,
  },
  progressMetaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressMetaTextDim: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomSection: {
    position: "absolute",
    zIndex: 100,
    pointerEvents: "box-none",
    direction: "ltr",
  },
  userInfo: {
    marginBottom: Math.round(ms(1)),
    alignSelf: "stretch",
  },
  username: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "bold",
    marginBottom: Math.round(ms(8)),
    textAlign: "right",
    writingDirection: "rtl",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: "#FFF",
    fontSize: fs(14),
    lineHeight: Math.round(ms(20)),
    marginBottom: Math.round(ms(10)),
    textAlign: "right",
    writingDirection: "rtl",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Math.round(ms(6)),
    alignSelf: "stretch",
  },
  musicText: {
    color: "#FFF",
    fontSize: fs(13),
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  rightActions: {
    position: "absolute",
    zIndex: 950,
    elevation: Platform.OS === "android" ? 40 : 0,
    alignItems: "center",
  },
  profileContainer: {
    position: "relative",
    alignItems: "center",
    marginBottom: Math.round(ms(10)),
    zIndex: 2,
    elevation: Platform.OS === "android" ? 50 : 0,
  },
  profileImageWrapper: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    borderWidth: 2,
    borderColor: "#FFF",
    overflow: "hidden",
    backgroundColor: "#FF3366",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profileEmoji: {
    fontSize: Math.round(PROFILE_SIZE * 0.46),
  },
  followButton: {
    position: "absolute",
    bottom: -Math.round(FOLLOW_BUTTON_SIZE * 0.42),
    width: FOLLOW_BUTTON_SIZE,
    height: FOLLOW_BUTTON_SIZE,
    borderRadius: FOLLOW_BUTTON_SIZE / 2,
    backgroundColor: "#FF3366",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
    elevation: Platform.OS === "android" ? 32 : 0,
  },
  actionButton: {
    alignItems: "center",
    marginBottom: Math.round(ms(7)),
  },
  actionText: {
    color: "#FFF",
    fontSize: fs(12),
    marginTop: Math.round(ms(4)),
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  likedHeart: {
    position: "relative",
  },
  heartGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FF3366",
    opacity: 0.3,
    borderRadius: 20,
    transform: [{ scale: 1.3 }],
  },
  musicDiscContainer: {
    alignItems: "center",
    marginTop: 2,
  },
  musicDiscOuter: {
    width: MUSIC_DISC_OUTER_SIZE,
    height: MUSIC_DISC_OUTER_SIZE,
    borderRadius: MUSIC_DISC_OUTER_SIZE / 2,
    borderWidth: 3,
    borderColor: "#555",
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  musicDiscInner: {
    width: MUSIC_DISC_INNER_SIZE,
    height: MUSIC_DISC_INNER_SIZE,
    borderRadius: MUSIC_DISC_INNER_SIZE / 2,
    borderWidth: 2.5,
    borderColor: "#888",
    overflow: "hidden",
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  musicDiscImage: {
    width: "100%",
    height: "100%",
  },
  musicDiscPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF3366",
  },
  musicDiscCenter: {
    position: "absolute",
    width: MUSIC_DISC_CENTER_SIZE,
    height: MUSIC_DISC_CENTER_SIZE,
    borderRadius: MUSIC_DISC_CENTER_SIZE / 2,
    backgroundColor: "#111",
    borderWidth: 2,
    borderColor: "#555",
  },
});

export default VideoItem;
