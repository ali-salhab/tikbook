import React, {
  useEffect,
  useState,
  useContext,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import axios from "axios";
import { Video } from "expo-av";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useNetInfo } from "@react-native-community/netinfo";
import CommentsModal from "../components/CommentsModal";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";

// Enable RTL
// Enable RTL logic moved to index.js

const HomeScreen = ({ navigation }) => {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const netInfo = useNetInfo();

  // Refs should be defined at the top level
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);
  const lastTap = useRef(0);
  const flatListRef = useRef(null);

  const fetchVideos = useCallback(async () => {
    // If no internet, don't try to fetch (avoids Network Error logs)
    if (netInfo.isConnected === false) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("📹 Fetching videos from:", `${BASE_URL}/videos`);
      const res = await axios.get(`${BASE_URL}/videos`, { timeout: 20000 }); // Increased timeout
      console.log("✅ Videos fetched:", res.data.length);

      // Map videos and ensure URLs are absolute
      const mappedVideos = (res.data || []).map((video) => ({
        ...video,
        isLiked: false,
        // If backend already returns an absolute URL (Cloudinary/HTTPS), use it directly.
        // Otherwise, build one from the API base (keeps support for local uploads).
        videoUrl: video.videoUrl?.startsWith("http")
          ? video.videoUrl
          : `${BASE_URL.replace("/api", "")}/${(video.videoUrl || "").replace(
              /\\/g,
              "/",
            )}`,
      }));

      console.log("📹 Videos ready for rendering:", mappedVideos.length);
      setVideos(mappedVideos);
    } catch (e) {
      console.error("❌ Error fetching videos:", e.message);
      if (e.response) {
        console.error("   Status:", e.response.status);
        console.error("   Data:", e.response.data);
      } else if (e.request) {
        console.error("   Request made but no response received");
      }
      setVideos([]); // show empty state instead of dummy content
    } finally {
      setLoading(false);
    }
  }, [netInfo.isConnected, BASE_URL]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVideos();
    setRefreshing(false);
  }, [fetchVideos]);

  // Refresh videos when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 HomeScreen focused - refreshing videos");
      if (netInfo.isConnected !== false) {
        fetchVideos();
      }
      
      // Cleanup: pause video when screen loses focus
      return () => {
        console.log("🔇 HomeScreen unfocused - pausing video");
        if (videoRef.current) {
          videoRef.current.pauseAsync().catch(() => {});
          videoRef.current.setIsMutedAsync(true).catch(() => {});
        }
      };
    }, [fetchVideos, netInfo.isConnected]),
  );

  const formatNumber = (num) => {
    // Handle if it's an array (likes array)
    const count = Array.isArray(num) ? num.length : num;

    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "م";
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + "ألف";
    }
    return count.toString();
  };

  const handleLike = async (videoId) => {
    // Update UI immediately
    setVideos((prevVideos) =>
      prevVideos.map((video) => {
        if (video._id === videoId) {
          const currentLikes = Array.isArray(video.likes) ? video.likes : [];
          const newIsLiked = !video.isLiked;
          const newLikes = newIsLiked
            ? [...currentLikes, "temp-user-id"]
            : currentLikes.filter((id) => id !== "temp-user-id");

          return {
            ...video,
            isLiked: newIsLiked,
            likes: newLikes,
          };
        }
        return video;
      }),
    );

    // Send to backend
    try {
      await axios.put(
        `${BASE_URL}/videos/${videoId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
    } catch (error) {
      console.log("Error liking video:", error);
      // Revert on error
      setVideos((prevVideos) =>
        prevVideos.map((video) => {
          if (video._id === videoId) {
            return {
              ...video,
              isLiked: !video.isLiked,
              likes: video.isLiked ? video.likes + 1 : video.likes - 1,
            };
          }
          return video;
        }),
      );
    }
  };

  const handleShare = async (video) => {
    try {
      await Share.share({
        message: `شاهد هذا الفيديو الرائع من @${video.user.username}: ${video.description}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleComment = (video) => {
    setSelectedVideo(video);
    setCommentsVisible(true);
  };

  const closeComments = () => {
    setCommentsVisible(false);
    setSelectedVideo(null);
  };

  const VideoItem = ({ item, isActive }) => {
    useEffect(() => {
      if (videoRef.current) {
        if (isActive) {
          videoRef.current.playAsync();
        } else {
          videoRef.current.pauseAsync();
        }
      }
    }, [isActive]);

    const handleDoubleTap = () => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Double tap detected
        onLikePress();
        animateHeart();
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
      animateLike();
      handleLike(item._id);
    };

    const handleProfilePress = () => {
      // Check if viewing own profile or another user's profile
      if (item.user._id === userInfo._id) {
        navigation.navigate("Profile");
      } else {
        navigation.navigate("UserProfile", { userId: item.user._id });
      }
    };

    const isImage = (url) => {
      if (!url) return false;
      const lowerUrl = url.toLowerCase();
      // Check for common image extensions or Cloudinary resource type
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
        </TouchableOpacity>

        {/* Bottom Info */}
        <View style={styles.bottomSection}>
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

        {/* Side Actions */}
        <View style={styles.rightActions}>
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
            <View style={styles.followButton}>
              <Ionicons name="add" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* Like Button - TikTok Style */}
          <TouchableOpacity style={styles.actionButton} onPress={onLikePress}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              {item.isLiked ? (
                <View style={styles.likedHeart}>
                  <Ionicons name="heart" size={35} color="#FE2C55" />
                  <View style={styles.heartGlow} />
                </View>
              ) : (
                <Ionicons name="heart-outline" size={35} color="#FFF" />
              )}
            </Animated.View>
            <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
              {formatNumber(item.likes || 0)}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleComment(item)}
          >
            <Ionicons name="chatbubble-ellipses-sharp" size={35} color="#FFF" />
            <Text style={styles.actionText}>
              {formatNumber(item.comments || 0)}
            </Text>
          </TouchableOpacity>

          {/* Bookmark Button */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={35} color="#FFF" />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="arrow-redo-sharp" size={35} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderItem = ({ item, index }) => (
    <VideoItem item={item} isActive={index === activeVideoIndex} />
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }).current;

  // Conditional rendering at the end of the component
  if (netInfo.isConnected === false && videos.length === 0) {
    return <OfflineNotice onRetry={fetchVideos} />;
  }

  if (loading && videos.length === 0) {
    return <LoadingIndicator />;
  }

  if (!videos.length) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <Text style={styles.loadingText}>لا توجد فيديوهات متاحة حالياً</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVideos}>
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="search" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.tabsContainer}>
          <TouchableOpacity style={styles.tabButton}>
            <Text style={styles.tabText}>أتابعه</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.tabButtonActive}>
            <Text style={styles.tabTextActive}>لك</Text>
            <View style={styles.activeIndicator} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("LiveStreamsList")}
        >
          <Ionicons name="tv-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={Dimensions.get("window").height}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 80,
        }}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFF"
            title="سحب للتحديث"
            titleColor="#FFF"
            progressViewOffset={insets.top + 60}
          />
        }
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsVisible}
        onClose={closeComments}
        videoId={selectedVideo?._id}
        initialComments={selectedVideo?.comments || []}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  iconButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  liveText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    position: "absolute",
    bottom: 2,
  },
  tabButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tabButtonActive: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    position: "relative",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 17,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold",
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  videoContainer: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
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
  bottomSection: {
    position: "absolute",
    bottom: 140,
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
    bottom: 140,
    gap: 16,
    zIndex: 100,
    paddingBottom: 20,
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#FE2C55",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

export default HomeScreen;
