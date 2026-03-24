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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import LevelBadgeIcon from "../components/LevelBadgeIcon";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import ProfileMenuModal from "../components/ProfileMenuModal";
import { useNetInfo } from "@react-native-community/netinfo";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";
import LottieView from "lottie-react-native";
import videoService from "../services/videoService";
import * as ImagePicker from "expo-image-picker";
import { useApp } from "../context/AppContext";
import { wp, ms, fs } from "../utils/responsive";

const { width } = Dimensions.get("window");

const ProfileScreen = ({ navigation }) => {
  const { theme } = useApp();
  const styles = makeStyles(theme);
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
  const [likedVideos, setLikedVideos] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userStatuses, setUserStatuses] = useState([]);
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

      // Fetch own statuses for the ring around avatar
      try {
        const statusRes = await axios.get(`${BASE_URL}/status/user/${userInfo._id}`, config);
        setUserStatuses(statusRes.data || []);
      } catch (_) {
        setUserStatuses([]);
      }
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

  const fetchLikedVideos = useCallback(async () => {
    if (netInfo.isConnected === false) return;
    try {
      const res = await axios.get(`${BASE_URL}/videos/liked`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setLikedVideos(res.data || []);
    } catch (e) {
      console.log("❌ Error fetching liked videos:", e.message);
      setLikedVideos([]);
    }
  }, [netInfo.isConnected, BASE_URL, userToken]);

  // Fetch saved videos when saved tab is selected
  useEffect(() => {
    if (activeTab === "saved" && userInfo) {
      fetchSavedVideos();
    }
  }, [activeTab, userInfo, fetchSavedVideos]);

  // Fetch liked videos when liked tab is selected
  useEffect(() => {
    if (activeTab === "liked" && userInfo) {
      fetchLikedVideos();
    }
  }, [activeTab, userInfo, fetchLikedVideos]);

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
        <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
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
        color={activeTab === tabName ? theme.accent : theme.iconMuted}
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
                    navigation.navigate("MainTabs", {
                      screen: "Home",
                      params: { videoId: video._id },
                    })
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
                    navigation.navigate("MainTabs", {
                      screen: "Home",
                      params: { videoId: video._id },
                    })
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
        return likedVideos.length ? (
          <View style={styles.gridContainer}>
            {likedVideos.map((video) => {
              const thumbnail = getVideoThumbnail(video);
              return (
                <TouchableOpacity
                  key={video._id}
                  style={styles.gridItem}
                  onPress={() =>
                    navigation.navigate("MainTabs", {
                      screen: "Home",
                      params: { videoId: video._id },
                    })
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
      <StatusBar
        barStyle={theme.id === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.header}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setMenuVisible(true)}
          >
            <MaterialCommunityIcons name="menu" size={28} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons
              name="share-variant-outline"
              size={24}
              color={theme.icon}
            />
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
              <MaterialCommunityIcons
                name="bell-outline"
                size={26}
                color={theme.icon}
              />
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
                    borderColor: theme.bg2,
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
              activeOpacity={0.9}
            >
              {/* Avatar circle + floating camera button */}
              <View style={styles.avatarWrapper}>
                {/* Dual status ring */}
                {userStatuses.length > 0 && (
                  <View style={styles.statusRingOuter} pointerEvents="none">
                    {userStatuses.length >= 2 ? (
                      <LinearGradient
                        colors={[
                          userStatuses[0]?.bgColor || "#FE2C55",
                          userStatuses[0]?.bgColor || "#FE2C55",
                          userStatuses[1]?.bgColor || "#0A84FF",
                          userStatuses[1]?.bgColor || "#0A84FF",
                        ]}
                        locations={[0, 0.49, 0.51, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.statusRingGradient}
                      />
                    ) : (
                      <View style={[styles.statusRingGradient, { backgroundColor: userStatuses[0]?.bgColor || "#FE2C55" }]} />
                    )}
                    <View style={styles.statusRingInner} />
                  </View>
                )}
                <View style={styles.avatarCircle}>
                  {profile?.profileImage ? (
                    <Image
                      source={{ uri: profile.profileImage }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={48} color="#bbb" />
                    </View>
                  )}
                </View>

                {/* Circular camera button — bottom-left, outside the circle */}
                <View style={styles.cameraBtn}>
                  <Ionicons name="camera" size={18} color="#FFF" />
                </View>
              </View>

              {/* Badge frame overlay (sits outside/on top of circle) */}
              {profile?.activeBadge?.imageUrl && (
                <Image
                  source={{ uri: profile.activeBadge.imageUrl }}
                  style={styles.badgeFrameOverlay}
                  resizeMode="contain"
                  pointerEvents="none"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Name & Username */}
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>
              {profile?.username || "User"}
            </Text>
            <LevelBadgeIcon level={Math.min(Math.max(Math.floor((profile?.level || 0) / 10) + 1, 1), 3)} size="small" />
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
              <Feather name="edit-2" size={18} color={theme.icon} />
              <Text style={styles.buttonLabel}>تعديل</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.levelsButton}
              onPress={() => navigation.navigate("Levels")}
            >
              <LevelBadgeIcon level={Math.min(Math.max(Math.floor((profile?.level || 0) / 10) + 1, 1), 3)} size="small" />
              <Text style={styles.levelsButtonLabel}>المستويات</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.badgeButton}
              onPress={() => navigation.navigate("MyBadges")}
            >
              <Ionicons name="medal-outline" size={18} color="#FFD700" />
              <Text style={styles.badgeButtonLabel}>الإطارات</Text>
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

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg2,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: ms(16),
      paddingVertical: ms(10),
      backgroundColor: theme.bg2,
    },
    headerLeft: {
      flexDirection: "row",
      gap: ms(15),
    },
    headerRight: {
      flexDirection: "row",
    },
    headerCenter: {
      alignItems: "center",
      position: "relative",
    },
    headerTitle: {
      fontSize: fs(17),
      fontWeight: "bold",
      color: theme.text,
    },
    iconButton: {
      padding: ms(4),
    },
    profileInfo: {
      alignItems: "center",
      paddingTop: ms(20),
      paddingBottom: ms(10),
    },
    avatarContainer: {
      position: "relative",
      marginBottom: ms(12),
      alignSelf: "center",
    },
    avatarWrapper: {
      width: ms(100),
      height: ms(100),
    },
    statusRingOuter: {
      position: "absolute",
      width: ms(112),
      height: ms(112),
      borderRadius: ms(56),
      top: -ms(6),
      left: -ms(6),
      overflow: "hidden",
      zIndex: 2,
    },
    statusRingGradient: {
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: ms(56),
    },
    statusRingInner: {
      position: "absolute",
      width: ms(104),
      height: ms(104),
      borderRadius: ms(52),
      backgroundColor: "transparent",
      top: ms(4),
      left: ms(4),
      borderWidth: ms(3),
      borderColor: "rgba(0,0,0,0.85)",
    },
    avatarCircle: {
      width: ms(100),
      height: ms(100),
      borderRadius: ms(50),
      overflow: "hidden",
      backgroundColor: theme.bg3,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.bg3,
      justifyContent: "center",
      alignItems: "center",
    },
    cameraBtn: {
      position: "absolute",
      bottom: -ms(4),
      left: -ms(4),
      width: ms(34),
      height: ms(34),
      borderRadius: ms(17),
      backgroundColor: "#1A1A1A",
      borderWidth: 2.5,
      borderColor: "#FFF",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 6,
    },
    badgeFrameOverlay: {
      position: "absolute",
      width: ms(135),
      height: ms(135),
      top: -ms(17),
      left: -ms(17),
      pointerEvents: "none",
    },
    badgeShopButton: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: "#000",
      width: ms(28),
      height: ms(28),
      borderRadius: ms(14),
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#FFD700",
    },
    nameContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: ms(6),
      marginBottom: ms(4),
    },
    displayName: {
      fontSize: fs(18),
      fontWeight: "bold",
      color: theme.text,
    },
    username: {
      fontSize: fs(14),
      color: theme.textMuted,
      marginBottom: ms(16),
    },
    userIdContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      paddingVertical: ms(2),
      paddingHorizontal: 0,
      marginBottom: ms(16),
      alignSelf: "center",
    },
    userIdLabel: {
      fontSize: fs(12),
      color: theme.textMuted,
      fontWeight: "600",
    },
    userIdText: {
      fontSize: fs(12),
      color: theme.textSecondary,
      fontFamily: "monospace",
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    copyIcon: {
      marginLeft: ms(4),
    },
    statsContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: ms(16),
      gap: ms(20),
    },
    statItem: {
      alignItems: "center",
    },
    statNumber: {
      fontSize: fs(17),
      fontWeight: "bold",
      color: theme.text,
    },
    statLabel: {
      fontSize: fs(13),
      color: theme.textMuted,
      marginTop: ms(2),
    },
    statDivider: {
      width: 1,
      height: ms(22),
      backgroundColor: theme.border,
    },
    bio: {
      fontSize: fs(14),
      color: theme.text,
      marginBottom: ms(20),
      textAlign: "center",
    },
    actionButtons: {
      flexDirection: "row",
      gap: ms(8),
      marginBottom: ms(10),
      justifyContent: "center",
      paddingHorizontal: ms(20),
    },
    editProfileButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: ms(6),
      paddingHorizontal: ms(16),
      paddingVertical: ms(11),
      backgroundColor: theme.buttonBg || theme.bg3,
      borderRadius: ms(10),
      borderWidth: 1,
      borderColor: theme.buttonBorder || theme.border,
      flex: 1,
      justifyContent: "center",
    },
    verificationButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: ms(6),
      paddingHorizontal: ms(16),
      paddingVertical: ms(11),
      backgroundColor: theme.buttonBg || theme.bg3,
      borderRadius: ms(10),
      borderWidth: 1,
      borderColor: theme.buttonBorder || theme.border,
      flex: 1,
      justifyContent: "center",
    },
    badgeButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: ms(6),
      paddingHorizontal: ms(16),
      paddingVertical: ms(11),
      backgroundColor: theme.id === "dark" ? "#2A2200" : "#FFF8E1",
      borderRadius: ms(10),
      borderWidth: 1,
      borderColor: theme.id === "dark" ? "#5A4800" : "#F0C040",
      flex: 1,
      justifyContent: "center",
    },
    levelsButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: ms(5),
      paddingHorizontal: ms(12),
      paddingVertical: ms(11),
      backgroundColor: theme.id === "dark" ? "#0A1A3A" : "#1A3A7A",
      borderRadius: ms(10),
      borderWidth: 1,
      borderColor: "rgba(100,160,255,0.6)",
      flex: 1,
      justifyContent: "center",
    },
    levelsButtonLabel: {
      fontSize: fs(12),
      fontWeight: "bold",
      color: "#89C4FF",
    },
    buttonLabel: {
      fontSize: fs(13),
      fontWeight: "600",
      color: theme.text,
    },
    badgeButtonLabel: {
      fontSize: fs(13),
      fontWeight: "600",
      color: theme.id === "dark" ? "#FFD700" : "#8B6914",
    },
    tabsContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginTop: ms(10),
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: ms(12),
      position: "relative",
    },
    activeIndicator: {
      position: "absolute",
      bottom: 0,
      width: ms(40),
      height: 2,
      backgroundColor: theme.accent,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    gridItem: {
      width: width / 3,
      height: (width / 3) * 1.3,
      backgroundColor: theme.bg3,
      position: "relative",
      borderWidth: 0.5,
      borderColor: theme.border,
    },
    gridImage: {
      width: "100%",
      height: "100%",
    },
    gridPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.bg3,
      justifyContent: "center",
      alignItems: "center",
    },
    viewsContainer: {
      position: "absolute",
      bottom: ms(6),
      left: ms(6),
      flexDirection: "row",
      alignItems: "center",
      gap: ms(4),
    },
    viewsText: {
      color: "#FFF",
      fontSize: fs(12),
      fontWeight: "600",
    },
    emptyStateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: ms(60),
      paddingHorizontal: ms(40),
    },
    emptyStateTitle: {
      fontSize: fs(18),
      fontWeight: "bold",
      color: theme.text,
      marginTop: ms(20),
      marginBottom: ms(10),
    },
    emptyStateSubtitle: {
      fontSize: fs(14),
      color: theme.textMuted,
      textAlign: "center",
      lineHeight: ms(20),
    },
  });

export default ProfileScreen;
