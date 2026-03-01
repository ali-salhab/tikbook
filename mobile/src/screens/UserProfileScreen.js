import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useNetInfo } from "@react-native-community/netinfo";
import OfflineNotice from "../components/OfflineNotice";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";

const { width } = Dimensions.get("window");

const UserProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const { userInfo, userToken, BASE_URL } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");
  const [loading, setLoading] = useState(true);
  const netInfo = useNetInfo();

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const headers = userToken ? { Authorization: `Bearer ${userToken}` } : {};
      const [profileRes, videosRes] = await Promise.all([
        axios.get(`${BASE_URL}/users/${userId}`, { headers }),
        axios.get(`${BASE_URL}/videos/user/${userId}`, { headers }),
      ]);
      const userVideos = videosRes.data || [];
      const totalLikes = userVideos.reduce(
        (sum, v) =>
          sum + (Array.isArray(v.likes) ? v.likes.length : v.likes || 0),
        0,
      );
      setProfile({ ...profileRes.data, totalLikes });
      setVideos(userVideos);
      setIsFollowing(
        profileRes.data.followers?.includes(userInfo?._id) ?? false,
      );
    } catch (e) {
      console.log("❌ Error fetching user profile:", e.message);
    } finally {
      setLoading(false);
    }
  }, [userId, userToken, BASE_URL, userInfo]);

  useEffect(() => {
    if (netInfo.isConnected !== false) {
      fetchUserProfile();
    }
  }, [userId, netInfo.isConnected]);

  const buildCloudinaryThumbnail = (url) => {
    if (!url) return null;
    if (!url.includes("cloudinary.com")) return url;
    return url
      .replace("/upload/", "/upload/c_fill,g_center,w_200,h_260,so_1/")
      .replace(/\.(mp4|mov|m4v|avi|mkv|webm)$/i, ".jpg");
  };

  const isImageUrl = (url) =>
    typeof url === "string" && url.match(/\.(jpe?g|png|gif|webp)$/i) !== null;

  const getVideoThumbnail = (video) => {
    if (video.thumbnailUrl || video.thumbnail || video.coverUrl)
      return video.thumbnailUrl || video.thumbnail || video.coverUrl;
    if (isImageUrl(video.videoUrl)) return video.videoUrl;
    return buildCloudinaryThumbnail(video.videoUrl);
  };

  const handleFollow = async () => {
    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      if (isFollowing) {
        await axios.put(
          `${BASE_URL}/users/${userId}/unfollow`,
          {},
          { headers },
        );
        setIsFollowing(false);
        setProfile((prev) => ({
          ...prev,
          followers: (prev.followers || []).filter((id) => id !== userInfo._id),
        }));
      } else {
        await axios.put(`${BASE_URL}/users/${userId}/follow`, {}, { headers });
        setIsFollowing(true);
        setProfile((prev) => ({
          ...prev,
          followers: [...(prev.followers || []), userInfo._id],
        }));
      }
    } catch (e) {
      console.log(
        "❌ Error following:",
        e.response?.data?.message || e.message,
      );
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `تابعني على TikBook: @${profile?.username}`,
      });
    } catch (_) {}
  };

  const renderTabContent = () => {
    const list = activeTab === "videos" ? videos : likedVideos;
    if (!list.length) {
      return (
        <View style={styles.emptyStateContainer}>
          <Ionicons
            name={
              activeTab === "videos" ? "videocam-off-outline" : "heart-outline"
            }
            size={64}
            color="#ccc"
          />
          <Text style={styles.emptyStateTitle}>
            {activeTab === "videos" ? "لا توجد فيديوهات" : "لا توجد إعجابات"}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {activeTab === "videos"
              ? "لم يقم هذا المستخدم برفع أي فيديو بعد."
              : "الفيديوهات التي يعجب بها ستظهر هنا."}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.gridContainer}>
        {list.map((video) => {
          const thumbnail = getVideoThumbnail(video);
          return (
            <TouchableOpacity
              key={video._id}
              style={styles.gridItem}
              onPress={() =>
                navigation.navigate("Home", { videoId: video._id })
              }
            >
              {thumbnail ? (
                <Image
                  source={{ uri: thumbnail }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.gridPlaceholder}>
                  <Ionicons name="videocam" size={32} color="#999" />
                </View>
              )}
              <View style={styles.viewsContainer}>
                <Ionicons name="play-outline" size={14} color="#FFF" />
                <Text style={styles.viewsText}>{video.views || 0}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (netInfo.isConnected === false && !profile) {
    return <OfflineNotice onRetry={fetchUserProfile} />;
  }

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <ProfileBadgeFrame
              profileImage={profile.profileImage}
              badgeImage={profile.activeBadge?.imageUrl}
              size={100}
            />
          </View>

          <Text style={styles.displayName}>{profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.totalLikes ?? 0}</Text>
              <Text style={styles.statLabel}>إعجاب</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile.followers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>متابعون</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>متابَعة</Text>
            </View>
          </View>

          {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
              onPress={handleFollow}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingButtonText,
                ]}
              >
                {isFollowing ? "متابَع ✓" : "متابعة"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() =>
                navigation.navigate("Chat", {
                  userId,
                  username: profile.username,
                  profileImage: profile.profileImage,
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={18} color="#000" />
              <Text style={styles.messageButtonText}>رسالة</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab("videos")}
          >
            <Ionicons
              name="grid-outline"
              size={24}
              color={activeTab === "videos" ? "#000" : "#ccc"}
            />
            {activeTab === "videos" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab("liked")}
          >
            <Ionicons
              name="heart-outline"
              size={24}
              color={activeTab === "liked" ? "#000" : "#ccc"}
            />
            {activeTab === "liked" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        {renderTabContent()}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF",
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  profileInfo: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  statLabel: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 15,
    backgroundColor: "#eee",
  },
  bio: {
    fontSize: 14,
    color: "#000",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    width: "100%",
    justifyContent: "center",
  },
  followButton: {
    flex: 1,
    backgroundColor: "#FE2C55",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  followingButton: {
    backgroundColor: "#f1f1f1",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  followButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
  },
  followingButtonText: {
    color: "#000",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    justifyContent: "center",
  },
  messageButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 40,
    height: 2,
    backgroundColor: "#000",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: width / 3,
    height: (width / 3) * 1.3,
    backgroundColor: "#333",
    position: "relative",
    borderWidth: 0.5,
    borderColor: "#fff",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  viewsContainer: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default UserProfileScreen;
