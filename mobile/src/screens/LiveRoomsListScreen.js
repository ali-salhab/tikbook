import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
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
import { ms, fs } from "../utils/responsive";

const { width } = Dimensions.get("window");

const LiveRoomsListScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [liveRooms, setLiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("popular"); // 'all', 'nearby', 'popular'
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredRooms = searchText.trim()
    ? liveRooms.filter(
        (r) =>
          r.host?.username?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.title?.toLowerCase().includes(searchText.toLowerCase()),
      )
    : liveRooms;

  useEffect(() => {
    fetchLiveRooms();
  }, [activeTab]);

  // Refresh rooms list every time the screen gains focus (avoids stale ended rooms)
  useFocusEffect(
    useCallback(() => {
      fetchLiveRooms();

      // Fix: handle Android hardware back button (tab screens have no back stack)
      const onBack = () => {
        navigation.navigate("Home");
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
    // Generate random stats for demo purposes if not present
    const viewers =
      item.participantCount || Math.floor(Math.random() * 200) + 50;
    const category = item.category || "عشوائي";

    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() => handleJoinRoom(item)}
        activeOpacity={0.9}
      >
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
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.cardGradient}
          />

          {/* Top Left Badge (Viewers) */}
          <View style={styles.viewerBadge}>
            <Ionicons name="person" size={10} color="#FFF" />
            <Text style={styles.viewerCount}>{viewers}</Text>
          </View>

          {/* Special Banner (Optional) */}
          {Math.random() > 0.7 && (
            <View style={styles.specialBanner}>
              <Text style={styles.specialBannerText}>LUDO</Text>
            </View>
          )}

          {/* Bottom Info */}
          <View style={styles.cardBottom}>
            <Text style={styles.hostName} numberOfLines={1}>
              {item.host?.username || "Unknown"}
            </Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{category}</Text>
            </View>
          </View>
        </ImageBackground>

        {/* Caption below card */}
        <Text style={styles.roomCaption} numberOfLines={1}>
          {item.title || "انضم للمشاهدة الآن!"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
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
    backgroundColor: "#F8F8F8",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingBottom: ms(10),
    backgroundColor: "#FFF",
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
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#000",
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
    backgroundColor: "#FFF",
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
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    borderWidth: 2,
    borderColor: "#FF4081",
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
    color: "#333",
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
    backgroundColor: "#FFF",
    borderRadius: ms(20),
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    marginHorizontal: ms(4),
    borderWidth: 1,
    borderColor: "#EEE",
  },
  filterText: {
    fontSize: fs(13),
    color: "#333",
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
  roomImage: {
    width: "100%",
    height: ms(200),
    borderRadius: ms(12),
    justifyContent: "space-between",
    overflow: "hidden",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ms(12),
  },
  viewerBadge: {
    position: "absolute",
    top: ms(8),
    left: ms(8),
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
    gap: ms(4),
    zIndex: 1,
  },
  viewerCount: {
    color: "#FFF",
    fontSize: fs(10),
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
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: ms(8),
  },
  hostName: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "bold",
    flex: 1,
    textAlign: "right",
    marginRight: ms(4),
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  categoryPill: {
    backgroundColor: "#2ECC71",
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
  },
  categoryText: {
    color: "#FFF",
    fontSize: fs(10),
    fontWeight: "bold",
  },
  roomCaption: {
    marginTop: ms(6),
    fontSize: fs(13),
    color: "#333",
    textAlign: "right",
    fontWeight: "500",
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
