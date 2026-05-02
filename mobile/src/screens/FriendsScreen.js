import React, {
  useState,
  useRef,
  useContext,
  useCallback,
} from "react";
import GradientBackground from "../components/GradientBackground";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Share,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNetInfo } from "@react-native-community/netinfo";
import CommentsModal from "../components/CommentsModalEnhanced";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";
import NetworkErrorModal from "../components/NetworkErrorModal";
import VideoItem from "../components/VideoItem";
import videoService from "../services/videoService";
import SoundService from "../services/soundService";
import { ms, fs, getWindowDimensions } from "../utils/responsive";

const FriendsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userToken, userInfo, BASE_URL } = useContext(AuthContext);
  const tabBarHeight = useBottomTabBarHeight();
  const isScreenFocused = useIsFocused();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [friendsVideos, setFriendsVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const netInfo = useNetInfo();

  const flatListRef = useRef(null);
  const [feedHeight, setFeedHeight] = useState(
    Math.max(getWindowDimensions().height - tabBarHeight, 1),
  );

  const pageHeight = Math.max(
    feedHeight || getWindowDimensions().height - tabBarHeight,
    1,
  );

  const handleFeedLayout = useCallback((event) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setFeedHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    }
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      if (!flatListRef.current || friendsVideos.length === 0) return;

      const rawOffset = event.nativeEvent.contentOffset.y;
      const nextIndex = Math.max(
        0,
        Math.min(friendsVideos.length - 1, Math.round(rawOffset / pageHeight)),
      );
      const snappedOffset = nextIndex * pageHeight;

      if (Math.abs(rawOffset - snappedOffset) > 1) {
        flatListRef.current.scrollToOffset({
          offset: snappedOffset,
          animated: false,
        });
      }
    },
    [pageHeight, friendsVideos.length],
  );

  const formatNumber = useCallback((num) => {
    const count = Array.isArray(num) ? num.length : num;
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "م";
    if (count >= 1000) return (count / 1000).toFixed(1) + "ألف";
    return (count ?? 0).toString();
  }, []);

  const fetchFriendsVideos = useCallback(async () => {
    if (netInfo.isConnected === false) return;
    if (!userToken) {
      setFriendsVideos([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await axios.get(`${BASE_URL}/videos/following`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      const currentUserId = userInfo?._id?.toString();
      const raw = Array.isArray(res.data) ? res.data : [];

      const mapped = raw.map((video) => ({
        ...video,
        isLiked:
          typeof video.isLiked === "boolean"
            ? video.isLiked
            : Array.isArray(video.likes) && currentUserId
              ? video.likes.some((id) => id?.toString?.() === currentUserId)
              : false,
        videoUrl: video.videoUrl?.startsWith("http")
          ? video.videoUrl
          : `${BASE_URL.replace("/api", "")}/${(video.videoUrl || "").replace(
              /\\/g,
              "/",
            )}`,
      }));

      setFriendsVideos(mapped);
      setNetworkError(null);
    } catch (e) {
      console.log("❌ Error fetching friends videos:", e.message);
      setFriendsVideos([]);
      setNetworkError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    BASE_URL,
    netInfo.isConnected,
    userToken,
    userInfo?._id,
  ]);

  const handleComment = useCallback((video) => {
    setSelectedVideo(video);
    setCommentsVisible(true);
  }, []);

  const handleShare = useCallback(async (video) => {
    try {
      const deepLink = `tikbook://video/${video._id}`;
      const playStoreUrl =
        "https://play.google.com/store/apps/details?id=com.tikbook.com";
      const shareMessage =
        `🎵 شاهد هذا الفيديو الرائع من @${video.user.username} على تطبيق TikBook!` +
        (video.description ? `\n\n${video.description}` : "") +
        `\n\n▶️ افتح في التطبيق:\n${deepLink}` +
        `\n\n📲 إذا لم يكن التطبيق مثبتاً لديك:\n${playStoreUrl}`;

      await Share.share(
        {
          message: shareMessage,
          url: deepLink,
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
  }, []);

  const handleSave = useCallback(async (videoId) => {
    setFriendsVideos((prev) =>
      prev.map((video) =>
        video._id === videoId
          ? { ...video, isSaved: !video.isSaved }
          : video,
      ),
    );

    try {
      await videoService.saveVideo(videoId);
    } catch {
      setFriendsVideos((prev) =>
        prev.map((video) =>
          video._id === videoId
            ? { ...video, isSaved: !video.isSaved }
            : video,
        ),
      );
    }
  }, []);

  const handleLike = useCallback(
    async (videoId) => {
      const currentUserId = userInfo?._id;
      if (!userToken || !currentUserId) return;

      setFriendsVideos((prev) =>
        prev.map((video) => {
          if (video._id !== videoId) return video;
          const currentLikes = Array.isArray(video.likes)
            ? video.likes
            : [];
          const newIsLiked = !video.isLiked;
          const newLikes = newIsLiked
            ? [...currentLikes, currentUserId]
            : currentLikes.filter(
                (id) => id?.toString?.() !== currentUserId.toString(),
              );
          return { ...video, isLiked: newIsLiked, likes: newLikes };
        }),
      );

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

          setFriendsVideos((prev) =>
            prev.map((video) =>
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
        setFriendsVideos((prev) =>
          prev.map((video) => {
            if (video._id !== videoId) return video;
            const currentLikes = Array.isArray(video.likes)
              ? video.likes
              : [];
            const revertedIsLiked = !video.isLiked;
            const revertedLikes = revertedIsLiked
              ? [...currentLikes, currentUserId]
              : currentLikes.filter(
                  (id) => id?.toString?.() !== currentUserId.toString(),
                );
            return { ...video, isLiked: revertedIsLiked, likes: revertedLikes };
          }),
        );
      }
    },
    [userInfo, userToken, BASE_URL],
  );

  const handleFollow = useCallback(
    async (targetUserId) => {
      if (!userToken || !userInfo?._id || !targetUserId) return;
      if (String(targetUserId) === String(userInfo._id)) return;

      setFriendsVideos((prev) =>
        prev.map((v) =>
          v.user?._id === targetUserId
            ? {
                ...v,
                user: {
                  ...v.user,
                  followers: Array.isArray(v.user.followers)
                    ? [
                        ...v.user.followers.filter(
                          (f) =>
                            String(
                              typeof f === "object" ? f?._id : f,
                            ) !== String(userInfo._id),
                        ),
                        userInfo._id,
                      ]
                    : [userInfo._id],
                },
              }
            : v,
        ),
      );

      try {
        await axios.put(
          `${BASE_URL}/users/${targetUserId}/follow`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        SoundService.play("notification");
      } catch (err) {
        console.log("Follow error:", err?.response?.data || err.message);
        setFriendsVideos((prev) =>
          prev.map((v) =>
            v.user?._id === targetUserId
              ? {
                  ...v,
                  user: {
                    ...v.user,
                    followers: Array.isArray(v.user.followers)
                      ? v.user.followers.filter(
                          (f) =>
                            String(
                              typeof f === "object" ? f?._id : f,
                            ) !== String(userInfo._id),
                        )
                      : [],
                  },
                }
              : v,
          ),
        );
      }
    },
    [userToken, userInfo, BASE_URL],
  );

  const closeComments = useCallback(() => {
    setCommentsVisible(false);
    setSelectedVideo(null);
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setActiveVideoIndex(index);
    }
  }).current;

  const renderItem = useCallback(
    ({ item, index }) => (
      <VideoItem
        item={item}
        isActive={index === activeVideoIndex && isScreenFocused}
        tabBarHeight={tabBarHeight}
        viewportHeight={pageHeight}
        userInfo={userInfo}
        navigation={navigation}
        handleLike={handleLike}
        handleSave={handleSave}
        handleComment={handleComment}
        handleShare={handleShare}
        handleFollow={handleFollow}
        formatNumber={formatNumber}
      />
    ),
    [
      activeVideoIndex,
      isScreenFocused,
      pageHeight,
      tabBarHeight,
      userInfo,
      navigation,
      handleLike,
      handleSave,
      handleComment,
      handleShare,
      handleFollow,
      formatNumber,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      if (netInfo.isConnected !== false) {
        fetchFriendsVideos();
      } else {
        setLoading(false);
      }
      return () => {
        console.log("🔇 FriendsScreen unfocused");
      };
    }, [fetchFriendsVideos, netInfo.isConnected]),
  );

  const onRefresh = useCallback(() => {
    if (netInfo.isConnected !== false) {
      setRefreshing(true);
      fetchFriendsVideos();
    }
  }, [fetchFriendsVideos, netInfo.isConnected]);

  if (netInfo.isConnected === false && friendsVideos.length === 0) {
    return <OfflineNotice onRetry={onRefresh} />;
  }

  if (loading && friendsVideos.length === 0) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <GradientBackground />
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate("Users")}
        >
          <Ionicons name="search" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.tabsContainer}>
          <TouchableOpacity style={styles.tabButtonActive}>
            <Text style={styles.tabTextActive}>أتابعه</Text>
            <View style={styles.activeIndicator} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
          >
            <Text style={styles.tabText}>لك</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() =>
            navigation.navigate("MainTabs", { screen: "LiveRooms" })
          }
        >
          <Ionicons name="tv-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {friendsVideos.length === 0 ? (
        <View style={[styles.emptyState, { paddingTop: insets.top + 80 }]}>
          <Ionicons name="people-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>لا توجد فيديوهات من الأصدقاء</Text>
          <Text style={styles.emptySubtext}>
            تابع المزيد من المستخدمين لرؤية محتواهم هنا
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          style={styles.feedList}
          data={friendsVideos}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          extraData={`${activeVideoIndex}-${isScreenFocused ? 1 : 0}-${pageHeight}`}
          onLayout={handleFeedLayout}
          snapToInterval={pageHeight}
          snapToAlignment="start"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          decelerationRate={Platform.OS === "android" ? 0.985 : "fast"}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: pageHeight,
            offset: pageHeight * index,
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
              progressViewOffset={insets.top + 60}
            />
          }
        />
      )}

      <CommentsModal
        visible={commentsVisible}
        onClose={closeComments}
        videoId={selectedVideo?._id}
        initialComments={selectedVideo?.comments || []}
      />

      <NetworkErrorModal
        visible={!!networkError}
        error={networkError}
        onRetry={fetchFriendsVideos}
        onDismiss={() => setNetworkError(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  feedList: {
    flex: 1,
    backgroundColor: "transparent",
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ms(50),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(20),
    zIndex: 10,
  },
  iconButton: {
    padding: ms(8),
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(20),
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
    backgroundColor: "#B8B0D8",
    borderRadius: ms(2),
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ms(40),
  },
  emptyText: {
    color: "#FFF",
    fontSize: fs(18),
    fontWeight: "bold",
    marginTop: ms(20),
    textAlign: "center",
  },
  emptySubtext: {
    color: "#999",
    fontSize: fs(14),
    marginTop: ms(10),
    textAlign: "center",
  },
});

export default FriendsScreen;
