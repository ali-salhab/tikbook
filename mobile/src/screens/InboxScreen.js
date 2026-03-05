import React, { useState, useContext, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const HEADER_MAX = 110;

const InboxScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Sliver-style animated values ───────────────────────────────────────────
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_MAX],
    outputRange: [0, -HEADER_MAX],
    extrapolate: "clamp",
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_MAX * 0.6],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const stickyBarOpacity = scrollY.interpolate({
    inputRange: [HEADER_MAX * 0.5, HEADER_MAX],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [convRes, statusRes] = await Promise.all([
        axios.get(`${BASE_URL}/messages/conversations`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        axios
          .get(`${BASE_URL}/status`, {
            headers: { Authorization: `Bearer ${userToken}` },
          })
          .catch(() => ({ data: [] })),
      ]);
      setConversations(convRes.data || []);
      setStatuses(statusRes.data || []);
    } catch (e) {
      console.error("InboxScreen fetchAll:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll();
    }, [fetchAll]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openStatus = (item) => {
    const idx = statuses.findIndex((s) => s._id === item._id);
    navigation.navigate("StatusViewer", {
      statuses,
      initialIndex: idx >= 0 ? idx : 0,

  // ── Render helpers ─────────────────────────────────────────────────────────
  const getInitials = (name) =>
    name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) {
      return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString("ar-EG", { weekday: "short" });
    }
    return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.user?.username || c.user?.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ── Story row at top of list ───────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* Stories */}
      {statuses.length > 0 && (
        <View style={styles.storiesSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ _id: "__create__", type: "create" }, ...statuses]}
            keyExtractor={(s) => s._id}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 12 }}
            renderItem={({ item }) => {
              if (item.type === "create") {
                return (
                  <TouchableOpacity
                    style={styles.storyItem}
                    onPress={() => navigation.navigate("CreateStatus")}
                  >
                    <View style={styles.createStoryContainer}>
                      {userInfo?.profileImage ? (
                        <Image source={{ uri: userInfo.profileImage }} style={styles.storyAvatar} />
                      ) : (
                        <View style={[styles.storyAvatar, styles.initialsCircle, { backgroundColor: "#FE2C55" }]}>
                          <Text style={styles.initialsText}>{getInitials(userInfo?.username || "Me")}</Text>
                        </View>
                      )}
                      <View style={styles.createBadge}>
                        <Ionicons name="add" size={12} color="#FFF" />
                      </View>
                    </View>
                    <Text style={styles.storyUsername} numberOfLines={1}>إنشاء</Text>
                  </TouchableOpacity>
                );
              }
              const isOwn = item.user?._id === userInfo?._id;
              return (
                <TouchableOpacity style={styles.storyItem} onPress={() => openStatus(item)}>
                  <View style={[styles.storyRing, isOwn && styles.storyRingOwn]}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.storyAvatar} />
                    ) : item.user?.profileImage ? (
                      <Image source={{ uri: item.user.profileImage }} style={styles.storyAvatar} />
                    ) : (
                      <View style={[styles.storyAvatar, styles.initialsCircle, { backgroundColor: item.bgColor || "#7c3aed" }]}>
                        <Text style={styles.initialsText}>{getInitials(item.user?.username)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.storyUsername} numberOfLines={1}>
                    {isOwn ? "قصتي" : item.user?.username || ""}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#999" style={{ marginHorizontal: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="بحث..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#999" style={{ marginHorizontal: 8 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section label */}
      <View style={styles.sectionLabel}>
        <Text style={styles.sectionLabelText}>المحادثات</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Users")}>
          <Ionicons name="create-outline" size={22} color="#FE2C55" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color="#333" />
      <Text style={styles.emptyTitle}>لا توجد محادثات بعد</Text>
      <Text style={styles.emptySubtitle}>ابحث عن أشخاص وابدأ محادثة جديدة</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate("Users")}>
        <Text style={styles.emptyBtnText}>ابدأ محادثة جديدة</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConversation = ({ item }) => {
    const other = item.user || {};
    const name = other.username || other.name || "مستخدم";
    const avatar = other.profileImage;
    const isOnline = other.isOnline;
    const unread = item.unreadCount || 0;
    const lastMsg = item.lastMessage?.text || "";
    const lastTime = formatTime(item.lastMessage?.createdAt || item.updatedAt);

    return (
      <TouchableOpacity
        style={styles.convoItem}
        activeOpacity={0.75}
        onPress={() =>
          navigation.navigate("Chat", {
            userId: other._id,
            username: name,
            profileImage: avatar || null,
          })
        }
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.initialsCircle, { backgroundColor: "#1a1a2e" }]}>
              <Text style={styles.initialsTextLg}>{getInitials(name)}</Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Text */}
        <View style={styles.convoText}>
          <View style={styles.convoRow}>
            <Text style={[styles.convoName, unread > 0 && styles.convoNameBold]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.convoTime}>{lastTime}</Text>
          </View>
          <View style={styles.convoRow}>
            <Text style={[styles.convoLast, unread > 0 && styles.convoLastBold]} numberOfLines={1}>
              {lastMsg || "اضغط للمحادثة"}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unread > 99 ? "99+" : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  const topPad = insets.top;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Sticky compact bar (appears as header collapses) ── */}
      <Animated.View
        style={[
          styles.stickyBar,
          { paddingTop: topPad, height: 54 + topPad, opacity: stickyBarOpacity },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.stickyTitle}>الرسائل</Text>
      </Animated.View>

      {/* ── Expanding big header ── */}
      <Animated.View
        style={[
          styles.bigHeader,
          {
            paddingTop: topPad + 10,
            height: HEADER_MAX + topPad,
            transform: [{ translateY: headerTranslate }],
            opacity: headerOpacity,
          },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.bigTitle}>الرسائل</Text>
        <Text style={styles.bigSubtitle}>
          {conversations.length > 0 ? `${conversations.length} محادثة` : ""}
        </Text>
      </Animated.View>

      {/* ── Content list ── */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      ) : (
        <Animated.FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id || item.user?._id || Math.random().toString()}
          renderItem={renderConversation}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<ListEmpty />}
          contentContainerStyle={{
            paddingTop: HEADER_MAX + topPad,
            paddingBottom: insets.bottom + 80,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FE2C55"
              progressViewOffset={HEADER_MAX + topPad}
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // Sticky bar
  stickyBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: "#000",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  stickyTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },

  // Expanding header
  bigHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#000",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  bigTitle: { color: "#FFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  bigSubtitle: { color: "#888", fontSize: 14, marginTop: 2 },

  // Loading
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Stories
  storiesSection: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1a1a1a" },
  storyItem: { alignItems: "center", width: 68 },
  storyAvatar: { width: 56, height: 56, borderRadius: 28 },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
  },
  storyRingOwn: { borderColor: "#25D366" },
  createStoryContainer: { position: "relative" },
  createBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#000",
  },
  storyUsername: { color: "#CCC", fontSize: 11, marginTop: 4, textAlign: "center", maxWidth: 64 },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    marginHorizontal: 14,
    marginVertical: 10,
  },
  searchInput: { flex: 1, color: "#FFF", fontSize: 15, paddingVertical: 10, textAlign: "right" },

  // Section label
  sectionLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  sectionLabelText: { color: "#888", fontSize: 13, fontWeight: "600" },

  // Conversation item
  convoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#111",
  },
  avatarWrapper: { position: "relative", marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  initialsCircle: { justifyContent: "center", alignItems: "center" },
  initialsText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  initialsTextLg: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#25D366",
    borderWidth: 2,
    borderColor: "#000",
  },
  convoText: { flex: 1 },
  convoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convoName: { color: "#FFF", fontSize: 15, flexShrink: 1 },
  convoNameBold: { fontWeight: "700" },
  convoTime: { color: "#666", fontSize: 12, marginLeft: 6 },
  convoLast: { color: "#888", fontSize: 13, flexShrink: 1 },
  convoLastBold: { color: "#DDD", fontWeight: "600" },
  unreadBadge: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  unreadBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

  // Empty state
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: { color: "#FFF", fontSize: 20, fontWeight: "700", marginTop: 16 },
  emptySubtitle: { color: "#888", fontSize: 14, marginTop: 8, textAlign: "center" },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: "#FE2C55",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});

export default InboxScreen;