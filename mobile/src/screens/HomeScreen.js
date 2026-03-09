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
  PixelRatio,
  Image,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Share,
  ActivityIndicator,
  PanResponder,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import axios from "axios";
import { Video } from "expo-av";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNetInfo } from "@react-native-community/netinfo";
import CommentsModal from "../components/CommentsModalEnhanced";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";
import VideoItem from "../components/VideoItem";
import NetworkErrorModal, {
  classifyError,
} from "../components/NetworkErrorModal";
import videoService from "../services/videoService";
import SoundService from "../services/soundService";
import { ms, fs } from "../utils/responsive";

// Enable RTL
// Enable RTL logic moved to index.js

const HomeScreen = ({ navigation, route }) => {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const isScreenFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(null); // holds the raw error object
  const netInfo = useNetInfo();

  // Refs should be defined at the top level
  const flatListRef = useRef(null);
  // Track viewed video IDs so each video is only counted once per session
  const viewedIdsRef = useRef(new Set());
  // Keep refs in sync with latest state/context so onViewableItemsChanged (stable ref) can access them
  const videosRef = useRef([]);
  const userTokenRef = useRef(userToken);
  const BASE_URL_REF = useRef(BASE_URL);

  // Keep mutable refs in sync
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);
  useEffect(() => {
    userTokenRef.current = userToken;
  }, [userToken]);
  useEffect(() => {
    BASE_URL_REF.current = BASE_URL;
  }, [BASE_URL]);

  // Scroll to a specific video when navigated from Profile grid tap
  useEffect(() => {
    const targetId = route?.params?.videoId;
    if (!targetId || videos.length === 0) return;
    const idx = videos.findIndex((v) => v._id === targetId);
    if (idx !== -1 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
        setActiveVideoIndex(idx);
      }, 100);
    }
    // Clear the param so re-focusing doesn't re-scroll
    navigation.setParams({ videoId: undefined });
  }, [route?.params?.videoId, videos]);

  const fetchVideos = useCallback(async () => {
    // If no internet, don't try to fetch (avoids Network Error logs)
    if (netInfo.isConnected === false) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("📹 Fetching videos from:", `${BASE_URL}/videos`);
      console.log("⏱️  Using 60s timeout for Render.com cold start...");

      const config = {};
      if (userToken) {
        config.headers = { Authorization: `Bearer ${userToken}` };
      }

      const res = await axios.get(`${BASE_URL}/videos`, {
        ...config,
        timeout: 60000, // 60 seconds for Render.com cold start
      });
      console.log("✅ Videos fetched:", res.data.length);

      const currentUserId = userInfo?._id?.toString();

      // Map videos and ensure URLs are absolute
      const mappedVideos = (res.data || []).map((video) => ({
        ...video,
        isLiked:
          typeof video.isLiked === "boolean"
            ? video.isLiked
            : Array.isArray(video.likes) && currentUserId
              ? video.likes.some((id) => id?.toString?.() === currentUserId)
              : false,
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
      // Show error modal when fetch fails
      setNetworkError(e);
    } finally {
      setLoading(false);
    }
  }, [netInfo.isConnected, BASE_URL, userToken, userInfo?._id]);

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

      // Cleanup: shouldPlay={isActive} handles pause automatically when screen unfocuses
      return () => {
        console.log("🔇 HomeScreen unfocused");
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
    const currentUserId = userInfo?._id;

    if (!userToken || !currentUserId) {
      return;
    }

    // Update UI immediately
    setVideos((prevVideos) =>
      prevVideos.map((video) => {
        if (video._id === videoId) {
          const currentLikes = Array.isArray(video.likes) ? video.likes : [];
          const newIsLiked = !video.isLiked;
          const newLikes = newIsLiked
            ? [...currentLikes, currentUserId]
            : currentLikes.filter(
                (id) => id?.toString?.() !== currentUserId.toString(),
              );

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
      const res = await axios.put(
        `${BASE_URL}/videos/${videoId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );

      if (Array.isArray(res.data?.likes)) {
        const syncedLikes = res.data.likes;
        const syncedIsLiked = syncedLikes.some(
          (id) => id?.toString?.() === currentUserId.toString(),
        );

        setVideos((prevVideos) =>
          prevVideos.map((video) =>
            video._id === videoId
              ? {
                  ...video,
                  likes: syncedLikes,
                  isLiked: syncedIsLiked,
                }
              : video,
          ),
        );
      }
    } catch (error) {
      console.log("Error liking video:", error);
      // Revert the optimistic update on error (don't reload all videos)
      setVideos((prevVideos) =>
        prevVideos.map((video) => {
          if (video._id === videoId) {
            const currentLikes = Array.isArray(video.likes) ? video.likes : [];
            const revertedIsLiked = !video.isLiked;
            const revertedLikes = revertedIsLiked
              ? [...currentLikes, currentUserId]
              : currentLikes.filter(
                  (id) => id?.toString?.() !== currentUserId.toString(),
                );
            return { ...video, isLiked: revertedIsLiked, likes: revertedLikes };
          }
          return video;
        }),
      );
    }
  };

  const handleShare = async (video) => {
    try {
      const deepLink = `tikbook://video/${video._id}`;
      // Play Store link (shown as fallback — update once app is live)
      const playStoreUrl = `https://play.google.com/store/apps/details?id=com.tikbook.com`;

      const shareMessage =
        `🎵 شاهد هذا الفيديو الرائع من @${video.user.username} على تطبيق TikBook!` +
        (video.description ? `\n\n${video.description}` : "") +
        `\n\n▶️ افتح في التطبيق:\n${deepLink}` +
        `\n\n📲 إذا لم يكن التطبيق مثبتاً لديك:\n${playStoreUrl}`;

      await Share.share(
        {
          message: shareMessage,
          url: deepLink, // iOS: opens app directly from share sheet
          title: `فيديو من @${video.user.username} - TikBook`,
        },
        {
          dialogTitle: "مشاركة الفيديو",
          subject: `شاهد هذا الفيديو على TikBook`,
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleSave = async (videoId) => {
    // Optimistic update
    setVideos((prevVideos) =>
      prevVideos.map((video) => {
        if (video._id === videoId) {
          return {
            ...video,
            isSaved: !video.isSaved,
          };
        }
        return video;
      }),
    );

    // Send to backend
    try {
      await videoService.saveVideo(videoId);
    } catch (error) {
      console.log("Error saving video:", error);
      // Revert on error
      setVideos((prevVideos) =>
        prevVideos.map((video) => {
          if (video._id === videoId) {
            return {
              ...video,
              isSaved: !video.isSaved,
            };
          }
          return video;
        }),
      );
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

  const renderItem = React.useCallback(
    ({ item, index }) => (
      <VideoItem
        item={item}
        isActive={index === activeVideoIndex && isScreenFocused}
        tabBarHeight={tabBarHeight}
        userInfo={userInfo}
        navigation={navigation}
        handleLike={handleLike}
        handleSave={handleSave}
        handleComment={handleComment}
        handleShare={handleShare}
        formatNumber={formatNumber}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeVideoIndex, isScreenFocused, tabBarHeight, userInfo],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setActiveVideoIndex(index);

      // Increment view count once per video per session
      const video = videosRef.current[index];
      if (video?._id && !viewedIdsRef.current.has(video._id)) {
        viewedIdsRef.current.add(video._id);
        const token = userTokenRef.current;
        const baseUrl = BASE_URL_REF.current;
        axios
          .put(
            `${baseUrl}/videos/${video._id}/view`,
            {},
            token ? { headers: { Authorization: `Bearer ${token}` } } : {},
          )
          .catch(() => {});
      }
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

        {/* Network error modal — must live here because this is an early return */}
        <NetworkErrorModal
          visible={!!networkError}
          error={networkError}
          onRetry={fetchVideos}
          onDismiss={() => setNetworkError(null)}
        />
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
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Users")}
        >
          <Ionicons name="search" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => navigation.navigate("Friends")}
          >
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
          onPress={() => navigation.navigate("LiveRooms")}
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
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
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

      {/* Network / Server Error Modal */}
      <NetworkErrorModal
        visible={!!networkError}
        error={networkError}
        onRetry={fetchVideos}
        onDismiss={() => setNetworkError(null)}
      />
    </View>
  );
};

// Responsive icon size based on screen width
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ICON_SIZE = Math.round(Math.min(SCREEN_WIDTH * 0.085, 32));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    position: "absolute",
    top: ms(50),
    left: 0,
    right: 0,
    height: ms(50),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(20),
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(20),
  },
  iconButton: {
    padding: ms(8),
    alignItems: "center",
    justifyContent: "center",
  },
  liveText: {
    color: "#FFF",
    fontSize: fs(10),
    fontWeight: "bold",
    position: "absolute",
    bottom: ms(2),
  },
  tabButton: {
    paddingHorizontal: ms(4),
    paddingVertical: ms(8),
  },
  tabButtonActive: {
    paddingHorizontal: ms(4),
    paddingVertical: ms(8),
    position: "relative",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: fs(17),
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#FFF",
    fontSize: fs(17),
    fontWeight: "bold",
  },
  divider: {
    width: 1,
    height: ms(12),
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: ms(4),
    right: ms(4),
    height: ms(3),
    backgroundColor: "#FFF",
    borderRadius: ms(2),
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#000",
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
    marginTop: ms(-60),
    marginLeft: ms(-60),
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
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: ms(4),
  },
  progressBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingVertical: ms(12),
    zIndex: 200,
  },
  progressBarBg: {
    height: ms(3),
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: ms(2),
  },
  progressBarFill: {
    height: ms(3),
    backgroundColor: "#FFF",
    borderRadius: ms(2),
  },
  progressThumb: {
    position: "absolute",
    top: ms(12) - ms(7),
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
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
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(8),
    alignItems: "center",
  },
  timeBubbleText: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timeBubbleTail: {
    position: "absolute",
    bottom: ms(-5),
    width: 0,
    height: 0,
    borderLeftWidth: ms(5),
    borderRightWidth: ms(5),
    borderTopWidth: ms(5),
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
    left: ms(16),
    right: ms(90),
    zIndex: 100,
  },
  userInfo: {
    marginBottom: ms(12),
  },
  username: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "bold",
    marginBottom: ms(8),
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    color: "#FFF",
    fontSize: fs(14),
    lineHeight: ms(20),
    marginBottom: ms(10),
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
  },
  musicText: {
    color: "#FFF",
    fontSize: fs(14),
    fontWeight: "500",
  },
  rightActions: {
    position: "absolute",
    right: ms(12),
    gap: Math.max(SCREEN_HEIGHT * 0.014, 10),
    zIndex: 100,
    paddingBottom: ms(10),
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: ms(12),
  },
  profileImageWrapper: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(25),
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
    fontSize: fs(28),
  },
  followButton: {
    position: "absolute",
    bottom: ms(-10),
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    alignItems: "center",
    marginBottom: ms(8),
  },
  actionText: {
    color: "#FFF",
    fontSize: fs(12),
    marginTop: ms(4),
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
    borderRadius: ms(20),
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
    fontSize: fs(18),
    fontWeight: "bold",
  },
  retryButton: {
    marginTop: ms(20),
    backgroundColor: "#FE2C55",
    paddingVertical: ms(10),
    paddingHorizontal: ms(25),
    borderRadius: ms(8),
  },
  retryButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

export default HomeScreen;
