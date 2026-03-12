// REWRITTEN — single-screen inbox, theme-aware
import React, { useState, useContext, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { ms, fs } from "../utils/responsive";

const { width } = Dimensions.get("window");

const InboxScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const { t, theme } = useApp();
  const insets = useSafeAreaInsets();

  // ── Data ───────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoDismissed, setPromoDismissed] = useState(false);

  // ── Dynamic styles ─────────────────────────────────────────────────────────
  const styles = useMemo(() => getStyles(theme), [theme]);

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

      setConversations(convRes.data || []);
      setStatuses(statusRes.data || []);
      setNotifications(notifRes.data || []);
      setConnections(connRes.data || []);
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
        onPress={() => {
          // Clear this conversation's unread badge immediately
          if (unread > 0) {
            setConversations((prev) =>
              prev.map((c) =>
                (c._id || c.id) === (item._id || item.id)
                  ? { ...c, unreadCount: 0 }
                  : c,
              ),
            );
          }
          navigation.navigate("Chat", {
            userId: other._id,
            username: name,
            profileImage: avatar || null,
          });
        }}
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
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Circle users for contacts row ─────────────────────────────────────────
  const allCircleUsers = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const u of connections) {
      if (u && u._id && !seen.has(u._id)) {
        seen.add(u._id);
        result.push(u);
      }
    }
    for (const c of conversations) {
      const u = c.user || c.otherUser;
      if (u && u._id && !seen.has(u._id.toString())) {
        seen.add(u._id.toString());
        result.push(u);
      }
    }
    return result.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
  }, [connections, conversations]);

  // ── ListHeader: الحالات + الإشعارات + رأس قسم الرسائل ──────────────────────
  const ListHeader = () => (
    <View>
      {/* ── Section: الحالات ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>الحالات</Text>
        <TouchableOpacity onPress={() => navigation.navigate("CreateStatus")}>
          <Text style={styles.sectionAction}>إنشاء</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.storiesSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ _id: "__create__", type: "create" }, ...groupedStatuses]}
          keyExtractor={(s) => s._id?.toString()}
          contentContainerStyle={styles.storiesRowContent}
          renderItem={({ item, index }) => {
            if (item.type === "create") {
              return (
                <TouchableOpacity
                  style={styles.storyWrap}
                  onPress={() => navigation.navigate("CreateStatus")}
                  activeOpacity={0.8}
                >
                  <View style={styles.storyCircleCreate}>
                    {userInfo?.profileImage ? (
                      <Image
                        source={{ uri: userInfo.profileImage }}
                        style={[
                          StyleSheet.absoluteFill,
                          { borderRadius: 34, opacity: 0.45 },
                        ]}
                      />
                    ) : null}
                    <View style={styles.storyCreatePlus}>
                      <Ionicons name="add" size={18} color="#FFF" />
                    </View>
                  </View>
                  <Text style={styles.storyName} numberOfLines={1}>
                    إنشاء حالة
                  </Text>
                </TouchableOpacity>
              );
            }
            const isOwn = item.user?._id === userInfo?._id;
            const count = item.items?.length || 1;
            const preview = item.items?.[0]?.image || item.user?.profileImage;
            return (
              <TouchableOpacity
                style={styles.storyWrap}
                onPress={() => openGroupStatus(index - 1)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.storyCircleRing,
                    count <= 1 && (isOwn ? styles.storyRingOwn : styles.storyRingOther),
                  ]}
                >
                  {count > 1 && (
                    <LinearGradient
                      colors={isOwn ? ["#25D366", "#00BFFF"] : ["#FE2C55", "#FF9500"]}
                      style={[StyleSheet.absoluteFill, { borderRadius: ms(34) }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <View style={styles.storyCircleInner}>
                    {preview ? (
                      <Image
                        source={{ uri: preview }}
                        style={styles.storyCircleImg}
                      />
                    ) : (
                      <View
                        style={[
                          styles.storyCircleImg,
                          {
                            backgroundColor: item.items?.[0]?.bgColor || "#FE2C55",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: "#FFF",
                            fontSize: 10,
                            fontWeight: "700",
                            textAlign: "center",
                            padding: 3,
                          }}
                          numberOfLines={2}
                        >
                          {item.items?.[0]?.text?.slice(0, 18) || ""}
                        </Text>
                      </View>
                    )}
                  </View>
                  {count > 1 && (
                    <View style={styles.storyCountBadge}>
                      <Text style={styles.storyCountText}>{count}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.storyName} numberOfLines={1}>
                  {isOwn ? "أنت" : item.user?.username || ""}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Section: الإشعارات ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>الإشعارات</Text>
      </View>

      {/* متابعون جدد */}
      <TouchableOpacity
        style={styles.notifRow}
        onPress={() => navigation.navigate("NewFollowers")}
        activeOpacity={0.75}
      >
        <View style={styles.notifIndicator}>
          {followerNotifications.length > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {followerNotifications.length > 99
                  ? "99+"
                  : followerNotifications.length}
              </Text>
            </View>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>متابعون جدد</Text>
          <Text style={styles.notifSubtitle} numberOfLines={1}>
            {latestFollower
              ? getSummaryText(latestFollower)
              : "لا يوجد متابعون جدد"}
          </Text>
        </View>
        <View style={[styles.notifIconCircle, { backgroundColor: "#007AFF" }]}>
          <Ionicons name="people" size={24} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* النشاط */}
      <TouchableOpacity
        style={styles.notifRow}
        onPress={() => navigation.navigate("Activity")}
        activeOpacity={0.75}
      >
        <View style={styles.notifIndicator}>
          {activityNotifications.length > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {activityNotifications.length > 99
                  ? "99+"
                  : activityNotifications.length}
              </Text>
            </View>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>النشاط</Text>
          <Text style={styles.notifSubtitle} numberOfLines={1}>
            {latestActivity ? getSummaryText(latestActivity) : "لا يوجد نشاط"}
          </Text>
        </View>
        <View style={[styles.notifIconCircle, { backgroundColor: "#FE2C55" }]}>
          <Ionicons name="heart" size={24} color="#FFF" />
        </View>
      </TouchableOpacity>

      {/* إشعارات النظام */}
      <TouchableOpacity
        style={styles.notifRow}
        onPress={() => navigation.navigate("SystemNotifications")}
        activeOpacity={0.75}
      >
        <View style={styles.notifIndicator}>
          {systemNotifications.length > 0 ? (
            <View style={styles.dotBadge} />
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>إشعارات النظام</Text>
          <Text style={styles.notifSubtitle} numberOfLines={1}>
            {latestSystem ? getSummaryText(latestSystem) : "لا توجد إشعارات"}
          </Text>
        </View>
        <View style={[styles.notifIconCircle, { backgroundColor: theme.bg3 }]}>
          <Ionicons name="file-tray-full" size={24} color={theme.icon} />
        </View>
      </TouchableOpacity>

      {/* ── Section: الرسائل ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>الرسائل</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Users")}>
          <Text style={styles.sectionAction}>بحث</Text>
        </TouchableOpacity>
      </View>

      {/* Promo banner */}
      {!promoDismissed && (
        <View style={styles.promoBanner}>
          <TouchableOpacity
            style={styles.promoDismiss}
            onPress={() => setPromoDismissed(true)}
          >
            <Ionicons name="close" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={styles.promoIcon}>
            <Ionicons name="mail" size={28} color="#FE2C55" />
          </View>
        </View>
      )}
    </View>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  const topPad = insets.top + 10;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={theme.id === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.bg}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate("Users")}
        >
          <Ionicons name="search" size={24} color={theme.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.7}>
          <Text style={styles.headerTitle}>{t("inbox_title")}</Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={theme.icon}
            style={{ marginHorizontal: 4 }}
          />
          <View style={styles.headerOnlineDot} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.navigate("NewFollowers")}
        >
          <MaterialCommunityIcons
            name="account-multiple-plus-outline"
            size={26}
            color={theme.icon}
          />
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#FE2C55" />
        </View>
      )}

      {/* Single unified list */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) =>
          item._id || item.user?._id || Math.random().toString()
        }
        renderItem={renderConversation}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={64}
                color={theme.textMuted}
              />
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
          ) : null
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
    </View>
  );
};

