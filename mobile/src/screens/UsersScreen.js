import React, { useEffect, useState, useContext, useRef } from "react";
import GradientBackground from "../components/GradientBackground";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { ms, fs } from "../utils/responsive";

const UsersScreen = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { userToken, BASE_URL, userInfo } = useContext(AuthContext);
  const selectMode = route?.params?.selectMode;
  const returnTo = route?.params?.returnTo;
  const [selected, setSelected] = useState([]);
  const [activeStreams, setActiveStreams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const searchDebounceRef = useRef(null);

  const buildCloudinaryThumb = (url) => {
    if (!url || typeof url !== "string") return null;
    if (!url.includes("cloudinary.com")) return url;
    return url
      .replace("/upload/", "/upload/c_fill,g_center,w_200,h_260,so_1/")
      .replace(/\.(mp4|mov|m4v|avi|mkv|webm)$/i, ".jpg");
  };

  const videoSearchThumb = (video) => {
    if (video.thumbnailUrl || video.thumbnail || video.coverUrl) {
      return video.thumbnailUrl || video.thumbnail || video.coverUrl;
    }
    const u = video.videoUrl;
    if (typeof u === "string" && u.match(/\.(jpe?g|png|gif|webp)$/i)) {
      return u;
    }
    return buildCloudinaryThumb(u);
  };

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
        const otherUsers = res.data.filter((user) => user._id !== userInfo?._id);
        setUsers(otherUsers);
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
  }, [BASE_URL, userInfo?._id, userToken]);

  useEffect(() => {
    const p = route.params?.search;
    if (p != null && String(p).trim() !== "") {
      setSearchQuery(String(p).trim());
    }
  }, [route.params?.search]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    if (!q) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const headers = userToken
          ? { Authorization: `Bearer ${userToken}` }
          : {};
        const res = await axios.get(`${BASE_URL}/search`, {
          headers,
          params: { q, limit: 24 },
        });
        setSearchResults(res.data);
      } catch (e) {
        console.log("Search error:", e.message);
        const lower = q.toLowerCase();
        const fallbackUsers = users.filter(
          (user) =>
            user.username?.toLowerCase().includes(lower) ||
            user.email?.toLowerCase().includes(lower),
        );
        setSearchResults({
          users: fallbackUsers,
          videos: [],
          liveRooms: [],
        });
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [searchQuery, BASE_URL, userToken, users]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const resUsers = await axios.get(`${BASE_URL}/users`);
      const otherUsers = resUsers.data.filter(
        (user) => user._id !== userInfo?._id,
      );
      setUsers(otherUsers);

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

  const renderSearchVideoRow = (item) => {
    const thumb = videoSearchThumb(item);
    const uname =
      typeof item.user === "object" && item.user?.username
        ? item.user.username
        : "?";
    return (
      <TouchableOpacity
        key={String(item._id)}
        style={styles.searchVideoRow}
        onPress={() =>
          navigation.navigate("MainTabs", {
            screen: "Home",
            params: { videoId: item._id },
          })
        }
      >
        <View style={styles.searchVideoThumbWrap}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.searchVideoThumb} />
          ) : (
            <View style={[styles.searchVideoThumb, styles.searchVideoThumbPh]}>
              <Ionicons name="videocam" size={28} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.searchVideoMeta}>
          <Text style={styles.searchVideoTitle} numberOfLines={2}>
            {item.description?.trim() || "فيديو"}
          </Text>
          <Text style={styles.searchVideoUser}>@{uname}</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  const renderLiveRoomSearchRow = (item) => {
    const host =
      typeof item.host === "object" && item.host?.username
        ? item.host.username
        : "مستخدم";
    return (
      <TouchableOpacity
        key={String(item._id)}
        style={styles.searchLiveRow}
        onPress={() =>
          navigation.navigate("LiveRoom", { roomId: item.roomId })
        }
      >
        <View style={styles.liveRoomBadge}>
          <Text style={styles.liveRoomBadgeText}>LIVE</Text>
        </View>
        <View style={styles.searchLiveMeta}>
          <Text style={styles.searchLiveTitle} numberOfLines={2}>
            {item.title || "غرفة مباشرة"}
          </Text>
          <Text style={styles.searchLiveHost}>المضيف @{host}</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  const renderHashtag = ({ item }) => (
    <TouchableOpacity style={styles.hashtagItem}>
      <View style={styles.hashtagIcon}>
        <Ionicons name="musical-notes" size={24} color="#FFF" />
      </View>
      <View style={styles.hashtagInfo}>
        <Text style={styles.hashtagText}>{item.tag}</Text>
        <Text style={styles.hashtagViews}>{item.views} مشاهدة</Text>
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
        {item.profileImage ? (
          <Image
            source={{ uri: item.profileImage }}
            style={styles.userAvatarImg}
          />
        ) : (
          <Ionicons name="person-circle" size={48} color="#888" />
        )}
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
      <GradientBackground />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>اكتشف</Text>
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
            <Text style={{ color: "#FF3366", fontWeight: "bold" }}>تم</Text>
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
          placeholder="بحث"
          placeholderTextColor="#888"
          textAlign="right"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Users Section (shown when searching) */}
      {searchQuery.trim() !== "" ? (
        searchLoading ? (
          <View style={styles.searchLoadingWrap}>
            <ActivityIndicator size="large" color="#FF3366" />
            <Text style={styles.searchLoadingText}>جاري البحث…</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.searchScrollContent}
          >
            {(() => {
              const vidList = searchResults?.videos || [];
              const userList = searchResults?.users || [];
              const roomList = searchResults?.liveRooms || [];
              const empty =
                !vidList.length && !userList.length && !roomList.length;
              return (
                <>
                  {vidList.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>فيديوهات</Text>
                      {vidList.map((v) => renderSearchVideoRow(v))}
                    </View>
                  )}
                  {userList.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>الأشخاص</Text>
                      {userList.map((u) => (
                        <View key={String(u._id)}>{renderUser({ item: u })}</View>
                      ))}
                    </View>
                  )}
                  {roomList.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>غرف وبث مباشر</Text>
                      {roomList.map((r) => renderLiveRoomSearchRow(r))}
                    </View>
                  )}
                  {empty && !searchLoading && (
                    <Text style={styles.emptyText}>
                      لا توجد نتائج لهذا البحث
                    </Text>
                  )}
                </>
              );
            })()}
          </ScrollView>
        )
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
            <Text style={styles.sectionTitle}>الوسوم الرائجة</Text>
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
    backgroundColor: "transparent",
  },
  header: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(16),
  },
  headerTitle: {
    color: "#FFF",
    fontSize: fs(24),
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1630",
    marginHorizontal: ms(16),
    marginBottom: ms(20),
    borderRadius: ms(8),
    paddingHorizontal: ms(12),
  },
  searchIcon: {
    marginRight: ms(8),
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    paddingVertical: ms(12),
    fontSize: fs(16),
  },
  section: {
    marginBottom: ms(24),
    paddingHorizontal: ms(16),
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: fs(18),
    fontWeight: "bold",
    marginBottom: ms(16),
  },
  streamsList: {
    paddingRight: ms(16),
  },
  streamItem: {
    marginRight: ms(12),
    width: ms(120),
  },
  streamPreview: {
    width: ms(120),
    height: ms(160),
    backgroundColor: "#151228",
    borderRadius: ms(8),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ms(8),
    position: "relative",
  },
  liveBadge: {
    position: "absolute",
    top: ms(8),
    left: ms(8),
    backgroundColor: "#FF3366",
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
  },
  liveText: {
    color: "#FFF",
    fontSize: fs(10),
    fontWeight: "bold",
  },
  streamTitle: {
    color: "#FFF",
    fontSize: fs(14),
    fontWeight: "600",
    marginBottom: ms(2),
  },
  streamUser: {
    color: "#888",
    fontSize: fs(12),
  },
  hashtagItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  hashtagIcon: {
    width: ms(48),
    height: ms(48),
    backgroundColor: "#FF3366",
    borderRadius: ms(8),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ms(12),
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagText: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "600",
    marginBottom: ms(2),
  },
  hashtagViews: {
    color: "#888",
    fontSize: fs(13),
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  userAvatar: {
    marginRight: ms(12),
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "600",
    marginBottom: ms(2),
  },
  userStats: {
    color: "#888",
    fontSize: fs(13),
  },
  messageIconButton: {
    padding: ms(8),
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: ms(40),
    fontSize: fs(16),
  },
  searchLoadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(48),
  },
  searchLoadingText: {
    color: "#AAA",
    fontSize: fs(15),
    marginTop: ms(12),
  },
  searchScrollContent: {
    paddingBottom: ms(120),
  },
  searchVideoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  searchVideoThumbWrap: {
    marginRight: ms(12),
  },
  searchVideoThumb: {
    width: ms(72),
    height: ms(96),
    borderRadius: ms(8),
    backgroundColor: "#151228",
  },
  searchVideoThumbPh: {
    justifyContent: "center",
    alignItems: "center",
  },
  searchVideoMeta: {
    flex: 1,
  },
  searchVideoTitle: {
    color: "#FFF",
    fontSize: fs(15),
    fontWeight: "600",
    textAlign: "right",
    marginBottom: ms(4),
  },
  searchVideoUser: {
    color: "#888",
    fontSize: fs(13),
    textAlign: "right",
  },
  searchLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  searchLiveMeta: {
    flex: 1,
  },
  searchLiveTitle: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "600",
    textAlign: "right",
  },
  searchLiveHost: {
    color: "#888",
    fontSize: fs(13),
    marginTop: ms(4),
    textAlign: "right",
  },
  liveRoomBadge: {
    backgroundColor: "#FF3366",
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(4),
    marginRight: ms(10),
  },
  liveRoomBadgeText: {
    color: "#FFF",
    fontSize: fs(10),
    fontWeight: "bold",
  },
  userAvatarImg: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: "#222",
  },
  selectBadge: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: "#39F",
    justifyContent: "center",
    alignItems: "center",
  },
  selectBadgeEmpty: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    borderWidth: 2,
    borderColor: "#555",
  },
});

export default UsersScreen;
