import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://tikbook-1cdb.onrender.com/api";

const LiveRoomsListScreen = ({ navigation }) => {
  const [liveRooms, setLiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "All", icon: "apps" },
    { id: "music", name: "Music", icon: "musical-notes" },
    { id: "chat", name: "Chat", icon: "chatbubbles" },
    { id: "gaming", name: "Gaming", icon: "game-controller" },
    { id: "education", name: "Education", icon: "school" },
    { id: "business", name: "Business", icon: "briefcase" },
  ];

  useEffect(() => {
    fetchLiveRooms();
  }, [selectedCategory]);

  const fetchLiveRooms = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(`${API_URL}/live-rooms`, {
        params: { category: selectedCategory },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setLiveRooms(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching live rooms:", error);
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

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons
        name={item.icon}
        size={18}
        color={selectedCategory === item.id ? "#fff" : "#666"}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.categoryTextActive,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderLiveRoomItem = ({ item }) => {
    const participantCount =
      item.speakers?.length + item.listeners?.length || 0;

    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() => handleJoinRoom(item)}
      >
        {/* Host Image */}
        <Image
          source={{
            uri: item.host?.avatar || "https://via.placeholder.com/100",
          }}
          style={styles.hostImage}
        />

        {/* Live Badge */}
        <View style={styles.liveBadge}>
          <MaterialIcons name="circle" size={8} color="#ff4444" />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Room Info */}
        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.host?.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
            )}
          </View>

          <Text style={styles.hostName} numberOfLines={1}>
            @{item.host?.username}
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={14} color="#666" />
              <Text style={styles.statText}>{participantCount}</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="mic" size={14} color="#666" />
              <Text style={styles.statText}>{item.speakers?.length || 0}</Text>
            </View>

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff4444" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Rooms</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRoom}
        >
          <Ionicons name="add-circle" size={28} color="#ff4444" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        contentContainerStyle={styles.categoriesContent}
      />

      {/* Live Rooms Grid */}
      <FlatList
        data={liveRooms}
        renderItem={renderLiveRoomItem}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.roomsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="radio" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No live rooms available</Text>
            <Text style={styles.emptySubtext}>
              Be the first to start a room!
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  createButton: {
    padding: 4,
  },
  categoriesList: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: "#ff4444",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#fff",
  },
  roomsList: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  roomCard: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
  },
  hostImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#2a2a2a",
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  roomInfo: {
    padding: 12,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  hostName: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#999",
  },
  categoryBadge: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  categoryBadgeText: {
    fontSize: 10,
    color: "#999",
    textTransform: "capitalize",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#444",
    marginTop: 8,
  },
});

export default LiveRoomsListScreen;
