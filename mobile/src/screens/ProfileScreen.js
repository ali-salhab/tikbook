import React, { useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
  Clipboard,
  RefreshControl,
  Share,
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
import { wp, ms, fs, getWindowDimensions } from "../utils/responsive";
import { darkUi, screenBackgroundGradient } from "../theme/brand";

const { width } = getWindowDimensions();

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
  const [vipLevels, setVipLevels] = useState([]);
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userStatuses, setUserStatuses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
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

  // Fetch VIP levels once to get images/colors for the level badge
  useEffect(() => {
    let active = true;
    fetch(`${BASE_URL}/vip/levels`)
      .then((r) => r.json())
      .then((d) => { if (active && d.levels) setVipLevels(d.levels); })
      .catch(() => {});
    return () => { active = false; };
  }, [BASE_URL]);

  useFocusEffect(
    useCallback(() => {
      if (userInfo) {
        if (netInfo.isConnected !== false) {
          fetchProfile();
          fetchNotificationCount();
          // Re-fetch VIP levels on every focus so admin updates are reflected immediately
          fetch(`${BASE_URL}/vip/levels`)
            .then((r) => r.json())
            .then((d) => { if (d?.levels) setVipLevels(d.levels); })
            .catch(() => {});
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
    }, [userInfo, fetchProfile, fetchNotificationCount, netInfo.isConnected, BASE_URL]),
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

  const handlePullToRefresh = useCallback(async () => {
    if (!userInfo) return;
    setRefreshing(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchNotificationCount?.(),
        activeTab === "saved" ? fetchSavedVideos() : Promise.resolve(),
        activeTab === "liked" ? fetchLikedVideos() : Promise.resolve(),
      ]);
    } catch (_) {}
    setRefreshing(false);
  }, [
    userInfo,
    fetchProfile,
    fetchNotificationCount,
    fetchSavedVideos,
    fetchLikedVideos,
    activeTab,
  ]);

  const copyUserId = () => {
    if (userInfo?._id) {
      Clipboard.setString(userInfo._id);
      Alert.alert("✅ تم النسخ", "تم نسخ معرف المستخدم إلى الحافظة", [
        { text: "حسناً" },
      ]);
    }
  };

  const handleShareProfile = useCallback(async () => {
    if (!userInfo?._id) {
      Alert.alert("خطأ", "لا يمكن مشاركة الملف الشخصي حالياً");
      return;
    }
    const handle = profile?.username || userInfo.username || "user";
    const appLink = `tikbook://user/${userInfo._id}`;
    const webLink = `https://tikbook.com/@${handle}`;
    const message = `تابعني على TikBook 🎬\n@${handle}\n\nافتح داخل التطبيق:\n${appLink}\n\nأو من المتصفح:\n${webLink}`;
    try {
      await Share.share(
        {
          message,
          url: webLink,
          title: `@${handle}`,
        },
        { dialogTitle: "مشاركة الملف الشخصي" },
      );
    } catch (e) {
      console.log("Share error:", e?.message);
    }
  }, [userInfo, profile]);

  const openFollowList = (type) => {
    if (!userInfo?._id) return;
    navigation.navigate("FollowList", {
      userId: userInfo._id,
      type,
      username: profile?.username || userInfo.username,
    });
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
      {/* Static gradient background */}
      <StaticBg theme={theme} />
      <StatusBar
        barStyle={theme.id === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
      />

      {/* Header: VIP شعار وسط الشاشة بصريًا (جناحان متساويان + طبقة مطلقة) */}
      <View style={styles.header}>
        <View style={[styles.headerSide, styles.headerSideStart]}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setMenuVisible(true)}
          >
            <MaterialCommunityIcons name="menu" size={28} color={theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleShareProfile}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="share-variant-outline"
              size={24}
              color={theme.icon}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenterSlot} pointerEvents="box-none">
          {profile?.vipLevel > 0 &&
            (() => {
              const vl = vipLevels.find(
                (l) => Number(l.level) === Number(profile.vipLevel),
              );
              return (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Levels")}
                  activeOpacity={0.85}
                  style={styles.headerVipBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <LevelBadgeIcon
                    level={profile.vipLevel}
                    size="small"
                    imageUrl={vl?.badgeImageUrl || vl?.imageUrl || undefined}
                    lottieUrl={
                      !vl?.badgeImageUrl && !vl?.imageUrl
                        ? vl?.badgeLottieUrl
                        : undefined
                    }
                    color={vl?.color || "#FFD700"}
                  />
                </TouchableOpacity>
              );
            })()}
        </View>

        <View style={[styles.headerSide, styles.headerSideEnd]}>
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
                    backgroundColor: "#FF3366",
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor="#FF3366"
            colors={["#FF3366"]}
            title="تحديث…"
            titleColor="#FF3366"
          />
        }
      >
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          {/* Avatar with Badge Frame */}
          <View style={styles.avatarContainer}>
            {/* ── Touchable: avatar photo + status ring ── */}
            <TouchableOpacity
              onPress={handleChangeProfilePicture}
              activeOpacity={0.9}
              style={styles.avatarWrapper}
            >
              {/* Dual status ring */}
              {userStatuses.length > 0 && (
                <View style={styles.statusRingOuter} pointerEvents="none">
                  {userStatuses.length >= 2 ? (
                    <LinearGradient
                      colors={[
                        userStatuses[0]?.bgColor || "#FF3366",
                        userStatuses[0]?.bgColor || "#FF3366",
                        userStatuses[1]?.bgColor || "#0A84FF",
                        userStatuses[1]?.bgColor || "#0A84FF",
                      ]}
                      locations={[0, 0.49, 0.51, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.statusRingGradient}
                    />
                  ) : (
                    <View style={[styles.statusRingGradient, { backgroundColor: userStatuses[0]?.bgColor || "#FF3366" }]} />
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
            </TouchableOpacity>

            {/* ── Camera button — rendered after the frame so it sits on top ── */}
            <TouchableOpacity
              onPress={handleChangeProfilePicture}
              activeOpacity={0.8}
              style={styles.cameraBtn}
            >
              <Ionicons name="camera" size={18} color="#FFF" />
            </TouchableOpacity>

            {/* ── Profile frame overlay — rendered as a SIBLING of the
                 TouchableOpacity so it is never clipped by avatarWrapper's
                 bounds (Android clips absolute children to parent even with
                 overflow:visible). Fills the full avatarContainer (170×170). ── */}
            {(() => {
              const activeBadgeUrl =
                profile?.activeBadge?.imageUrl ||
                profile?.activeBadge?.image ||
                (typeof profile?.activeBadge === "string" ? profile.activeBadge : null);
              const vl = vipLevels.find((l) => Number(l.level) === Number(profile?.vipLevel));
              const frameBenefit = vl?.benefits?.find((b) => b.type === "frame");
              const vipFrameUrl =
                frameBenefit?.imageUrl ||
                frameBenefit?.lottieUrl ||
                vl?.profileFrameLottieUrl ||
                vl?.badgeImageUrl ||
                null;
              const frameUrl =
                (typeof activeBadgeUrl === "string" && activeBadgeUrl.startsWith("http") ? activeBadgeUrl : null) ||
                (typeof vipFrameUrl === "string" && vipFrameUrl.startsWith("http") ? vipFrameUrl : null);
              if (!frameUrl) return null;
              const isLottie = /\.json($|\?)/i.test(frameUrl) ||
                (frameUrl.includes("/raw/upload/") && !/\.(png|jpe?g|webp|gif)($|\?)/i.test(frameUrl));
              return (
                <View pointerEvents="none" style={styles.badgeFrameOverlay}>
                  {isLottie ? (
                    <LottieView
                      source={{ uri: frameUrl }}
                      autoPlay
                      loop
                      style={styles.badgeFrameInner}
                      resizeMode="contain"
                    />
                  ) : (
                    <Image
                      source={{ uri: frameUrl }}
                      style={styles.badgeFrameInner}
                      resizeMode="contain"
                    />
                  )}
                </View>
              );
            })()}
          </View>

          {/* Name & Username (centered) */}
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>
              {profile?.username || "User"}
            </Text>
            {profile?.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={ms(18)}
                color={
                  profile?.verificationBadge === "gold" ? "#FFD700" : "#1DA1F2"
                }
                style={{ marginLeft: ms(2) }}
              />
            )}
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

          {/* Stats — tappable */}
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.7}
              onPress={() => setActiveTab("liked")}
            >
              <Text style={styles.statNumber}>{profile?.likesCount || 0}</Text>
              <Text style={styles.statLabel}>تسجيلات الإعجاب</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.7}
              onPress={() => openFollowList("followers")}
            >
              <Text style={styles.statNumber}>
                {profile?.followersCount || profile?.followers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>متابعين</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.7}
              onPress={() => openFollowList("following")}
            >
              <Text style={styles.statNumber}>
                {profile?.followingCount || profile?.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>أتابعه</Text>
            </TouchableOpacity>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>{profile?.bio || "لا توجد نبذة بعد"}</Text>

          {/* Action Buttons — compact pill design */}
          <View style={styles.actionButtons}>
            {/* Levels */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("Levels")}
              activeOpacity={0.82}
            >
              <LinearGradient
                colors={["#1E0A", "#0B1fff"]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {(() => {
                  const vipLvl = profile?.vipLevel || 0;
                  const vl = vipLevels.find((l) => l.level === vipLvl);
                  const badgeUrl = vl?.badgeImageUrl || vl?.imageUrl || null;
                  const badgeLottie = !badgeUrl ? (vl?.badgeLottieUrl || null) : null;
                  return (
                    <View style={styles.actionBtnIconSmall}>
                      {badgeUrl ? (
                        <Image
                          source={{ uri: badgeUrl }}
                          style={styles.actionBtnIconImg}
                          resizeMode="contain"
                        />
                      ) : badgeLottie ? (
                        <LottieView
                          source={{ uri: badgeLottie }}
                          autoPlay
                          loop
                          style={styles.actionBtnIconImg}
                        />
                      ) : (
                        <Ionicons name="ribbon" size={13} color="#FFD700" />
                      )}
                    </View>
                  );
                })()}
                <Text style={[styles.actionBtnLabel, { color: "#DCE9FF" }]}>المستويات</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Edit */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("EditProfile", { profile })}
              activeOpacity={0.82}
            >
              <LinearGradient
                colors={theme.id === "dark" ? ["#2A2A2E", "#1E1E22"] : ["#F2F2F2", "#E4E4E7"]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.actionBtnIconSmall, { backgroundColor: theme.id === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)" }]}>
                  <Feather name="edit-2" size={11} color={theme.text} />
                </View>
                <Text style={[styles.actionBtnLabel, { color: theme.text }]}>تعديل</Text>
              </LinearGradient>
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

// ── Static gradient background ────────────────────────────────────────────────
const StaticBg = ({ theme }) => (
  <LinearGradient
    colors={
      theme.id === "dark"
        ? screenBackgroundGradient.dark.colors
        : ["#EEE8F8", "#E8E0F5", "#EBF0F8"]
    }
    locations={
      theme.id === "dark"
        ? screenBackgroundGradient.dark.locations
        : [0, 0.55, 1]
    }
    start={
      theme.id === "dark"
        ? screenBackgroundGradient.dark.start
        : { x: 0.15, y: 0 }
    }
    end={
      theme.id === "dark"
        ? screenBackgroundGradient.dark.end
        : { x: 0.85, y: 1 }
    }
    style={{ ...StyleSheet.absoluteFillObject, zIndex: 0 }}
    pointerEvents="none"
  />
);

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: ms(16),
      paddingVertical: ms(10),
      minHeight: ms(52),
      backgroundColor: "transparent",
      position: "relative",
    },
    /** كل جانب نصف العرض المتبقي لتمركز الشعار مهما كان عدد الأيقونات */
    headerSide: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
      gap: ms(15),
    },
    headerSideStart: {
      justifyContent: "flex-start",
    },
    headerSideEnd: {
      justifyContent: "flex-end",
    },
    headerCenterSlot: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
    },
    headerTitle: {
      fontSize: fs(17),
      fontWeight: "bold",
      color: theme.text,
    },
    headerVipBtn: {
      alignItems: "center",
      justifyContent: "center",
    },
    headerVipBtnEmpty: {
      width: ms(40),
      height: ms(40),
      borderRadius: ms(20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.id === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    },
    iconButton: {
      padding: ms(4),
    },
    profileInfo: {
      alignItems: "center",
      paddingTop: ms(10),
      paddingBottom: ms(6),
    },
    avatarContainer: {
      position: "relative",
      width: ms(170),
      height: ms(170),
      marginBottom: ms(8),
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarWrapper: {
      width: ms(100),
      height: ms(100),
      overflow: "visible",
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
      // avatarCircle (100px) is centered in avatarContainer (170px),
      // so circle starts at 35px. Place camera at bottom-left corner of circle.
      bottom: ms(22),
      left: ms(28),
      width: ms(34),
      height: ms(34),
      borderRadius: ms(17),
      backgroundColor: "#1A1A1A",
      borderWidth: 2.5,
      borderColor: "#FFF",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 30,
      elevation: 30,
      shadowColor: darkUi.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
    },
    badgeFrameOverlay: {
      position: "absolute",
      // Fills the entire avatarContainer (170×170) — the frame is a sibling
      // of TouchableOpacity so Android never clips it.
      top: 0,
      left: 0,
      width: ms(170),
      height: ms(170),
      pointerEvents: "none",
      zIndex: 10,
      elevation: 10,
      backgroundColor: "transparent",
    },
    badgeFrameInner: {
      width: "100%",
      height: "100%",
    },
    badgeShopButton: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: "rgba(12, 10, 24, 0.88)",
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
      justifyContent: "center",
      gap: ms(6),
      marginBottom: ms(2),
      alignSelf: "center",
    },
    displayName: {
      fontSize: fs(17),
      fontWeight: "bold",
      color: theme.text,
    },
    username: {
      fontSize: fs(13),
      color: theme.textMuted,
      marginBottom: ms(8),
    },
    userIdContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
      paddingVertical: ms(2),
      paddingHorizontal: 0,
      marginBottom: ms(10),
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
      marginBottom: ms(10),
      gap: ms(16),
    },
    statItem: {
      alignItems: "center",
    },
    statNumber: {
      fontSize: fs(16),
      fontWeight: "bold",
      color: theme.text,
    },
    statLabel: {
      fontSize: fs(12),
      color: theme.textMuted,
      marginTop: ms(1),
    },
    statDivider: {
      width: 1,
      height: ms(22),
      backgroundColor: theme.border,
    },
    bio: {
      fontSize: fs(13),
      color: theme.text,
      marginBottom: ms(12),
      textAlign: "center",
      paddingHorizontal: ms(20),
    },
    actionButtons: {
      flexDirection: "row",
      gap: ms(8),
      marginTop: ms(2),
      marginBottom: ms(10),
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: ms(28),
    },
    actionBtn: {
      borderRadius: ms(999),
      shadowColor: darkUi.ink,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    actionBtnGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: ms(5),
      paddingHorizontal: ms(11),
      gap: ms(5),
      borderRadius: ms(999),
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      overflow: "hidden",
      minHeight: ms(28),
    },
    actionBtnIconSmall: {
     
      borderRadius: ms(5),
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    actionBtnIconImg: {
      width: ms(25),
      height: ms(25),
    },
    actionBtnLabel: {
      fontSize: fs(11),
      fontWeight: "700",
      letterSpacing: 0.2,
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
      display: "none",
    },
    levelsButton: {
      display: "none",
    },
    levelsButtonLabel: {
      display: "none",
    },
    buttonLabel: {
      display: "none",
    },
    badgeButtonLabel: {
      display: "none",
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
