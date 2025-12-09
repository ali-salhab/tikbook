import React, { useContext, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import ProfileMenuModal from "../components/ProfileMenuModal";

const { width } = Dimensions.get("window");
const COLUMN_WIDTH = width / 3;

const ProfileScreen = ({ navigation }) => {
  const { logout, userInfo, userToken, BASE_URL } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState([]);
  const [repostVideos, setRepostVideos] = useState([]);
  const [savedVideos, setSavedVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/users/${userInfo._id}`);
      setProfile(res.data);

      // Fetch user's videos
      const videosRes = await axios.get(
        `${BASE_URL}/videos?userId=${userInfo._id}`
      );
      setVideos(videosRes.data);
    } catch (e) {
      console.log("❌ Error fetching profile:", e.message);
      // Use enhanced dummy data if fetch fails
      setProfile({
        _id: userInfo?._id || "1",
        username: "abu_adam337",
        displayName: "ابو ادم",
        email: userInfo?.email || "user@tikbook.com",
        followers: Array(2420).fill(1),
        following: Array(34).fill(1),
        bio: "صلو على خير خلق الله ❤️",
        profileImage: null,
        videosCount: 12,
        likesCount: 3176,
      });

      // Mock videos to match screenshot
      setVideos([
        { _id: "1", views: "16 ألف", pinned: true, image: null },
        { _id: "2", views: "15.5 ألف", pinned: true, image: null },
        { _id: "3", views: "18.9 ألف", pinned: true, image: null },
        { _id: "4", views: "13.7 ألف", pinned: false, image: null },
        { _id: "5", views: "19.6 ألف", pinned: false, image: null },
        { _id: "6", views: "12.4 ألف", pinned: false, image: null },
      ]);

      setRepostVideos([
        { _id: "r1", date: "26 يونيو", image: null },
        { _id: "r2", date: "16 أغسطس", image: null },
        { _id: "r3", date: "28 أغسطس", image: null },
        { _id: "r4", date: "22 يونيو", image: null },
        { _id: "r5", date: "22 يونيو", image: null },
        { _id: "r6", date: "22 يونيو", image: null },
      ]);

      setSavedVideos([
        { _id: "s1", views: "18.7 ألف", image: null },
        { _id: "s2", views: "0", image: null },
        { _id: "s3", views: "0", image: null },
      ]);

      setLikedVideos([
        { _id: "l1", views: "9.4 مليون", image: null },
        { _id: "l2", views: "172", image: null },
        { _id: "l3", views: "91.4 ألف", image: null },
      ]);
    }
  }, [userInfo, BASE_URL]);

  useFocusEffect(
    useCallback(() => {
      if (userInfo) {
        fetchProfile();
      } else {
        // Default profile when not logged in
        setProfile({
          username: "guest",
          displayName: "ضيف",
          email: "guest@tikbook.com",
          followers: [],
          following: [],
          bio: "مرحباً! سجل الدخول لرؤية ملفك الشخصي 👋",
          videosCount: 0,
          likesCount: 0,
        });
      }
    }, [userInfo, fetchProfile])
  );

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "videos":
        return (
          <View style={styles.gridContainer}>
            {videos.map((video, index) => (
              <TouchableOpacity
                key={video._id}
                style={styles.gridItem}
                onPress={() =>
                  navigation.navigate("Home", { videoId: video._id })
                }
              >
                <Image
                  source={{
                    uri: `https://picsum.photos/200/300?random=${index}`,
                  }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                {video.pinned && (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedText}>مثبت</Text>
                  </View>
                )}
                <View style={styles.viewsContainer}>
                  <Ionicons name="play-outline" size={14} color="#FFF" />
                  <Text style={styles.viewsText}>{video.views || "10k"}</Text>
                </View>
              </TouchableOpacity>
            ))}
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
          <View style={styles.gridContainer}>
            {repostVideos.map((video, index) => (
              <TouchableOpacity key={video._id} style={styles.gridItem}>
                <Image
                  source={{
                    uri: `https://picsum.photos/200/300?random=${index + 10}`,
                  }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                {video.date && (
                  <View style={styles.dateOverlay}>
                    <Text style={styles.dateText}>{video.date}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );
      case "saved":
        return (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.subTabsContainer}
            >
              {[
                "المنشورات",
                "المجموعات",
                "الأصوات",
                "المؤثرات",
                "المنتجات",
                "الأماكن",
              ].map((tab, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.subTab, index === 0 && styles.activeSubTab]}
                >
                  <Text
                    style={[
                      styles.subTabText,
                      index === 0 && styles.activeSubTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.gridContainer}>
              {savedVideos.map((video, index) => (
                <TouchableOpacity key={video._id} style={styles.gridItem}>
                  <Image
                    source={{
                      uri: `https://picsum.photos/200/300?random=${index + 20}`,
                    }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  <View style={styles.viewsContainer}>
                    <Ionicons name="play-outline" size={14} color="#FFF" />
                    <Text style={styles.viewsText}>{video.views || "0"}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case "liked":
        return (
          <View>
            <View style={styles.privacyBanner}>
              <Text style={styles.privacyBannerText}>
                يمكنك جعل مقاطع الفيديو التي أعجبت بها عامة من إعدادات الخصوصية
              </Text>
              <TouchableOpacity>
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.gridContainer}>
              {likedVideos.map((video, index) => (
                <TouchableOpacity key={video._id} style={styles.gridItem}>
                  <Image
                    source={{
                      uri: `https://picsum.photos/200/300?random=${index + 30}`,
                    }}
                    style={styles.gridImage}
                    resizeMode="cover"
                  />
                  <View style={styles.viewsContainer}>
                    <Ionicons name="play-outline" size={14} color="#FFF" />
                    <Text style={styles.viewsText}>{video.views || "0"}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
          <Text style={styles.headerTitle}>
            {profile?.displayName || "User"}
          </Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>4</Text>
          </View>
          {/* Tooltip Bubble */}
          <View style={styles.tooltipBubble}>
            <Text style={styles.tooltipText}>أخبرنا ماذا حدث</Text>
            <View style={styles.tooltipArrow} />
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-add-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Image
                source={{
                  uri: "https://ui-avatars.com/api/?name=Abu+Adam&background=random&size=200",
                }}
                style={styles.avatarImage}
              />
            </View>
            <TouchableOpacity style={styles.addStoryButton}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Name & Username */}
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>
              {profile?.displayName || "ابو ادم"}
            </Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>+9</Text>
            </View>
          </View>
          <Text style={styles.username}>
            @{profile?.username || "abu_adam337"}
          </Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.likesCount || 3176}
              </Text>
              <Text style={styles.statLabel}>تسجيلات الإعجاب</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.followers?.length || 2420}
              </Text>
              <Text style={styles.statLabel}>متابعين</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {profile?.following?.length || 34}
              </Text>
              <Text style={styles.statLabel}>أتابعه</Text>
            </View>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>
            {profile?.bio || "صلو على خير خلق الله ❤️"}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editProfileButton}>
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
  headerBadge: {
    position: "absolute",
    top: -5,
    right: -15,
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingHorizontal: 4,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  tooltipBubble: {
    position: "absolute",
    top: 30,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    width: 120,
    alignItems: "center",
  },
  tooltipText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  tooltipArrow: {
    position: "absolute",
    top: -6,
    left: "50%",
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#FFF",
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
  verifiedBadge: {
    backgroundColor: "#FE2C55",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  verifiedText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
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
    padding: 1,
  },
  gridItem: {
    width: COLUMN_WIDTH - 2,
    height: COLUMN_WIDTH * 1.3,
    margin: 1,
    backgroundColor: "#333",
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#555",
  },
  pinnedBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#FE2C55",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  pinnedText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
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
  dateOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
  },
  dateText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subTabsContainer: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  subTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#f1f1f1",
  },
  activeSubTab: {
    backgroundColor: "#333",
  },
  subTabText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  activeSubTabText: {
    color: "#FFF",
  },
  privacyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f8f8f8",
    margin: 1,
  },
  privacyBannerText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    textAlign: "right",
    marginRight: 10,
  },
});

export default ProfileScreen;
