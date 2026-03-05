import React, { useRef, useState, useEffect, memo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  InteractionManager,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import SoundService from "../services/soundService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ICON_SIZE = Math.round(Math.min(SCREEN_WIDTH * 0.085, 32));

const VideoItem = memo(
  ({
    item,
    isActive,
    tabBarHeight,
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

    useEffect(() => {
      // shouldPlay={isActive} already handles play/pause declaratively.
      // This imperative effect only syncs local isPlaying state so the UI icon is correct.
      setIsPlaying(isActive);
    }, [isActive]);

    // Pause & unload on unmount so ExoPlayer always releases from the main thread.
    useEffect(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.pauseAsync().catch(() => {});
        }
      };
    }, []);

    // Format ms -> m:ss
    const formatTime = (ms) => {
      const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
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
        if (videoRef.current) {
          // Ensure video operations run on main thread
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
          // Flash the icon
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
        }
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
      <View style={styles.videoContainer}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDoubleTap}
          style={styles.videoTouchable}
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
              source={
                item.localSource ? item.localSource : { uri: item.videoUrl }
              }
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
        <View style={[styles.bottomSection, { bottom: tabBarHeight + 20 }]}>
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
          <View
            style={[styles.progressBarWrapper, { bottom: tabBarHeight + 8 }]}
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
                    bottom: 18,
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
                  marginLeft: -7,
                  transform: [{ scale: scrubThumbScale }],
                },
              ]}
              pointerEvents="none"
            />
          </View>
        )}

        {/* Side Actions */}
        <View style={[styles.rightActions, { bottom: tabBarHeight + 20 }]}>
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
    paddingVertical: 12,
    zIndex: 200,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: 12 - 7,
    width: 14,
    height: 14,
    borderRadius: 7,
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
  bottomSection: {
    position: "absolute",
    left: 16,
    right: 90,
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
    right: 12,
    gap: Math.max(SCREEN_HEIGHT * 0.014, 10),
    zIndex: 100,
    paddingBottom: 10,
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  profileImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
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
    fontSize: 28,
  },
  followButton: {
    position: "absolute",
    bottom: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
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
});

export default VideoItem;
