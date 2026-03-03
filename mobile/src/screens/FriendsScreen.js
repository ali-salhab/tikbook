import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  RefreshControl,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Video } from "expo-av";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useNetInfo } from "@react-native-community/netinfo";
import CommentsModal from "../components/CommentsModalEnhanced";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";
import NetworkErrorModal from "../components/NetworkErrorModal";
import videoService from "../services/videoService";

const { width, height } = Dimensions.get("window");

const FriendsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userToken, userInfo, BASE_URL } = useContext(AuthContext);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [friendsVideos, setFriendsVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const netInfo = useNetInfo();

  // MUST declare useRef before any conditional returns (Rules of Hooks)
  const videoRefs = useRef([]);
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }).current;

  const formatNumber = (num) => {
    // Handle if it's an array (likes or comments array)
    const count = Array.isArray(num) ? num.length : num;

    if (!count || count === 0) return "0";
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "م";
    if (count >= 1000) return (count / 1000).toFixed(1) + "ألف";
    return count.toString();
  };

  const fetchFriendsVideos = async () => {
    if (netInfo.isConnected === false) return;
    try {
      // Fetch videos from followed users
      const res = await axios.get(`${BASE_URL}/videos/following`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setFriendsVideos(res.data || []);
    } catch (e) {
      console.log("❌ Error fetching friends videos:", e.message);
      setFriendsVideos([]);
      setNetworkError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleComment = (video) => {
    setSelectedVideo(video);
    setCommentsVisible(true);
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

  const handleSave = async (videoId) => {
    // Optimistic update
    setFriendsVideos((prevVideos) =>
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
      setFriendsVideos((prevVideos) =>
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

  const closeComments = () => {
    setCommentsVisible(false);
    setSelectedVideo(null);
  };

  useFocusEffect(
    useCallback(() => {
      if (netInfo.isConnected !== false) {
        fetchFriendsVideos();
      } else {
        setLoading(false);
      }

      // Cleanup: pause all videos when screen loses focus
      return () => {
        console.log("🔇 FriendsScreen unfocused - pausing videos");
        videoRefs.current.forEach((video) => {
          if (video) {
            video.pauseAsync().catch(() => {});
            video.setIsMutedAsync(true).catch(() => {});
          }
        });
      };
    }, [netInfo.isConnected]),
  );

  const onRefresh = () => {
    if (netInfo.isConnected !== false) {
      setRefreshing(true);
      fetchFriendsVideos();
    }
  };

  if (netInfo.isConnected === false && friendsVideos.length === 0) {
    return <OfflineNotice onRetry={onRefresh} />;
  }

  if (loading && friendsVideos.length === 0) {
    return <LoadingIndicator />;
  }

  const renderItem = ({ item, index }) => {
    const isActive = index === activeVideoIndex;
    const username = item.user?.username || "user";
    const profileImage = item.user?.profileImage;
    const ICON_SIZE = 35;

    return (
      <View style={[styles.videoContainer, { height }]}>
        <Video
          ref={(ref) => (videoRefs.current[index] = ref)}
          source={{ uri: item.videoUrl }}
          style={styles.video}
          resizeMode="cover"
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />

        {/* Bottom info — identical structure to HomeScreen */}
        <View style={[styles.bottomSection, { bottom: insets.bottom + 80 }]}>
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{username}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.musicRow}>
              <Ionicons name="musical-notes" size={15} color="#FFF" />
              <Text style={styles.musicText}>الصوت الأصلي - {username}</Text>
            </View>
          </View>
        </View>

        {/* Right side actions — identical structure to HomeScreen */}
        <View style={[styles.rightActions, { bottom: insets.bottom + 80 }]}>
          <TouchableOpacity
            style={styles.profileContainer}
            onPress={() =>
              navigation.navigate("UserProfile", { userId: item.user._id })
            }
          >
            <View style={styles.profileImageWrapper}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View
                  style={[
                    styles.profileImage,
                    {
                      backgroundColor: "#666",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Ionicons name="person" size={22} color="#FFF" />
                </View>
              )}
            </View>
            <View style={styles.followButton}>
              <Ionicons name="add" size={14} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            {item.isLiked ? (
              <Ionicons name="heart" size={ICON_SIZE} color="#FE2C55" />
            ) : (
              <Ionicons name="heart-outline" size={ICON_SIZE} color="#FFF" />
            )}
            <Text style={styles.actionText}>
              {formatNumber(item.likes?.length || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleComment(item)}
          >
            <Ionicons
              name="chatbubble-ellipses-sharp"
              size={ICON_SIZE}
              color="#FFF"
            />
            <Text style={styles.actionText}>{formatNumber(item.comments)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSave(item._id)}
          >
            <Ionicons
              name={item.isSaved ? "bookmark" : "bookmark-outline"}
              size={ICON_SIZE}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="arrow-redo-sharp" size={ICON_SIZE} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Top Navigation Bar - same style as HomeScreen */}
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
          data={friendsVideos}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 80,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFF"
            />
          }
        />
      )}

      {/* Comments Modal */}
      {selectedVideo && (
        <CommentsModal
          visible={commentsVisible}
          onClose={closeComments}
          videoId={selectedVideo._id}
          initialComments={selectedVideo.comments}
        />
      )}

      {/* Network / Server Error Modal */}
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
    backgroundColor: "#000",
  },
  // ── Top Bar (same design as HomeScreen) ──────────────────────────────────
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  iconButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
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
  // ── old header (kept for compat) ──────────────────────────────────────────
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  addFriendButton: {},
  plusBadge: {
    position: "absolute",
    top: -2,
    left: -4,
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  videoContainer: {
    width: width,
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  // ── Bottom info (mirrors HomeScreen) ──────────────────────────────────────
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
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: "#FFF",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  musicText: {
    color: "#FFF",
    fontSize: 13,
    flex: 1,
  },
  // ── Right actions (mirrors HomeScreen) ───────────────────────────────────
  rightActions: {
    position: "absolute",
    right: 10,
    alignItems: "center",
    zIndex: 100,
  },
  profileContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  profileImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FFF",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  followButton: {
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#000",
  },
  actionButton: {
    marginBottom: 16,
    alignItems: "center",
  },
  actionText: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
});

export default FriendsScreen;
