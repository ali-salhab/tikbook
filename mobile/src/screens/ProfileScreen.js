import React, { useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import ProfileMenuModal from "../components/ProfileMenuModal";
import { useNetInfo } from "@react-native-community/netinfo";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";

const { width } = Dimensions.get("window");

const ProfileScreen = ({ navigation }) => {
  const { logout, userInfo, BASE_URL, notificationCount, fetchNotificationCount } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const netInfo = useNetInfo();

  const fetchProfile = useCallback(async () => {
    if (netInfo.isConnected === false) return;
    try {
      const res = await axios.get(`${BASE_URL}/users/${userInfo._id}`);

      // Fetch user's videos
      const videosRes = await axios.get(
        `${BASE_URL}/videos/user/${userInfo._id}`,
      );
      const userVideos = videosRes.data || [];
      const likesCount = userVideos.reduce(
        (sum, v) => sum + (v.likes?.length || 0),
        0,
      );

      setProfile({
        ...res.data,
        likesCount,
      });
      setVideos(userVideos);
    } catch (e) {
      console.log("❌ Error fetching profile:", e.message);
      setProfile(null);
      setVideos([]);
    }
  }, [userInfo, BASE_URL]);

  useFocusEffect(
    useCallback(() => {
      if (userInfo) {
        if (netInfo.isConnected !== false) {
          fetchProfile();
          fetchNotificationCount();
        }
      } else {
        // Default profile when not logged in
        setProfile({
          username: "guest",
          email: "guest@tikbook.com",
          followers: [],
          following: [],
          bio: "مرحباً! سجل الدخول لرؤية ملفك الشخصي 👋",
          videosCount: 0,
          likesCount: 0,
        });
      }
    }, [userInfo, fetchProfile, fetchNotificationCount, netInfo.isConnected]),
  );

  // If user is logged in, but we have no profile and no internet => Offline
  if (userInfo && !profile && netInfo.isConnected === false) {
    return <OfflineNotice onRetry={fetchProfile} />;
  }

  // If user is logged in and we are fetching profile => Loading
  // Note: We often want to show cached profile if possible, but for now we assume fresh fetch
  if (userInfo && !profile) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const renderTabIcon = (name, tabName, IconComponent = Ionicons) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <IconComponent
        name={name}
        size={24}
        color={activeTab === tabName ? "#000" : "#ccc"}
      />
      {activeTab === tabName && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );

  const buildCloudinaryThumbnail = (url) => {
    if (!url) return null;
    if (!url.includes("cloudinary.com")) return url;
    return url
      .replace("/upload/", "/upload/c_fill,g_center,w_200,h_260,so_0/")
      .replace(/\.(mp4|mov|m4v|avi|mkv|webm)$/i, ".jpg");
  };

  const isImageUrl = (url) =>
    typeof url === "string" && url.match(/\.(jpe?g|png|gif|webp)$/i) !== null;

  const getVideoThumbnail = (video) => {
    const videoUrl = video.videoUrl;
    if (video.thumbnailUrl || video.thumbnail || video.coverUrl) {
      return video.thumbnailUrl || video.thumbnail || video.coverUrl;
    }
    if (isImageUrl(videoUrl)) {
      return videoUrl;
    }
    return buildCloudinaryThumbnail(videoUrl);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "videos":
        return videos.length ? (
          <View style={styles.gridContainer}>
            {videos.map((video) => {
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
                    <Text style={styles.viewsText}>
                      {video.views?.toString() || "0"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="videocam-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>لا توجد فيديوهات</Text>
            <Text style={styles.emptyStateSubtitle}>
              ابدأ بنشر أول فيديو لعرضه هنا.
            </Text>
          </View>
        );
      case "private":
        return (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>فيديوهاتك الخاصة</Text>
            <Text style={styles.emptyStateSubtitle}>
              لجعل فيديوهاتك مرئية لك فقط، قم بتعيينها إلى "خاص" في الإعدادات.
            </Text>
          </View>
        );
      case "repost":
        return (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="repeat" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>لا توجد إعادة نشر</Text>
            <Text style={styles.emptyStateSubtitle}>
              أي فيديو تعيد نشره سيظهر هنا.
            </Text>
          </View>
        );
      case "saved":
        return (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>لا توجد محفوظات</Text>
            <Text style={styles.emptyStateSubtitle}>
              احفظ فيديوهاتك المفضلة لتظهر هنا.
            </Text>
          </View>
        );
      case "liked":
        return (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="heart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>لا توجد إعجابات</Text>
            <Text style={styles.emptyStateSubtitle}>
              الفيديوهات التي تعجبك ستظهر هنا.
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="menu-outline" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="arrow-redo-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{profile?.username || "User"}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate(\"Activity\")}
          >
            <View>
              <Ionicons name=\"notifications-outline\" size={26} color=\"#000\" />
              {notificationCount > 0 && (
                <View
                  style={{
                    position: \"absolute\",
                    right: -6,
                    top: -4,
                    backgroundColor: \"#FE2C55\",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: \"center\",
                    alignItems: \"center\",
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: \"#FFF\",
                  }}
                >
                  <Text style={{ color: \"#FFF\", fontSize: 10, fontWeight: \"bold\" }}>
                    {notificationCount > 99 ? \"99+\" : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {profile?.profileImage ? (
                <Image
                  source={{ uri: profile.profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={40} color="#999" />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.addStoryButton}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Name & Username */}
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>
              {profile?.username || "User"}
            </Text>
          </View>
          <Text style={styles.username}>@{profile?.username || "user"}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile?.likesCount || 0}</Text>
              <Text style={styles.statLabel}>تسجيلات الإعجاب</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.followersCount || profile?.followers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>متابعين</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.followingCount || profile?.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>أتابعه</Text>
            </View>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>{profile?.bio || "لا توجد نبذة بعد"}</Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color="#FE2C55" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate("EditProfile", { profile })}
            >
              <Feather name="edit-2" size={20} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.studioButton}>
              <Text style={styles.studioButtonText}>TikTok Studio</Text>
              <MaterialCommunityIcons
                name="magic-staff"
                size={16}
                color="#FE2C55"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {renderTabIcon("grid-outline", "videos")}
          {renderTabIcon("lock-closed-outline", "private")}
          {renderTabIcon("repeat", "repost")}
          {renderTabIcon("bookmark-outline", "saved")}
          {renderTabIcon("heart-outline", "liked")}
        </View>

        {/* Content Grid */}
        {renderTabContent()}

        {/* Bottom Padding for TabBar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      <ProfileMenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
        logout={logout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerLeft: {
    flexDirection: "row",
    gap: 15,
  },
  headerRight: {
    flexDirection: "row",
  },
  headerCenter: {
    alignItems: "center",
    position: "relative",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  iconButton: {
    padding: 4,
  },
  profileInfo: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  addStoryButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#20D5EC",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
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
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f1f1f1",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
  },
  editProfileButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f1f1f1",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
  },
  studioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f1f1f1",
    borderRadius: 4,
  },
  studioButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
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
    backgroundColor: "#333",
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

export default ProfileScreen;
