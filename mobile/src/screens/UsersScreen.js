import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const UsersScreen = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { userToken, BASE_URL, userInfo } = useContext(AuthContext);
  const selectMode = route?.params?.selectMode;
  const returnTo = route?.params?.returnTo;
  const [selected, setSelected] = useState([]);
  const [activeStreams, setActiveStreams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const trendingHashtags = [
    { id: "1", tag: "#fyp", views: "12.5B" },
    { id: "2", tag: "#viral", views: "8.2B" },
    { id: "3", tag: "#trending", views: "6.7B" },
    { id: "4", tag: "#funny", views: "5.1B" },
    { id: "5", tag: "#dance", views: "4.8B" },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/users`);
        // Filter out current user
        const otherUsers = res.data.filter((user) => user._id !== userInfo._id);
        setUsers(otherUsers);
        setFilteredUsers(otherUsers);
      } catch (e) {
        console.log("Error fetching users:", e.message);
      }
    };

    const fetchActiveStreams = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/live/active`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setActiveStreams(res.data);
      } catch (e) {
        console.log("Error fetching streams:", e.message);
      }
    };

    fetchUsers();
    fetchActiveStreams();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const resUsers = await axios.get(`${BASE_URL}/users`);
      const otherUsers = resUsers.data.filter(
        (user) => user._id !== userInfo._id
      );
      setUsers(otherUsers);
      setFilteredUsers(otherUsers);

      const resStreams = await axios.get(`${BASE_URL}/live/active`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setActiveStreams(resStreams.data);
    } catch (e) {
      console.log("Error refreshing:", e.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const renderStream = ({ item }) => (
    <TouchableOpacity
      style={styles.streamItem}
      onPress={() =>
        navigation.navigate("Live", {
          isBroadcaster: false,
          channelId: item.channelName,
        })
      }
    >
      <View style={styles.streamPreview}>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Ionicons name="videocam" size={40} color="#FFF" />
      </View>
      <Text style={styles.streamTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.streamUser}>@{item.user.username}</Text>
    </TouchableOpacity>
  );

  const renderHashtag = ({ item }) => (
    <TouchableOpacity style={styles.hashtagItem}>
      <View style={styles.hashtagIcon}>
        <Ionicons name="musical-notes" size={24} color="#FFF" />
      </View>
      <View style={styles.hashtagInfo}>
        <Text style={styles.hashtagText}>{item.tag}</Text>
        <Text style={styles.hashtagViews}>{item.views} views</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#888" />
    </TouchableOpacity>
  );

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        if (selectMode) {
          // toggle selection
          const exists = selected.find((s) => s._id === item._id);
          if (exists)
            setSelected((prev) => prev.filter((s) => s._id !== item._id));
          else setSelected((prev) => [...prev, item]);
        } else {
          navigation.navigate("UserProfile", { userId: item._id });
        }
      }}
    >
      <View style={styles.userAvatar}>
        <Ionicons name="person-circle" size={48} color="#888" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{item.username}</Text>
        <Text style={styles.userStats}>
          {item.followers?.length || 0} متابعون · {item.following?.length || 0}{" "}
          متابَعة
        </Text>
      </View>
      {selectMode ? (
        <View style={{ padding: 8 }}>
          {selected.find((s) => s._id === item._id) ? (
            <View style={styles.selectBadge}>
              <Text style={{ color: "#000" }}>✓</Text>
            </View>
          ) : (
            <View style={styles.selectBadgeEmpty} />
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.messageIconButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("Chat", {
              userId: item._id,
              username: item.username,
            });
          }}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        {selectMode && (
          <TouchableOpacity
            onPress={() => {
              // navigate back to returnTo with selected users' ids
              const ids = selected.map((s) => s._id);
              if (returnTo === "Upload") {
                navigation.navigate("HomeTabs", {
                  screen: "Upload",
                  params: { selectedTags: ids, selectedUsers: selected },
                });
              } else {
                navigation.navigate(returnTo || "HomeTabs", {
                  screen: "Upload",
                  params: { selectedTags: ids, selectedUsers: selected },
                });
              }
            }}
          >
            <Text style={{ color: "#FE2C55", fontWeight: "bold" }}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#888"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Users Section (shown when searching) */}
      {searchQuery.trim() !== "" ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المستخدمون</Text>
          <FlatList
            data={filteredUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>لا توجد نتائج</Text>
            }
          />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFF"
            />
          }
        >
          {/* Active Streams Section */}
          {activeStreams.length > 0 && !selectMode && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>بث مباشر الآن</Text>
              <FlatList
                data={activeStreams}
                renderItem={renderStream}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.streamsList}
              />
            </View>
          )}

          {/* Suggested Users */}
          {users.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>مستخدمون مقترحون</Text>
              <FlatList
                data={users.slice(0, 5)}
                renderItem={renderUser}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Trending Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending Hashtags</Text>
            <FlatList
              data={trendingHashtags}
              renderItem={renderHashtag}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1F1F",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    paddingVertical: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  streamsList: {
    paddingRight: 16,
  },
  streamItem: {
    marginRight: 12,
    width: 120,
  },
  streamPreview: {
    width: 120,
    height: 160,
    backgroundColor: "#333",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  liveBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FE2C55",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  streamTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  streamUser: {
    color: "#888",
    fontSize: 12,
  },
  hashtagItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  hashtagIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  hashtagViews: {
    color: "#888",
    fontSize: 13,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  userAvatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userStats: {
    color: "#888",
    fontSize: 13,
  },
  messageIconButton: {
    padding: 8,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});

export default UsersScreen;
