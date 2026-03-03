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

  // Fix: handle Android hardware back button (tab screens have no back stack)
  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        navigation.navigate("Home");
        return true; // prevent default GO_BACK
      };
      BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => BackHandler.removeEventListener("hardwareBackPress", onBack);
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#FFF",
  },
  iconButton: {
    padding: 8,
  },
  createButtonContainer: {
    backgroundColor: "#2ECC71", // Green add button
    padding: 4,
    borderRadius: 8,
  },
  tabsContainer: {
    flexDirection: "row-reverse", // Arabic alignment
    gap: 20,
  },
  tabItem: {
    alignItems: "center",
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 17,
  },
  tabIndicator: {
    height: 3,
    width: 20,
    backgroundColor: "#2ECC71", // Green indicator
    marginTop: 4,
    borderRadius: 2,
  },

  // Stories
  storiesSection: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
    marginBottom: 8,
  },
  storiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  storiesTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF4081", // Pinkish as in screenshot
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 12,
    color: "#999",
  },
  storiesList: {
    paddingHorizontal: 12,
    flexDirection: "row-reverse", // RTL list
  },
  storyItem: {
    alignItems: "center",
    marginHorizontal: 8,
    width: 60,
  },
  storyAvatarContainer: {
    position: "relative",
    marginBottom: 4,
  },
  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#FF4081", // Pink border
  },
  liveBadgeSmall: {
    position: "absolute",
    bottom: -2,
    alignSelf: "center",
    backgroundColor: "#FF4081",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: "#FFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  storyName: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
  },

  // Filters
  filterScroll: {
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 12,
    flexDirection: "row-reverse", // RTL
  },
  filterChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  filterText: {
    fontSize: 13,
    color: "#333",
    marginRight: 6,
  },
  filterIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  // Rooms Grid
  listContent: {
    paddingBottom: 80,
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 12,
    flexDirection: "row-reverse", // RTL Grid
  },
  roomCard: {
    width: (width - 32) / 2,
    marginBottom: 16,
  },
  roomImage: {
    width: "100%",
    height: 200, // Taller image
    borderRadius: 12,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  viewerBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    zIndex: 1,
  },
  viewerCount: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  specialBanner: {
    position: "absolute",
    top: 30,
    left: 0,
    backgroundColor: "#FFD700", // Gold/Yellow
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  specialBannerText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "bold",
  },
  cardBottom: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 8,
  },
  hostName: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    flex: 1,
    textAlign: "right",
    marginRight: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  categoryPill: {
    backgroundColor: "#2ECC71", // Green pill
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  roomCaption: {
    marginTop: 6,
    fontSize: 13,
    color: "#333",
    textAlign: "right", // Arabic
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    textAlign: "right",
  },
});

export default LiveRoomsListScreen;