// ── Styles (theme-aware) ──────────────────────────────────────────────────────
const getStyles = (theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },

    // Header
    header: {
      backgroundColor: theme.header,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: ms(14),
      paddingBottom: ms(10),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    headerBtn: { padding: ms(6) },
    headerCenter: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    headerTitle: { color: theme.text, fontSize: fs(17), fontWeight: "600" },
    headerOnlineDot: {
      width: ms(9),
      height: ms(9),
      borderRadius: ms(5),
      backgroundColor: "#25D366",
      marginLeft: ms(2),
    },

    // Section headers
    sectionHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: ms(16),
      paddingTop: ms(18),
      paddingBottom: ms(8),
    },
    sectionTitle: { color: theme.text, fontSize: fs(17), fontWeight: "700" },
    sectionAction: { color: "#FE2C55", fontSize: fs(14), fontWeight: "600" },

    // Promo banner
    promoBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      marginHorizontal: ms(12),
      marginTop: ms(10),
      marginBottom: ms(4),
      borderRadius: ms(12),
      padding: ms(12),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    promoDismiss: { padding: ms(4), marginRight: ms(6) },
    promoBody: { flex: 1 },
    promoText: {
      color: theme.textSecondary,
      fontSize: fs(13),
      textAlign: "right",
      lineHeight: ms(18),
      marginBottom: ms(8),
    },
    promoBtn: {
      alignSelf: "flex-end",
      backgroundColor: "#FE2C55",
      borderRadius: ms(20),
      paddingHorizontal: ms(14),
      paddingVertical: ms(6),
    },
    promoBtnText: { color: "#FFF", fontSize: fs(13), fontWeight: "600" },
    promoIcon: { marginLeft: ms(10) },

    // Stories sections
    storiesSection: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingVertical: ms(10),
    },
    contactsSection: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingVertical: ms(10),
    },
    storiesRowContent: { paddingHorizontal: ms(12), gap: ms(14) },
    storyWrap: { alignItems: "center", width: ms(72) },
    storyRing: {
      width: ms(68),
      height: ms(68),
      borderRadius: ms(34),
      padding: ms(3),
      marginBottom: ms(5),
    },
    storyInner: {
      flex: 1,
      borderRadius: ms(30),
      overflow: "hidden",
      backgroundColor: theme.bg3,
      position: "relative",
    },
    storyImg: { width: "100%", height: "100%" },
    storyOnlineDot: {
      position: "absolute",
      bottom: ms(1),
      right: ms(1),
      width: ms(13),
      height: ms(13),
      borderRadius: ms(7),
      backgroundColor: "#25D366",
      borderWidth: 2,
      borderColor: theme.bg,
    },
    storyName: {
      color: theme.textSecondary,
      fontSize: fs(11),
      textAlign: "center",
      maxWidth: ms(72),
    },
    storyCircleCreate: {
      width: ms(68),
      height: ms(68),
      borderRadius: ms(34),
      backgroundColor: theme.bg3,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#FE2C55",
      borderStyle: "dashed",
      marginBottom: ms(5),
    },
    storyCreatePlus: {
      width: ms(30),
      height: ms(30),
      borderRadius: ms(15),
      backgroundColor: "#FE2C55",
      justifyContent: "center",
      alignItems: "center",
    },
    storyCircleRing: {
      width: ms(68),
      height: ms(68),
      borderRadius: ms(34),
      padding: ms(3),
      marginBottom: ms(5),
    },
    storyRingOwn: { borderWidth: 2.5, borderColor: "#25D366" },
    storyRingOther: { borderWidth: 2.5, borderColor: "#FE2C55" },
    storyCircleInner: {
      flex: 1,
      borderRadius: ms(30),
      overflow: "hidden",
      backgroundColor: theme.bg3,
    },
    storyCircleImg: { width: "100%", height: "100%", borderRadius: ms(30) },
    storyCountBadge: {
      position: "absolute",
      bottom: ms(2),
      right: ms(2),
      width: ms(20),
      height: ms(20),
      borderRadius: ms(10),
      backgroundColor: "#FE2C55",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: theme.bg,
    },
    storyCountText: {
      color: "#FFF",
      fontSize: fs(10),
      fontWeight: "700",
    },

    // Notification rows
    notifRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      paddingHorizontal: ms(14),
      paddingVertical: ms(13),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg,
    },
    notifIndicator: { width: ms(36), alignItems: "center", marginLeft: ms(8) },
    notifContent: { flex: 1, paddingLeft: ms(12) },
    notifTitle: {
      color: theme.text,
      fontSize: fs(15),
      fontWeight: "700",
      textAlign: "right",
      marginBottom: ms(3),
    },
    notifSubtitle: {
      color: theme.textMuted,
      fontSize: fs(13),
      textAlign: "right",
    },
    notifIconCircle: {
      width: ms(50),
      height: ms(50),
      borderRadius: ms(25),
      justifyContent: "center",
      alignItems: "center",
    },

    // Search bar
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.input,
      borderRadius: ms(12),
      marginHorizontal: ms(14),
      marginTop: ms(12),
      marginBottom: ms(4),
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontSize: fs(15),
      paddingVertical: ms(10),
      textAlign: "right",
    },

    // Conversation item
    convoItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: ms(14),
      paddingVertical: ms(12),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg,
    },
    avatarWrapper: { position: "relative", marginLeft: ms(10) },
    avatar: { width: ms(52), height: ms(52), borderRadius: ms(26) ,marginRight: ms(10)},
    initialsCircle: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.bg3,
    },
    initialsTextLg: { color: theme.text, fontSize: fs(18), fontWeight: "700" },
    onlineDot: {
      position: "absolute",
      bottom: ms(2),
      right: ms(2),
      width: ms(12),
      height: ms(12),
      borderRadius: ms(6),
      backgroundColor: "#25D366",
      borderWidth: 2,
      borderColor: theme.bg,
    },
    convoText: { flex: 1 },
    convoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    convoName: {
      color: theme.text,
      fontSize: fs(15),
      flexShrink: 1,
      textAlign: "right",
    },
    convoNameBold: { fontWeight: "700" },
    convoTime: { color: theme.textMuted, fontSize: fs(12) },
    convoLast: { color: theme.textMuted, fontSize: fs(13), textAlign: "right" },
    convoLastBold: { color: theme.textSecondary, fontWeight: "600" },
    unreadBadge: {
      backgroundColor: "#FE2C55",
      borderRadius: ms(10),
      minWidth: ms(20),
      height: ms(20),
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: ms(5),
    },
    unreadBadgeText: { color: "#FFF", fontSize: fs(11), fontWeight: "700" },
    dotBadge: {
      width: ms(8),
      height: ms(8),
      borderRadius: ms(4),
      backgroundColor: "#FE2C55",
    },

    // Loading
    loadingBar: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: ms(10),
    },

    // Empty state
    emptyContainer: {
      alignItems: "center",
      paddingTop: ms(60),
      paddingHorizontal: ms(30),
    },
    emptyTitle: {
      color: theme.text,
      fontSize: fs(20),
      fontWeight: "700",
      marginTop: ms(16),
    },
    emptySubtitle: {
      color: theme.textMuted,
      fontSize: fs(14),
      marginTop: ms(8),
      textAlign: "center",
    },
    emptyBtn: {
      marginTop: ms(24),
      backgroundColor: "#FE2C55",
      paddingHorizontal: ms(28),
      paddingVertical: ms(12),
      borderRadius: ms(24),
    },
    emptyBtnText: { color: "#FFF", fontSize: fs(15), fontWeight: "700" },
  });

export default InboxScreen;
