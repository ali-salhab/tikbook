import React, { useRef, useState, useEffect, memo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  PanResponder,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  InteractionManager,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import SoundService from "../services/soundService";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ICON_SIZE = Math.round(Math.min(Math.max(SCREEN_WIDTH * 0.095, 32), 40));
const PROFILE_SIZE = Math.round(Math.min(Math.max(SCREEN_WIDTH * 0.15, 52), 60));
const FOLLOW_BUTTON_SIZE = Math.round(
  Math.min(Math.max(PROFILE_SIZE * 0.38, 22), 24),
);
const ACTION_RAIL_RIGHT = Math.round(
  Math.min(Math.max(SCREEN_WIDTH * 0.03, 10), 14),
);
const ACTION_GAP = Math.round(Math.min(Math.max(SCREEN_HEIGHT * 0.012, 8), 12));
const MUSIC_DISC_OUTER_SIZE = Math.round(
  Math.min(Math.max(SCREEN_WIDTH * 0.19, 70), 82),
);
const MUSIC_DISC_INNER_SIZE = MUSIC_DISC_OUTER_SIZE - 14;
const MUSIC_DISC_CENTER_SIZE = Math.round(
  Math.min(Math.max(MUSIC_DISC_OUTER_SIZE * 0.2, 14), 16),
);
const MUSIC_DISC_ICON_SIZE = Math.round(
  Math.min(Math.max(MUSIC_DISC_INNER_SIZE * 0.22, 14), 18),
);
const ACTION_RAIL_WIDTH =
  Math.max(PROFILE_SIZE, MUSIC_DISC_OUTER_SIZE, ICON_SIZE) + 18;
const PROGRESS_TRACK_HEIGHT = 3;
const PROGRESS_THUMB_SIZE = Math.round(
  Math.min(Math.max(SCREEN_WIDTH * 0.04, 14), 18),
);
const PROGRESS_WRAPPER_VERTICAL = 10;
const PROGRESS_THUMB_OFFSET =
  PROGRESS_WRAPPER_VERTICAL -
  Math.round((PROGRESS_THUMB_SIZE - PROGRESS_TRACK_HEIGHT) / 2);

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
    formatNumber,
  }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [progress, setProgress] = useState(0); // 0-1
    const [duration, setDuration] = useState(0);
    const progressBarWidth = useRef(0);
    const isSeeking = useRef(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const scrubThumbScale = useRef(new Animated.Value(1)).current;
    const playIconOpacity = useRef(new Animated.Value(0)).current;
    const playIconScale = useRef(new Animated.Value(0.6)).current;

    // Per-item animation refs (previously shared in HomeScreen — caused all items to share the same animation)
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;
    const heartScale = useRef(new Animated.Value(0)).current;
    const lastTap = useRef(0);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const rotationRef = useRef(null);
    const itemHeight = Math.max(viewportHeight || SCREEN_HEIGHT, 1);

    // Simple, device-independent bottom positioning.
    // The video container's bottom edge sits exactly at the top of the bottom nav bar
    // (since itemHeight = SCREEN_HEIGHT - tabBarHeight from the parent).
    // Using fixed pixel offsets keeps the layout identical across all screen sizes.
    const progressBottomOffset = 0;        // progress bar flush at nav bar top edge
    const overlayBottomOffset = 44;        // username/description/audio above progress bar
    const actionGap = Math.max(Math.round(itemHeight * 0.014), 8);
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

    // PanResponder for draggable progress thumb
    const progressPanResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          isSeeking.current = true;
          setIsScrubbing(true);
          Animated.spring(scrubThumbScale, {
            toValue: 1.8,
            useNativeDriver: true,
            friction: 6,
            tension: 80,
          }).start();
          const barW = progressBarWidth.current;
          if (!barW) return;
          const relX = evt.nativeEvent.locationX;
          const newP = Math.max(0, Math.min(relX / barW, 1));
          setProgress(newP);
        },
        onPanResponderMove: (evt) => {
          const barW = progressBarWidth.current;
          if (!barW) return;
          const relX = evt.nativeEvent.locationX;
          const newP = Math.max(0, Math.min(relX / barW, 1));
          setProgress(newP);
        },
        onPanResponderRelease: (evt) => {
          const barW = progressBarWidth.current;
          const relX = evt.nativeEvent.locationX;
          const newP = barW ? Math.max(0, Math.min(relX / barW, 1)) : progress;
          setProgress(newP);
          if (videoRef.current && duration > 0) {
            // Ensure video operations run on main thread
            InteractionManager.runAfterInteractions(() => {
              if (videoRef.current && duration > 0) {
                videoRef.current
                  .setPositionAsync(Math.floor(newP * duration))
                  .catch(() => {});
              }
            });
          }
          isSeeking.current = false;
          setIsScrubbing(false);
          Animated.spring(scrubThumbScale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 6,
            tension: 80,
          }).start();
        },
        onPanResponderTerminate: () => {
          isSeeking.current = false;
          setIsScrubbing(false);
          Animated.spring(scrubThumbScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        },
      }),
    ).current;

    const handleDoubleTap = () => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Double tap — like
        onLikePress();
        animateHeart();
      } else {
        // Single tap — play/pause
        togglePlayback();
      }
      lastTap.current = now;
    };

    const animateHeart = () => {
      heartOpacity.setValue(1);
      heartScale.setValue(0);

      Animated.parallel([
        Animated.timing(heartScale, {
          toValue: 1.5,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(heartOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    const animateLike = () => {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.5,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const onLikePress = () => {
      SoundService.play("like");
      animateLike();
      handleLike(item._id);
    };

    const handleProfilePress = () => {
      if (item.user._id === userInfo._id) {
        navigation.navigate("Profile");
      } else {
        navigation.navigate("UserProfile", { userId: item.user._id });
      }
    };

    const isAlreadyFollowing =
      item.user._id !== userInfo?._id &&
      Array.isArray(item.user.followers) &&
      item.user.followers.includes(userInfo?._id);

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
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDoubleTap}
          style={styles.videoTouchable}
        >
          <GestureDetector gesture={pinchGesture}>
            <Reanimated.View style={[styles.mediaContainer, mediaZoomStyle]}>
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
                  isMuted={false}
                  useNativeControls={false}
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                      setIsBuffering(status.isBuffering || false);
                      if (status.durationMillis && status.durationMillis > 0) {
                        setDuration(status.durationMillis);
                        if (!isSeeking.current) {
                          setProgress(
                            status.positionMillis / status.durationMillis,
                          );
                        }
                      }
                    }
                  }}
                />
              )}
            </Reanimated.View>
          </GestureDetector>

          {/* Double-tap heart animation */}
          <Animated.View
            style={[
              styles.heartOverlay,
              {
                opacity: heartOpacity,
                transform: [{ scale: heartScale }],
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons name="heart" size={120} color="#FFF" />
          </Animated.View>

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
        </TouchableOpacity>

        {/* Bottom Info */}
        <View style={[styles.bottomSection, { bottom: overlayBottomOffset }]}>
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{item.user.username}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.musicRow}>
              <Ionicons name="musical-notes" size={15} color="#FFF" />
              <Text style={styles.musicText}>
                الصوت الأصلي - {item.user.username}
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

        {/* Progress bar with draggable thumb */}
        {!isImage(item.videoUrl) && (
          <View style={[styles.progressMetaRow, { bottom: 22 }]}> 
            <Text style={styles.progressMetaText}>
              {formatTime(progress * duration)}
            </Text>
            <Text style={styles.progressMetaText}>{formatTime(duration)}</Text>
          </View>
        )}

        {!isImage(item.videoUrl) && (
          <View
            style={[styles.progressBarWrapper, { bottom: progressBottomOffset }]}
            onLayout={(e) => {
              progressBarWidth.current = e.nativeEvent.layout.width;
            }}
            {...progressPanResponder.panHandlers}
          >
            {/* Time bubble — only visible while scrubbing */}
            {isScrubbing && (
              <View
                style={[
                  styles.timeBubble,
                  {
                    left: `${progress * 100}%`,
                    bottom: PROGRESS_THUMB_SIZE + 6,
                    marginLeft: -26,
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.timeBubbleText}>
                  {formatTime(progress * duration)}
                </Text>
                {/* Little triangle */}
                <View style={styles.timeBubbleTail} />
              </View>
            )}

            {/* Track bar */}
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>

            {/* Animated thumb */}
            <Animated.View
              style={[
                styles.progressThumb,
                {
                  left: `${progress * 100}%`,
                  marginLeft: -(PROGRESS_THUMB_SIZE / 2),
                  transform: [{ scale: scrubThumbScale }],
                },
              ]}
              pointerEvents="none"
            />
          </View>
        )}

        {/* Side Actions */}
        <View
          style={[
            styles.rightActions,
            { bottom: overlayBottomOffset + 7, gap: actionGap },
          ]}
        >
          {/* Profile Image */}
          <TouchableOpacity
            style={styles.profileContainer}
            onPress={handleProfilePress}
          >
            <View style={styles.profileImageWrapper}>
              {item.user.profileImage ? (
                <Image
                  source={{ uri: item.user.profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <Text style={styles.profileEmoji}>👤</Text>
              )}
            </View>
            {item.user._id !== userInfo?._id && !isAlreadyFollowing && (
              <View style={styles.followButton}>
                <Ionicons name="add" size={14} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Like Button - TikTok Style */}
          <TouchableOpacity style={styles.actionButton} onPress={onLikePress}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              {item.isLiked ? (
                <View style={styles.likedHeart}>
                  <Ionicons name="heart" size={ICON_SIZE} color="#FE2C55" />
                  <View style={styles.heartGlow} />
                </View>
              ) : (
                <Ionicons name="heart-outline" size={ICON_SIZE} color="#FFF" />
              )}
            </Animated.View>
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
          <TouchableOpacity style={styles.musicDiscContainer} onPress={handleProfilePress}>
            <Animated.View style={[styles.musicDiscOuter, { transform: [{ rotate: spin }] }]}>
              <View style={styles.musicDiscInner}>
                {item.user.profileImage ? (
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
          </TouchableOpacity>
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
  },
  mediaContainer: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoTouchable: {
    width: "100%",
    height: "100%",
  },
  heartOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -60,
    marginLeft: -60,
    zIndex: 1000,
  },
  playPauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
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
    position: "absolute",
    left: 0,
    right: 0,
    paddingVertical: PROGRESS_WRAPPER_VERTICAL,
    zIndex: 200,
  },
  progressBarBg: {
    height: PROGRESS_TRACK_HEIGHT,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  progressBarFill: {
    height: PROGRESS_TRACK_HEIGHT,
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: PROGRESS_THUMB_OFFSET,
    width: PROGRESS_THUMB_SIZE,
    height: PROGRESS_THUMB_SIZE,
    borderRadius: PROGRESS_THUMB_SIZE / 2,
    backgroundColor: "#FFF",
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
  progressMetaRow: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 210,
  },
  progressMetaText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomSection: {
    position: "absolute",
    left: 16,
    right: ACTION_RAIL_RIGHT + ACTION_RAIL_WIDTH,
    zIndex: 100,
  },
  userInfo: {
    marginBottom: 12,
  },
  username: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: "#FFF",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  musicText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "500",
  },
  rightActions: {
    position: "absolute",
    right: ACTION_RAIL_RIGHT,
    gap: ACTION_GAP,
    zIndex: 100,
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  profileImageWrapper: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: "#FFF",
    overflow: "hidden",
    backgroundColor: "#FE2C55",
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
    backgroundColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: "#FE2C55",
    opacity: 0.3,
    borderRadius: 20,
    transform: [{ scale: 1.3 }],
  },
  likedText: {
    color: "#FE2C55",
    fontWeight: "bold",
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
    backgroundColor: "#FE2C55",
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
