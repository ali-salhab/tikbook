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
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Video } from "expo-av";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useNetInfo } from "@react-native-community/netinfo";
import CommentsModal from "../components/CommentsModalEnhanced";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";

const { width, height } = Dimensions.get("window");

const FriendsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { userToken, userInfo, BASE_URL } = useContext(AuthContext);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [friendsVideos, setFriendsVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    } finally {
      setLoading(false);
      setRefreshing(false);
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

    return (
      <View style={[styles.videoContainer, { height: height - tabBarHeight }]}>
        <Video
          ref={(ref) => (videoRefs.current[index] = ref)}
          source={{ uri: item.videoUrl }}
          style={styles.video}
          resizeMode="cover"
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />

        {/* Overlay Content */}
        <View style={styles.overlay}>
          {/* Right Side Actions */}
          <View style={styles.rightContainer}>
            <TouchableOpacity
              style={styles.profileContainer}
              onPress={() =>
                navigation.navigate("UserProfile", { userId: item.user._id })
              }
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: "#666",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Ionicons name="person" size={24} color="#FFF" />
                </View>
              )}
              <View style={styles.followBadge}>
                <Ionicons name="add" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              {item.isLiked ? (
                <Ionicons name="heart" size={35} color="#FE2C55" />
              ) : (
                <Ionicons name="heart-outline" size={35} color="#FFF" />
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
                size={35}
                color="#FFF"
              />
              <Text style={styles.actionText}>
                {formatNumber(item.comments)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="bookmark-outline" size={35} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="arrow-redo-sharp" size={35} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Bottom Content */}
          <View style={styles.bottomContainer}>
            <Text style={styles.username}>@{username}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.addFriendButton}>
          <View>
            <Ionicons name="people-outline" size={28} color="#FFF" />
            <View style={styles.plusBadge}>
              <Ionicons name="add" size={10} color="#FFF" />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>الأصدقاء</Text>

        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {friendsVideos.length === 0 ? (
        <View style={styles.emptyState}>
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
          snapToInterval={height - tabBarHeight}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
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
  addFriendButton: {
    // padding: 5,
  },
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.1)", // Slight overlay for text readability
  },
  rightContainer: {
    position: "absolute",
    right: 10,
    bottom: 100,
    alignItems: "center",
  },
  profileContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  followBadge: {
    position: "absolute",
    bottom: -10,
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    marginBottom: 15,
    alignItems: "center",
  },
  actionText: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "600",
  },
  bottomContainer: {
    marginBottom: 20,
    marginLeft: 10,
    width: "75%",
  },
  username: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "left",
  },
  description: {
    color: "#FFF",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "left",
  },
  time: {
    color: "#ccc",
    fontSize: 12,
    textAlign: "left",
  },
});

export default FriendsScreen;
