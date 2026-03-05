import React, {
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
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
const TABS = ["messages", "notifications", "stories"];

const InboxScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  // ── Data ───────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("messages");
  // Unread badge counters per tab (set when data loads, cleared when tab opened)
  const [msgBadge, setMsgBadge] = useState(0);
  const [notifBadge, setNotifBadge] = useState(0);
  const [storiesBadge, setStoriesBadge] = useState(0);
  // Track which tabs have been viewed since last fetch
  const viewedTabs = useRef({
    messages: false,
    notifications: false,
    stories: false,
  });

  const tabUnderline = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef({
    messages: new Animated.Value(1),
    notifications: new Animated.Value(0),
    stories: new Animated.Value(0),
  }).current;

  // ── Tab switch ─────────────────────────────────────────────────────────────
  const switchTab = (tab) => {
    // Animate each tab pill in/out
    TABS.forEach((t) => {
      Animated.timing(tabAnim[t], {
        toValue: t === tab ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
    // Slide underline — use raw DOM index (tab bar is LTR in layout)
    const idx = TABS.indexOf(tab);
    Animated.spring(tabUnderline, {
      toValue: idx * (width / 3),
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
    setActiveTab(tab);
    viewedTabs.current[tab] = true;
    // Clear badge when tab is opened
    if (tab === "messages") setMsgBadge(0);
    if (tab === "notifications") setNotifBadge(0);
    if (tab === "stories") setStoriesBadge(0);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [convRes, statusRes, notifRes, connRes] = await Promise.all([
        axios.get(`${BASE_URL}/messages/conversations`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        axios
          .get(`${BASE_URL}/status`, {
            headers: { Authorization: `Bearer ${userToken}` },
          })
          .catch(() => ({ data: [] })),
        axios
          .get(`${BASE_URL}/notifications`, {
            headers: { Authorization: `Bearer ${userToken}` },
          })
          .catch(() => ({ data: [] })),
        axios
          .get(`${BASE_URL}/users/my-connections`, {
            headers: { Authorization: `Bearer ${userToken}` },
          })
          .catch(() => ({ data: [] })),
      ]);

      const convData = convRes.data || [];
      const statusData = statusRes.data || [];
      const notifData = notifRes.data || [];
      const connData = connRes.data || [];

      setConversations(convData);
      setStatuses(statusData);
      setNotifications(notifData);
      setConnections(connData);

      // Compute badge counts (only if the tab hasn't been viewed yet since fetch)
      const totalUnreadMsgs = convData.reduce(
        (s, c) => s + (c.unreadCount || 0),
        0,
      );
      const unreadNotifs = notifData.filter((n) => !n.read).length;
      const unseenStories = statusData.length;

      if (!viewedTabs.current.messages) setMsgBadge(totalUnreadMsgs);
      if (!viewedTabs.current.notifications) setNotifBadge(unreadNotifs);
      if (!viewedTabs.current.stories) setStoriesBadge(unseenStories);

      // Reset viewed flags so next fetch recalculates
      viewedTabs.current = {
        messages: false,
        notifications: false,
        stories: false,
      };
      // Re-clear current tab (already viewed)
      viewedTabs.current[activeTab] = true;
      if (activeTab === "messages") setMsgBadge(0);
      if (activeTab === "notifications") setNotifBadge(0);
      if (activeTab === "stories") setStoriesBadge(0);
    } catch (e) {
      console.error("InboxScreen fetchAll:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken, activeTab]);

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
    });
  };

  const getSummaryText = (notification) => {
    const username = notification.fromUser?.username || "TikBook";
    switch (notification.type) {
      case "like":
        return `${username} أعجب بالفيديو الخاص بك`;
      case "comment":
        return `${username} علّق على الفيديو الخاص بك`;
      case "follow":
        return `${username} بدأ في متابعتك`;
      default:
        return `${username} تفاعل معك`;
    }
  };

  const getInitials = (name) =>
    name
      ? name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000)
      return d.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (diff < 604800000)
      return d.toLocaleDateString("ar-EG", { weekday: "short" });
    return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.user?.username || c.user?.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ── Derived notification groups ────────────────────────────────────────────
  const followerNotifications = notifications.filter(
    (n) => n.type === "follow" && !n.read,
  );
  const activityNotifications = notifications.filter(
    (n) => n.fromUser && n.type !== "follow" && !n.read,
  );
  const systemNotifications = notifications.filter(
    (n) => !n.fromUser && !n.read,
  );
  const latestFollower = notifications.find((n) => n.type === "follow");
  const latestActivity = notifications.find(
    (n) => n.fromUser && n.type !== "follow",
  );
  const latestSystem = notifications.find((n) => !n.fromUser);

  // ── Tab content renderers ──────────────────────────────────────────────────
  const renderConversation = ({ item }) => {
    const other = item.user || item.otherUser || {};
    if (!other._id) return null;
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
        <View style={styles.avatarWrapper}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.initialsCircle]}>
              <Text style={styles.initialsTextLg}>{getInitials(name)}</Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.convoText}>
          <View style={styles.convoRow}>
            <Text
              style={[styles.convoName, unread > 0 && styles.convoNameBold]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={styles.convoTime}>{lastTime}</Text>
          </View>
          <View style={styles.convoRow}>
            <Text
              style={[styles.convoLast, unread > 0 && styles.convoLastBold]}
              numberOfLines={1}
            >
              {lastMsg || "اضغط للمحادثة"}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Build circles: connections (followers/following) + any from conversations not already included
  const allCircleUsers = useMemo(() => {
    const seen = new Set();
    const result = [];
    // First: connections (followers/following)
    for (const u of connections) {
      if (u && u._id && !seen.has(u._id)) {
        seen.add(u._id);
        result.push(u);
      }
    }
    // Then: conversation users not already included
    for (const c of conversations) {
      const u = c.user || c.otherUser;
      if (u && u._id && !seen.has(u._id.toString())) {
        seen.add(u._id.toString());
        result.push(u);
      }
    }
    // Online first
    return result.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
  }, [connections, conversations]);

  const MessagesTab = () => (
    <FlatList
      data={filteredConversations}
      keyExtractor={(item) =>
        item._id || item.user?._id || Math.random().toString()
      }
      renderItem={renderConversation}
      ListHeaderComponent={
        <View>
          {/* ── Contacts / followers row ── */}
          {allCircleUsers.length > 0 && (
            <View style={styles.activeUsersSection}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={allCircleUsers}
                keyExtractor={(u) => u._id.toString()}
                contentContainerStyle={styles.activeUsersContent}
                renderItem={({ item: u }) => (
                  <TouchableOpacity
                    style={styles.activeUserItem}
                    onPress={() =>
                      navigation.navigate("Chat", {
                        userId: u._id,
                        username: u.username || u.name || "مستخدم",
                        profileImage: u.profileImage || null,
                      })
                    }
                  >
                    <View style={styles.activeUserAvatarWrap}>
                      {u.profileImage ? (
                        <Image
                          source={{ uri: u.profileImage }}
                          style={styles.activeUserAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.activeUserAvatar,
                            styles.activeUserInitials,
                          ]}
                        >
                          <Text style={styles.activeUserInitialsText}>
                            {getInitials(u.username || u.name || "")}
                          </Text>
                        </View>
                      )}
                      {u.isOnline && (
                        <View style={styles.activeUserOnlineDot} />
                      )}
                    </View>
                    <Text style={styles.activeUserName} numberOfLines={1}>
                      {u.username || u.name || "مستخدم"}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* ── Search bar ── */}
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={18}
              color="#999"
              style={{ marginHorizontal: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="بحث في المحادثات..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="#999"
                  style={{ marginHorizontal: 8 }}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>لا توجد محادثات بعد</Text>
          <Text style={styles.emptySubtitle}>
            ابحث عن أشخاص وابدأ محادثة جديدة
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate("Users")}
          >
            <Text style={styles.emptyBtnText}>ابدأ محادثة جديدة</Text>
          </TouchableOpacity>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FE2C55"
        />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    />
  );

  const NotificationsTab = () => (
    <FlatList
      data={["followers", "activity", "system"]}
      keyExtractor={(i) => i}
      renderItem={({ item }) => {
        if (item === "followers")
          return (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("NewFollowers")}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#007AFF" }]}>
                <Ionicons name="people" size={24} color="#FFF" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>متابعون جدد</Text>
                <Text style={styles.menuSubtitle} numberOfLines={1}>
                  {latestFollower
                    ? getSummaryText(latestFollower)
                    : "لا يوجد متابعون جدد"}
                </Text>
              </View>
              {followerNotifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {followerNotifications.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        if (item === "activity")
          return (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("Activity")}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#FE2C55" }]}>
                <Ionicons name="heart" size={24} color="#FFF" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>النشاط</Text>
                <Text style={styles.menuSubtitle} numberOfLines={1}>
                  {latestActivity
                    ? getSummaryText(latestActivity)
                    : "لا يوجد نشاط"}
                </Text>
              </View>
              {activityNotifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {activityNotifications.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        return (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("SystemNotifications")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#111" }]}>
              <Ionicons name="file-tray-full" size={24} color="#FFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>إشعارات النظام</Text>
              <Text style={styles.menuSubtitle} numberOfLines={1}>
                {latestSystem
                  ? getSummaryText(latestSystem)
                  : "لا توجد إشعارات نظام"}
              </Text>
            </View>
            {systemNotifications.length > 0 && <View style={styles.dotBadge} />}
          </TouchableOpacity>
        );
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FE2C55"
        />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    />
  );

  const StoriesTab = () => (
    <FlatList
      data={[{ _id: "__create__", type: "create" }, ...statuses]}
      keyExtractor={(s) => s._id}
      numColumns={3}
      columnWrapperStyle={{ gap: 2 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FE2C55"
        />
      }
      contentContainerStyle={{ paddingBottom: insets.bottom + 80, gap: 2 }}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>لا توجد حالات بعد</Text>
          <Text style={styles.emptySubtitle}>أنشئ أول حالة لك الآن</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate("CreateStatus")}
          >
            <Text style={styles.emptyBtnText}>إنشاء حالة</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => {
        if (item.type === "create") {
          return (
            <TouchableOpacity
              style={styles.storyGridItem}
              onPress={() => navigation.navigate("CreateStatus")}
            >
              <View
                style={[
                  styles.storyGridImg,
                  {
                    backgroundColor: "#111",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                {userInfo?.profileImage ? (
                  <Image
                    source={{ uri: userInfo.profileImage }}
                    style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
                  />
                ) : null}
                <View style={styles.createPlusCircle}>
                  <Ionicons name="add" size={22} color="#FFF" />
                </View>
                <Text style={styles.storyGridCreate}>إنشاء{"\n"}حالة</Text>
              </View>
            </TouchableOpacity>
          );
        }
        const isOwn = item.user?._id === userInfo?._id;
        const preview = item.image || item.user?.profileImage;
        return (
          <TouchableOpacity
            style={styles.storyGridItem}
            onPress={() => openStatus(item)}
          >
            <View
              style={[
                styles.storyGridImg,
                isOwn && { borderColor: "#25D366", borderWidth: 2 },
              ]}
            >
              {preview ? (
                <Image
                  source={{ uri: preview }}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: item.bgColor || "#FE2C55",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 4,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontSize: 11,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                    numberOfLines={3}
                  >
                    {item.text?.slice(0, 30) || ""}
                  </Text>
                </View>
              )}
              <View style={styles.storyGridGradient} />
              <Text style={styles.storyGridUser} numberOfLines={1}>
                {item.user?.username || ""}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const TAB_W = width / 3;

  const TabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: "messages", label: "الرسائل", badge: msgBadge },
        { key: "notifications", label: "الإشعارات", badge: notifBadge },
        { key: "stories", label: "الحالات", badge: storiesBadge },
      ].map((t) => {
        const pillBg = tabAnim[t.key].interpolate({
          inputRange: [0, 1],
          outputRange: ["rgba(0,0,0,0)", "rgba(254,44,85,0.18)"],
        });
        const textColor = tabAnim[t.key].interpolate({
          inputRange: [0, 1],
          outputRange: ["#666", "#FFF"],
        });
        const fontWeight = tabAnim[t.key].interpolate({
          inputRange: [0, 1],
          outputRange: ["400", "700"],
        });
        return (
          <TouchableOpacity
            key={t.key}
            style={styles.tabItem}
            onPress={() => switchTab(t.key)}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[styles.tabPill, { backgroundColor: pillBg }]}
            >
              <Animated.Text
                style={[styles.tabLabel, { color: textColor, fontWeight }]}
              >
                {t.label}
              </Animated.Text>
              {t.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {t.badge > 99 ? "99+" : t.badge}
                  </Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        );
      })}
      {/* Animated underline */}
      <Animated.View
        style={[
          styles.tabUnderline,
          { width: TAB_W - 32, transform: [{ translateX: tabUnderline }] },
        ]}
      />
    </View>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  const topPad = insets.top + 10;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={styles.headerTitle}>صندوق الوارد</Text>
      </View>

      {/* Tab bar */}
      <TabBar />

      {/* Content */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {activeTab === "messages" && <MessagesTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "stories" && <StoriesTab />}
        </View>
      )}
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // Header
  header: {
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
  },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "400" },
  headerRight: { padding: 4 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#000",
    borderBottomWidth: 0.5,
    borderBottomColor: "#1a1a1a",
    position: "relative",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 22,
    gap: 5,
  },
  tabLabel: {
    fontSize: 14,
  },
  tabBadge: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 16,
    height: 2,
    backgroundColor: "#FE2C55",
    borderRadius: 1,
  },

  // Loading
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Active users row
  activeUsersSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1a1a1a",
    paddingVertical: 12,
  },
  activeUsersContent: {
    paddingHorizontal: 14,
    gap: 14,
  },
  activeUserItem: {
    alignItems: "center",
    width: 62,
  },
  activeUserAvatarWrap: {
    position: "relative",
    marginBottom: 5,
  },
  activeUserAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  activeUserInitials: {
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  activeUserInitialsText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  activeUserOnlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#25D366",
    borderWidth: 2.5,
    borderColor: "#000",
  },
  activeUserName: {
    color: "#CCC",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    fontSize: 15,
    paddingVertical: 10,
    textAlign: "right",
  },

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
  initialsCircle: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
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
  convoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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

  // Notification menu items
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#111",
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: { flex: 1 },
  menuTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  menuSubtitle: { fontSize: 13, color: "#888" },
  notificationBadge: {
    backgroundColor: "#FE2C55",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  dotBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FE2C55",
  },

  // Stories grid
  storyGridItem: {
    flex: 1,
    aspectRatio: 0.75,
    maxWidth: width / 3,
  },
  storyGridImg: {
    flex: 1,
    backgroundColor: "#111",
    overflow: "hidden",
    position: "relative",
  },
  storyGridGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  storyGridUser: {
    position: "absolute",
    bottom: 6,
    left: 4,
    right: 4,
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  createPlusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  storyGridCreate: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  // Empty states
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: { color: "#FFF", fontSize: 20, fontWeight: "700", marginTop: 16 },
  emptySubtitle: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
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
