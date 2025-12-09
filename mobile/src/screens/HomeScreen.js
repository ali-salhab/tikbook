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
  TouchableOpacity,
  StatusBar,
  I18nManager,
  Animated,
  Share,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import axios from "axios";
import { Video } from "expo-av";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../config/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import CommentsModal from "../components/CommentsModal";

// Enable RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const HomeScreen = ({ navigation }) => {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVideos();
    setRefreshing(false);
  }, [fetchVideos]);

  const fetchVideos = useCallback(async () => {
    try {
      console.log("📹 Fetching videos from:", `${BASE_URL}/videos`);
      const res = await axios.get(`${BASE_URL}/videos`);
      console.log("✅ Videos fetched:", res.data.length);

      // Map videos and add full URL for videoUrl
      const mappedVideos = res.data.map((video) => ({
        ...video,
        isLiked: false,
        // Create full URL for video if it's a relative path
        videoUrl: video.videoUrl.startsWith("http")
          ? video.videoUrl
          : `${BASE_URL.replace("/api", "")}/${video.videoUrl.replace(
              /\\/g,
              "/"
            )}`,
      }));

      console.log("📹 First video URL:", mappedVideos[0]?.videoUrl);
      setVideos(mappedVideos);
    } catch (e) {
      console.error("❌ Error fetching videos:", e.message);
      console.log("Using local dummy videos");

      // Enhanced dummy data with Arabic content and local assets
      const video1 = require("../../assets/videos/video1.mp4");
      const video2 = require("../../assets/videos/video2.mp4");

      setVideos([
        {
          _id: "1",
          videoUrl: null,
          localSource: video1,
          description: "فيديو رائع! 🎬 #فن #إبداع",
          user: { username: "أحمد_الفنان", _id: "1" },
          likes: [1, 2, 3],
          comments: [],
          commentsData: [
            {
              _id: "c1",
              user: { username: "سارة" },
              text: "رائع! 👏",
              likes: [1, 2],
              createdAt: new Date(),
            },
            {
              _id: "c2",
              user: { username: "محمد" },
              text: "أحببت هذا! ❤️",
              likes: [1],
              createdAt: new Date(),
            },
          ],
          isLiked: false,
        },
        {
          _id: "2",
          videoUrl: null,
          localSource: video2,
          description: "لحظات لا تُنسى 💫 #سفر #مغامرة",
          user: { username: "سارة_المسافرة", _id: "2" },
          likes: [1, 2, 3, 4, 5],
          comments: [],
          commentsData: [
            {
              _id: "c3",
              user: { username: "أحمد" },
              text: "مذهل! 🔥",
              likes: [1, 2, 3],
              createdAt: new Date(),
            },
          ],
          isLiked: false,
        },
        {
          _id: "3",
          videoUrl: null,
          localSource: video1,
          description: "تحدي جديد! 🔥 #تحدي #ترفيه",
          user: { username: "محمد_الرياضي", _id: "3" },
          likes: [1, 2],
          comments: [],
          commentsData: [],
          isLiked: false,
        },
        {
          _id: "4",
          videoUrl: null,
          localSource: video2,
          description: "الطبيعة الخلابة 🌿 #طبيعة #جمال",
          user: { username: "نور_المصورة", _id: "4" },
          likes: [1, 2, 3, 4, 5, 6, 7],
          comments: [],
          commentsData: [
            {
              _id: "c4",
              user: { username: "خالد" },
              text: "جميل جداً! 💚",
              likes: [],
              createdAt: new Date(),
            },
            {
              _id: "c5",
              user: { username: "ليلى" },
              text: "أين هذا المكان؟",
              likes: [1],
              createdAt: new Date(),
            },
          ],
          isLiked: false,
        },
        {
          _id: "5",
          videoUrl: null,
          localSource: video1,
          description: "وقت المرح! 🎉 #مرح #أصدقاء",
          user: { username: "خالد_المرح", _id: "5" },
          likes: [1, 2, 3, 4],
          comments: [],
          commentsData: [
            {
              _id: "c6",
              user: { username: "فاطمة" },
              text: "هههههه 😂",
              likes: [1, 2],
              createdAt: new Date(),
            },
          ],
          isLiked: false,
        },
      ]);
    }
  }, []);

  // Refresh videos when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 HomeScreen focused - refreshing videos");
      fetchVideos();
    }, [fetchVideos])
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
      })
    );

    // Send to backend
    try {
      await axios.put(
        `${BASE_URL}/videos/${videoId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
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
        })
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
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const heartOpacity = useRef(new Animated.Value(0)).current;
    const heartScale = useRef(new Animated.Value(0)).current;
    const videoRef = useRef(null);
    const lastTap = useRef(0);

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

    return (
      <View style={styles.videoContainer}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDoubleTap}
          style={styles.videoTouchable}
        >
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

          {/* Like Button */}
          <TouchableOpacity style={styles.actionButton} onPress={onLikePress}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name="heart"
                size={35}
                color={item.isLiked ? "#FE2C55" : "#FFF"}
              />
            </Animated.View>
            <Text style={styles.actionText}>
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
            <Ionicons name="bookmark" size={35} color="#FFF" />
            <Text style={styles.actionText}>483</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="arrow-redo-sharp" size={35} color="#FFF" />
            <Text style={styles.actionText}>120</Text>
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
          onPress={() => navigation.navigate("Live")}
        >
          <Ionicons name="tv-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={videos}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={Dimensions.get("window").height}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFF"
            title="سحب للتحديث"
            titleColor="#FFF"
          />
        }
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsVisible}
        onClose={closeComments}
        videoId={selectedVideo?._id}
        initialComments={selectedVideo?.commentsData || []}
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
});

export default HomeScreen;
