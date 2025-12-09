import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const UserProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const { userInfo, BASE_URL } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/users/${userId}`);
      setProfile(res.data);

      // Check if current user is following this user
      setIsFollowing(res.data.followers?.includes(userInfo._id));

      // Fetch user's videos
      const videosRes = await axios.get(`${BASE_URL}/videos?userId=${userId}`);
      setVideos(videosRes.data);
    } catch (e) {
      console.log("❌ Error fetching user profile:", e.message);
    }
  };

  const handleFollow = async () => {
    try {
      const token = userInfo.token;
      const headers = { Authorization: `Bearer ${token}` };

      if (isFollowing) {
        await axios.put(
          `${BASE_URL}/users/${userId}/unfollow`,
          {},
          { headers }
        );
        setIsFollowing(false);
        // Update follower count locally
        setProfile((prev) => ({
          ...prev,
          followers: prev.followers.filter((id) => id !== userInfo._id),
        }));
      } else {
        await axios.put(`${BASE_URL}/users/${userId}/follow`, {}, { headers });
        setIsFollowing(true);
        // Update follower count locally
        setProfile((prev) => ({
          ...prev,
          followers: [...(prev.followers || []), userInfo._id],
        }));
      }
    } catch (e) {
      console.log(
        "❌ Error following user:",
        e.response?.data?.message || e.message
      );
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>@{profile.username}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={96} color="#888" />
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>متابَعة</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile.followers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>متابعون</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{videos.length}</Text>
              <Text style={styles.statLabel}>فيديو</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
              ]}
              onPress={handleFollow}
            >
              <Text style={styles.followButtonText}>
                {isFollowing ? "متابَع" : "متابعة"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() =>
                navigation.navigate("Chat", {
                  userId: userId,
                  username: profile.username,
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>{profile.bio || "لا يوجد نبذة"}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "videos" && styles.activeTab]}
            onPress={() => setActiveTab("videos")}
          >
            <Ionicons
              name="grid-outline"
              size={24}
              color={activeTab === "videos" ? "#FFF" : "#888"}
            />
          </TouchableOpacity>
        </View>

        {/* Content Grid */}
        <View style={styles.grid}>
          {videos.length > 0 ? (
            <View style={styles.videoGrid}>
              {videos.map((video) => (
                <TouchableOpacity
                  key={video._id}
                  style={styles.videoItem}
                  onPress={() =>
                    navigation.navigate("Home", { videoId: video._id })
                  }
                >
                  <View style={styles.videoThumbnail}>
                    <Ionicons name="play" size={32} color="#FFF" />
                  </View>
                  <View style={styles.videoStats}>
                    <Ionicons name="heart" size={14} color="#FFF" />
                    <Text style={styles.videoStatText}>
                      {video.likes?.length || 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>لا توجد فيديوهات</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#FFF",
    textAlign: "center",
    marginTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  profileInfo: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  avatar: {
    marginBottom: 16,
  },
  stats: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 32,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  followButton: {
    flex: 1,
    backgroundColor: "#FE2C55",
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#444",
  },
  followButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  messageButton: {
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    justifyContent: "center",
  },
  bio: {
    color: "#FFF",
    textAlign: "center",
    marginBottom: 20,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    justifyContent: "center",
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#FFF",
  },
  grid: {
    padding: 2,
  },
  videoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  videoItem: {
    width: Dimensions.get("window").width / 3 - 4,
    height: Dimensions.get("window").width / 2,
    margin: 2,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  videoStats: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  videoStatText: {
    color: "#FFF",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#888",
    marginTop: 16,
    fontSize: 16,
  },
});

export default UserProfileScreen;
