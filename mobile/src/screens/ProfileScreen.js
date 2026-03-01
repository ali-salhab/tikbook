import React, { useContext, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Clipboard,
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
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";
import videoService from "../services/videoService";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");

const ProfileScreen = ({ navigation }) => {
  const {
    logout,
    userInfo,
    userToken,
    BASE_URL,
    notificationCount,
    fetchNotificationCount,
  } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const netInfo = useNetInfo();

  const fetchProfile = useCallback(async () => {
    if (netInfo.isConnected === false) return;
    try {
      const config = {
        headers: { Authorization: `Bearer ${userToken}` },
      };

      const res = await axios.get(`${BASE_URL}/users/${userInfo._id}`, config);

      // Fetch user's videos
      const videosRes = await axios.get(
        `${BASE_URL}/videos/user/${userInfo._id}`,
        config,
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
      if (e.response && e.response.status === 401) {
        console.log("Authentication failed - logging out might be needed");
      }
      setProfile(null);
      setVideos([]);
    }
  }, [userInfo, userToken, BASE_URL]);

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

  const fetchSavedVideos = useCallback(async () => {
    if (netInfo.isConnected === false) return;
    try {
      const savedData = await videoService.getSavedVideos();
      setSavedVideos(savedData || []);
    } catch (e) {
      console.log("❌ Error fetching saved videos:", e.message);
      setSavedVideos([]);
    }
  }, [netInfo.isConnected]);

  // Fetch saved videos when saved tab is selected
  useEffect(() => {
    if (activeTab === "saved" && userInfo) {
      fetchSavedVideos();
    }
  }, [activeTab, userInfo, fetchSavedVideos]);

  const copyUserId = () => {
    if (userInfo?._id) {
      Clipboard.setString(userInfo._id);
      Alert.alert("✅ تم النسخ", "تم نسخ معرف المستخدم إلى الحافظة", [
        { text: "حسناً" },
      ]);
    }
  };

  const handleChangeProfilePicture = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("خطأ", "نحتاج إذن الوصول للصور");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        const formData = new FormData();
        const filename =
          imageUri.split("/").pop() || `profile_${Date.now()}.jpg`;
        const ext = filename.split(".").pop() || "jpg";
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type: `image/${ext === "jpg" ? "jpeg" : ext}`,
        });
        try {
          const res = await axios.put(
            `${BASE_URL}/users/profile/image`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${userToken}`,
                "Content-Type": "multipart/form-data",
              },
            },
          );
          if (res.data?.profileImage) {
            setProfile((prev) => ({
              ...prev,
              profileImage: res.data.profileImage,
            }));
            Alert.alert("✅", "تم تغيير صورة البروفايل بنجاح");
          }
        } catch (err) {
          Alert.alert("خطأ", "فشل رفع الصورة");
        }
      }
    } catch (e) {
      Alert.alert("خطأ", "فشل اختيار الصورة");
    }
  };

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
        return savedVideos.length ? (
          <View style={styles.gridContainer}>
            {savedVideos.map((video) => {
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
            onPress={() => navigation.navigate("Activity")}
          >
            <View>
              <Ionicons name="notifications-outline" size={26} color="#000" />
              {notificationCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    right: -6,
                    top: -4,
                    backgroundColor: "#FE2C55",
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: "#FFF",
                  }}
                >
                  <Text
                    style={{ color: "#FFF", fontSize: 10, fontWeight: "bold" }}
                  >
                    {notificationCount > 99 ? "99+" : notificationCount}
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
          {/* Avatar with Badge Frame */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              onPress={handleChangeProfilePicture}
              activeOpacity={0.85}
            >
              <ProfileBadgeFrame
                profileImage={profile?.profileImage}
                badgeImage={profile?.activeBadge?.imageUrl}
                size={100}
              />
              <View style={styles.avatarCameraBtn}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Name & Username */}
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>
              {profile?.username || "User"}
            </Text>
          </View>
          <Text style={styles.username}>@{profile?.username || "user"}</Text>

          {/* User ID with Copy - Smaller Version */}
          {userInfo?._id && (
            <TouchableOpacity
              style={styles.userIdContainer}
              onPress={copyUserId}
              activeOpacity={0.7}
            >
              <Text style={styles.userIdLabel}>ID: </Text>
              <Text style={styles.userIdText}>
                {userInfo._id ? userInfo._id.slice(-8).toUpperCase() : ""}
              </Text>
              <Ionicons
                name="copy-outline"
                size={12}
                color="#888"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          )}

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
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate("EditProfile", { profile })}
            >
              <Feather name="edit-2" size={20} color="#000" />
              <Text style={styles.buttonLabel}>تعديل</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.badgeButton}
              onPress={() => navigation.navigate("MyBadges")}
            >
              <Ionicons name="medal-outline" size={20} color="#FFD700" />
              <Text style={styles.buttonLabel}>الإطارات</Text>
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
  avatarCameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#FE2C55",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
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
  badgeShopButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
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
  userIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 2,
    paddingHorizontal: 0,
    marginBottom: 16,
    alignSelf: "center",
  },
  userIdLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "bold",
  },
  userIdText: {
    fontSize: 12,
    color: "#333",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  copyIcon: {
    marginLeft: 4,
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
    gap: 10,
    marginBottom: 10,
    justifyContent: "center",
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  verificationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E6F7FF",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  badgeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
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
