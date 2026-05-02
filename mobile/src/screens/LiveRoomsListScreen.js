import React, { useState, useEffect, useContext, useCallback } from "react";
import GradientBackground from "../components/GradientBackground";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  ImageBackground,
  TextInput,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { AuthContext } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { ms, fs, getWindowDimensions } from "../utils/responsive";
import { useApp } from "../context/AppContext";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";

const { width } = getWindowDimensions();

const LiveRoomsListScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const [liveRooms, setLiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("popular"); // 'all', 'nearby', 'popular'
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [vipLevelMap, setVipLevelMap] = useState({}); // level number → { profileFrameLottieUrl, badgeImageUrl }

  const filteredRooms = searchText.trim()
    ? liveRooms.filter(
        (r) =>
          r.host?.username?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.title?.toLowerCase().includes(searchText.toLowerCase()),
      )
    : liveRooms;

  useEffect(() => {
    fetchLiveRooms();
    fetchVipLevels();
  }, [activeTab]);

  const fetchVipLevels = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/vip/levels`);
      const levels = Array.isArray(res.data?.levels) ? res.data.levels : [];
      const map = {};
      levels.forEach((l) => {
        const n = Number(l?.level);
        if (n > 0) map[n] = {
          profileFrameLottieUrl: l.profileFrameLottieUrl || null,
          badgeImageUrl: l.badgeImageUrl || null,
        };
      });
      setVipLevelMap(map);
    } catch (_) {}
  };

  // Refresh rooms list every time the screen gains focus (avoids stale ended rooms)
  useFocusEffect(
    useCallback(() => {
      fetchLiveRooms();

      // Fix: handle Android hardware back button (tab screens have no back stack)
      const onBack = () => {
        navigation.navigate("MainTabs", { screen: "Home" });
        return true; // prevent default GO_BACK
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  const fetchLiveRooms = async () => {
    try {
      // In a real app, you would pass activeTab to the API
      const response = await axios.get(`${BASE_URL}/live-rooms`, {
        params: { category: "all" }, // Default to all for now
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.data.success) {
        setLiveRooms(
          (response.data.data || []).filter((r) => r.status === "active"),
        );
      } else {
        // Fallback or mock if empty
        setLiveRooms([]);
      }
    } catch (error) {
      console.error("Error fetching live rooms:", error);
      // setLiveRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveRooms();
  };

  const handleCreateRoom = () => {
    navigation.navigate("CreateLiveRoom");
  };

  const handleJoinRoom = (room) => {
    navigation.navigate("LiveRoom", { roomId: room.roomId });
  };

  // ─── RENDER HELPERS ─────────────────────────────────────────────────────────

  const renderHeader = () => (
    <>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        {/* Left Icon (Home/Green House) */}
        <TouchableOpacity style={styles.iconButton} onPress={handleCreateRoom}>
          <View style={styles.createButtonContainer}>
            <Ionicons name="add" size={16} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Center Tabs */}
        <View style={styles.tabsContainer}>
          {["الكل", "المجاورون", "شعبي"].map((tab) => {
            const tabKey =
              tab === "شعبي"
                ? "popular"
                : tab === "المجاورون"
                  ? "nearby"
                  : "all";
            const isActive = activeTab === tabKey;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tabKey)}
                style={styles.tabItem}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab}
                </Text>
                {isActive && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Right Icon (Search) */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setShowSearch((v) => !v);
            if (showSearch) setSearchText("");
          }}
        >
          <Ionicons
            name={showSearch ? "close" : "search"}
            size={24}
            color="#333"
          />
        </TouchableOpacity>
      </View>
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={16}
            color="#999"
            style={{ marginRight: 6 }}
          />
          <TextInput
            autoFocus
            value={searchText}
            onChangeText={setSearchText}
            placeholder="ابحث عن غرفة أو مضيف..."
            placeholderTextColor="#999"
            style={styles.searchInput}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={16} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  const renderRoomItem = ({ item }) => {
    const viewers = item.participantCount || item.listeners?.length || 0;
    const hostVipLevel = Number(item.host?.vipLevel || 0);
    const hostVipEntry = hostVipLevel > 0 ? vipLevelMap[hostVipLevel] : null;
    const hostFrameUrl =
      item.host?.activeBadge?.imageUrl ||
      item.host?.activeBadge?.image ||
      (typeof item.host?.activeBadge === "string" ? item.host.activeBadge : null) ||
      hostVipEntry?.profileFrameLottieUrl ||
      hostVipEntry?.badgeImageUrl ||
      null;
    // Only use PNG frames (skip Lottie raw URLs) for Image component
    const isLottieFrame = hostFrameUrl && (
      /\.json($|\?)/i.test(hostFrameUrl) || hostFrameUrl.includes("/raw/upload/")
    );
    const pngFrameUrl = hostFrameUrl && !isLottieFrame ? hostFrameUrl : null;

    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() => handleJoinRoom(item)}
        activeOpacity={0.9}
      >
        <View style={styles.roomImageWrap}>
        <ImageBackground
          source={{
            uri:
              item.host?.profileImage ||
              item.host?.avatar ||
              item.coverImage ||
              null,
          }}
          defaultSource={require("../../assets/icon.png")}
          style={styles.roomImage}
          imageStyle={{ borderRadius: 12 }}
        >
          {/* Overlay Gradient */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.75)"]}
            style={styles.cardGradient}
          />

          {/* Top Left Badge (Viewers) */}
          <View style={styles.viewerBadge}>
            <Ionicons name="person" size={10} color="#FFF" />
            <Text style={styles.viewerCount}>{viewers}</Text>
          </View>

          {/* Bottom Info — host avatar + name + title */}
          <View style={styles.cardBottom}>
            {/* Host avatar with VIP frame */}
            <View style={styles.hostAvatarWrap}>
              <ProfileBadgeFrame
                profileImage={item.host?.profileImage || item.host?.avatar || null}
                badgeImage={pngFrameUrl}
                size={ms(34)}
              />
            </View>
            <View style={styles.hostInfoCol}>
              <Text style={styles.hostName} numberOfLines={1}>
                {item.host?.username || "Unknown"}
              </Text>
              {item.title ? (
                <Text style={styles.roomTitleInCard} numberOfLines={1}>
                  {item.title}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Live frame PNG overlay */}
          <Image
            source={require("../../assets/live_frame/live.png")}
            style={styles.liveFrameOverlay}
            resizeMode="stretch"
            pointerEvents="none"
          />
        </ImageBackground>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <GradientBackground />
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      {renderHeader()}

      <FlatList
        data={filteredRooms}
        renderItem={renderRoomItem}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا يوجد بث مباشر حالياً</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingBottom: ms(10),
    backgroundColor: "transparent",
  },
  iconButton: {
    padding: ms(8),
  },
  createButtonContainer: {
    backgroundColor: "#2ECC71",
    padding: ms(4),
    borderRadius: ms(8),
  },
  tabsContainer: {
    flexDirection: "row-reverse",
    gap: ms(20),
  },
  tabItem: {
    alignItems: "center",
    paddingVertical: ms(6),
  },
  tabText: {
    fontSize: fs(16),
    color: "#B8B0D8",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#F0EEFF",
    fontWeight: "bold",
    fontSize: fs(17),
  },
  tabIndicator: {
    height: ms(3),
    width: ms(20),
    backgroundColor: "#2ECC71",
    marginTop: ms(4),
    borderRadius: ms(2),
  },

  // Stories
  storiesSection: {
    backgroundColor: "transparent",
    paddingVertical: ms(12),
    marginBottom: ms(8),
  },
  storiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    marginBottom: ms(10),
  },
  storiesTitle: {
    fontSize: fs(14),
    fontWeight: "bold",
    color: "#FF4081",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: fs(12),
    color: "#999",
  },
  storiesList: {
    paddingHorizontal: ms(12),
    flexDirection: "row-reverse",
  },
  storyItem: {
    alignItems: "center",
    marginHorizontal: ms(8),
    width: ms(60),
  },
  storyAvatarContainer: {
    position: "relative",
    marginBottom: ms(4),
  },
  storyAvatar: {
    width: ms(52),
    height: ms(52),
    borderRadius: ms(26),
    borderWidth: 1.5,
    borderColor: "#7C5DFA",
  },
  liveBadgeSmall: {
    position: "absolute",
    bottom: -2,
    alignSelf: "center",
    backgroundColor: "#FF4081",
    paddingHorizontal: ms(4),
    borderRadius: ms(4),
  },
  liveBadgeText: {
    color: "#FFF",
    fontSize: fs(8),
    fontWeight: "bold",
  },
  storyName: {
    fontSize: fs(11),
    color: "#B8B0D8",
    textAlign: "center",
  },

  // Filters
  filterScroll: {
    marginBottom: ms(12),
  },
  filterContent: {
    paddingHorizontal: ms(12),
    flexDirection: "row-reverse",
  },
  filterChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#151228",
    borderRadius: ms(20),
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    marginHorizontal: ms(4),
    borderWidth: 1,
    borderColor: "#2A2550",
  },
  filterText: {
    fontSize: fs(13),
    color: "#B8B0D8",
    marginRight: ms(6),
  },
  filterIconContainer: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    justifyContent: "center",
    alignItems: "center",
  },

  // Rooms Grid
  listContent: {
    paddingBottom: ms(80),
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: ms(12),
    flexDirection: "row-reverse",
  },
  roomCard: {
    width: (width - 32) / 2,
    marginBottom: ms(16),
  },
  roomImageWrap: {
    width: "100%",
    height: ms(200),
    position: "relative",
    overflow: "hidden",
    borderRadius: ms(12),
  },
  liveFrameOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 10,
  },
  roomImage: {
    width: "100%",
    height: ms(200),
    borderRadius: ms(12),
    overflow: "hidden",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ms(12),
  },
  viewerBadge: {
    position: "absolute",
    top: ms(10),
    left: ms(10),
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
    gap: ms(4),
    zIndex: 12,
  },
  viewerCount: {
    color: "#f00808",
    fontSize: fs(14),
    fontWeight: "bold",
  },
  specialBanner: {
    position: "absolute",
    top: ms(30),
    left: 0,
    backgroundColor: "#FFD700",
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderTopRightRadius: ms(8),
    borderBottomRightRadius: ms(8),
    zIndex: 1,
  },
  specialBannerText: {
    color: "#000",
    fontSize: fs(10),
    fontWeight: "bold",
  },
  cardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: ms(8),
    gap: ms(6),
  },
  hostAvatarWrap: {
    flexShrink: 0,
  },
  hostInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  hostName: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "bold",
    textAlign: "left",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  roomTitleInCard: {
    color: "rgba(255,255,255,0.82)",
    fontSize: fs(10),
    marginTop: ms(2),
    textAlign: "left",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  emptyContainer: {
    padding: ms(40),
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: fs(16),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    marginHorizontal: ms(16),
    marginBottom: ms(8),
    borderRadius: ms(20),
    paddingHorizontal: ms(14),
    paddingVertical: ms(8),
  },
  searchInput: {
    flex: 1,
    fontSize: fs(14),
    color: "#333",
    textAlign: "right",
  },
});

export default LiveRoomsListScreen;
