import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import GradientBackground from "../components/GradientBackground";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Share,
  Alert,
  Clipboard,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import axios from "axios";
import { useNetInfo } from "@react-native-community/netinfo";
import OfflineNotice from "../components/OfflineNotice";
import VipBadge from "../components/VipBadge";
import { useApp } from "../context/AppContext";
import { ms, fs, getWindowDimensions } from "../utils/responsive";

const { width } = getWindowDimensions();

const UserProfileScreen = ({ route, navigation }) => {
  const { theme } = useApp();
  const { userId } = route.params;
  const { userInfo, userToken, BASE_URL } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [vipLevels, setVipLevels] = useState([]);
  const [videos, setVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    let active = true;
    fetch(`${BASE_URL}/vip/levels`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d?.levels) setVipLevels(d.levels);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [BASE_URL]);

  const ownedDisplayBadges = useMemo(() => {
    const raw = profile?.ownedBadges;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((ob) => ob?.badge)
      .filter((b) => b && typeof b.imageUrl === "string" && b.imageUrl.startsWith("http"));
  }, [profile?.ownedBadges]);

  const vipLevelMeta = useMemo(() => {
    const vl = vipLevels.find(
      (l) => Number(l.level) === Number(profile?.vipLevel),
    );
    return vl || null;
  }, [vipLevels, profile?.vipLevel]);

  useEffect(() => {
    if (netInfo.isConnected !== false) {
      fetchUserProfile();
    }
  }, [userId, netInfo.isConnected, fetchUserProfile]);

  const handlePullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUserProfile();
    } catch (_) {}
    setRefreshing(false);
  }, [fetchUserProfile]);

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

  const resolvedProfileMongoId =
    profile?._id != null && profile._id !== ""
      ? String(profile._id)
      : profile?.id != null && profile.id !== ""
        ? String(profile.id)
        : "";

  const copyProfileUserId = () => {
    if (resolvedProfileMongoId) {
      Clipboard.setString(resolvedProfileMongoId);
      Alert.alert("✅ تم النسخ", "تم نسخ معرف المستخدم إلى الحافظة", [
        { text: "حسناً" },
      ]);
    }
  };

  const handleShare = async () => {
    if (!profile?._id) return;
    const handle = profile.username || "user";
    const appLink = `tikbook://user/${profile._id}`;
    const webLink = `https://tikbook.com/@${handle}`;
    const message = `تعرّف على @${handle} على TikBook 🎬\n\nافتح داخل التطبيق:\n${appLink}\n\nأو من المتصفح:\n${webLink}`;
    try {
      await Share.share(
        {
          message,
          url: webLink,
          title: `@${handle}`,
        },
        { dialogTitle: "مشاركة الملف الشخصي" },
      );
    } catch (_) {}
  };

  const openFollowList = (type) => {
    if (!profile?._id) return;
    navigation.push("FollowList", {
      userId: profile._id,
      type,
      username: profile.username,
    });
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
        <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientBackground />
      <StatusBar barStyle="light-content" backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#F0EEFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {Number(profile.vipLevel) > 0 ? (
            <VipBadge
              level={profile.vipLevel}
              size="medium"
              imageUrl={
                vipLevelMeta?.badgeImageUrl ||
                vipLevelMeta?.imageUrl ||
                undefined
              }
            />
          ) : (
            <Text style={styles.headerTitle} numberOfLines={1}>
              @{profile.username}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={24} color="#F0EEFF" />
        </TouchableOpacity>
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
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {profile.profileImage ? (
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
            </View>

            {(() => {
              const activeBadgeUrl =
                profile?.activeBadge?.imageUrl ||
                profile?.activeBadge?.image ||
                (typeof profile?.activeBadge === "string"
                  ? profile.activeBadge
                  : null);
              const vl = vipLevels.find(
                (l) => Number(l.level) === Number(profile?.vipLevel),
              );
              const frameBenefit = vl?.benefits?.find((b) => b.type === "frame");
              const vipFrameUrl =
                frameBenefit?.imageUrl ||
                frameBenefit?.lottieUrl ||
                vl?.profileFrameLottieUrl ||
                vl?.badgeImageUrl ||
                null;
              const badgeUrlOk =
                typeof activeBadgeUrl === "string" &&
                activeBadgeUrl.startsWith("http")
                  ? activeBadgeUrl
                  : null;
              const vipOk =
                typeof vipFrameUrl === "string" && vipFrameUrl.startsWith("http")
                  ? vipFrameUrl
                  : null;
              const frameUrl = badgeUrlOk || vipOk;
              if (!frameUrl) return null;
              const isLottie =
                /\.json($|\?)/i.test(frameUrl) ||
                (frameUrl.includes("/raw/upload/") &&
                  !/\.(png|jpe?g|webp|gif)($|\?)/i.test(frameUrl));
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

          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profile.username}</Text>
            {profile.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={ms(18)}
                color={
                  profile.verificationBadge === "gold" ? "#FFD700" : "#1DA1F2"
                }
                style={{ marginLeft: ms(2) }}
              />
            )}
          
          </View>

          <Text style={styles.username}>@{profile.username}</Text>

          {!!resolvedProfileMongoId && (
            <TouchableOpacity
              style={styles.userIdContainer}
              onPress={copyProfileUserId}
              activeOpacity={0.7}
            >
              <Text style={[styles.userIdLabel, { color: theme.textMuted }]}>
                ID:{" "}
              </Text>
              <Text style={[styles.userIdText, { color: theme.textSecondary }]}>
                {resolvedProfileMongoId.slice(-8).toUpperCase()}
              </Text>
              <Ionicons
                name="copy-outline"
                size={12}
                color="#888"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          )}

          {Number(profile.level) > 0 && (
            <Text style={styles.levelHint}>
              مستوى النشاط {Number(profile.level)}
            </Text>
          )}

          {/* Stats — tappable */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.totalLikes ?? 0}</Text>
              <Text style={styles.statLabel}>إعجاب</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.7}
              onPress={() => openFollowList("followers")}
            >
              <Text style={styles.statNumber}>
                {profile.followersCount ?? profile.followers?.length ?? 0}
              </Text>
              <Text style={styles.statLabel}>متابعون</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              activeOpacity={0.7}
              onPress={() => openFollowList("following")}
            >
              <Text style={styles.statNumber}>
                {profile.followingCount ?? profile.following?.length ?? 0}
              </Text>
              <Text style={styles.statLabel}>متابَعة</Text>
            </TouchableOpacity>
          </View>

          {ownedDisplayBadges.length > 0 && (
            <View style={styles.badgesSection}>
              <Text style={styles.badgesSectionTitle}>الشارات</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesRow}
              >
                {ownedDisplayBadges.map((b) => (
                    <Image
                      key={String(b._id || b.name)}
                      source={{ uri: b.imageUrl }}
                      style={styles.badgeThumb}
                      resizeMode="contain"
                    />
                  ))}
              </ScrollView>
            </View>
          )}

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
              <Ionicons name="chatbubble-outline" size={18} color="#B8B0D8" />
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
              color={activeTab === "videos" ? "#F0EEFF" : "#7A728A"}
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
              color={activeTab === "liked" ? "#F0EEFF" : "#7A728A"}
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
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
    backgroundColor: "transparent",
  },
  iconButton: {
    padding: ms(4),
    minWidth: ms(44),
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minHeight: ms(44),
    marginHorizontal: ms(8),
  },
  headerTitle: {
    flex: 1,
    fontSize: fs(17),
    fontWeight: "bold",
    color: "#F0EEFF",
    textAlign: "center",
  },
  profileInfo: {
    alignItems: "center",
    paddingTop: ms(20),
    paddingBottom: ms(10),
    paddingHorizontal: ms(16),
  },
  avatarContainer: {
    position: "relative",
    width: ms(170),
    height: ms(170),
    marginBottom: ms(12),
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrapper: {
    width: ms(100),
    height: ms(100),
    overflow: "visible",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarCircle: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    overflow: "hidden",
    backgroundColor: "#151228",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#151228",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeFrameOverlay: {
    position: "absolute",
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(6),
    marginBottom: ms(4),
  },
  displayName: {
    fontSize: fs(18),
    fontWeight: "bold",
    color: "#F0EEFF",
  },
  username: {
    fontSize: fs(14),
    color: "#B8B0D8",
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
    fontWeight: "600",
  },
  userIdText: {
    fontSize: fs(12),
    fontFamily: "monospace",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  levelHint: {
    fontSize: fs(13),
    color: "#9B92B8",
    marginBottom: ms(12),
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
    color: "#F0EEFF",
  },
  statLabel: {
    fontSize: fs(13),
    color: "#888",
    marginTop: ms(2),
  },
  statDivider: {
    width: 1,
    height: ms(15),
    backgroundColor: "#2A2550",
  },
  bio: {
    fontSize: fs(14),
    color: "#B8B0D8",
    marginBottom: ms(20),
    textAlign: "center",
    lineHeight: ms(20),
  },
  badgesSection: {
    width: "100%",
    marginBottom: ms(16),
    paddingHorizontal: ms(4),
  },
  badgesSectionTitle: {
    fontSize: fs(14),
    fontWeight: "600",
    color: "#F0EEFF",
    marginBottom: ms(8),
    alignSelf: "flex-start",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(4),
    paddingLeft: ms(4),
  },
  badgeThumb: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(12),
    backgroundColor: "#151228",
    marginRight: ms(10),
  },
  actionButtons: {
    flexDirection: "row",
    gap: ms(10),
    marginBottom: ms(10),
    width: "100%",
    justifyContent: "center",
  },
  followButton: {
    flex: 1,
    backgroundColor: "#FF3366",
    paddingVertical: ms(10),
    borderRadius: ms(8),
    alignItems: "center",
    justifyContent: "center",
  },
  followingButton: {
    backgroundColor: "#151228",
    borderWidth: 1,
    borderColor: "#2A2550",
  },
  followButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: fs(15),
  },
  followingButtonText: {
    color: "#B8B0D8",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    paddingHorizontal: ms(20),
    paddingVertical: ms(10),
    backgroundColor: "#151228",
    borderRadius: ms(8),
    justifyContent: "center",
  },
  messageButtonText: {
    color: "#F0EEFF",
    fontWeight: "600",
    fontSize: fs(14),
  },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2550",
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
    height: ms(2),
    backgroundColor: "#7C5DFA",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem: {
    width: width / 3,
    height: (width / 3) * 1.3,
    backgroundColor: "#151228",
    position: "relative",
    borderWidth: 0.5,
    borderColor: "#2A2550",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#151228",
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
    color: "#F0EEFF",
    marginTop: ms(20),
    marginBottom: ms(10),
  },
  emptyStateSubtitle: {
    fontSize: fs(14),
    color: "#B8B0D8",
    textAlign: "center",
    lineHeight: ms(20),
  },
});

export default UserProfileScreen;
