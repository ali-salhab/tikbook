import React, { useState, useContext, useCallback, useRef } from "react";
import GradientBackground from "../components/GradientBackground";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { ms, fs } from "../utils/responsive";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

// ─── Tab definitions with their matching notification types ──────────────────
const TABS = [
  { label: "الكل",              types: null },
  { label: "LIVE",              types: ["live"] },
  { label: "مساعد المعاملات",  types: ["admin", "admin_broadcast", "system", "announcement", "promo", "update"] },
  { label: "TikTok",            types: ["like", "comment", "follow", "video", "mention"] },
];

// ─── Per-type display config ─────────────────────────────────────────────────
const TYPE_CONFIG = {
  live:            { icon: "radio",            color: "#FF2D92", bg: "#FF2D9222", label: "LIVE" },
  admin:           { icon: "person-circle",    color: "#6366F1", bg: "#6366F122", label: "إدارة" },
  admin_broadcast: { icon: "megaphone",        color: "#8B5CF6", bg: "#8B5CF622", label: "إعلان عام" },
  system:          { icon: "notifications",    color: "#25F4EE", bg: "#25F4EE22", label: "النظام" },
  announcement:    { icon: "megaphone-outline",color: "#F59E0B", bg: "#F59E0B22", label: "إعلان" },
  promo:           { icon: "gift",             color: "#EC4899", bg: "#EC489922", label: "عرض" },
  update:          { icon: "cloud-download",   color: "#10B981", bg: "#10B98122", label: "تحديث" },
  follow:          { icon: "person-add",       color: "#3B82F6", bg: "#3B82F622", label: "متابعة" },
  like:            { icon: "heart",            color: "#EF4444", bg: "#EF444422", label: "إعجاب" },
  comment:         { icon: "chatbubble",       color: "#F97316", bg: "#F9731622", label: "تعليق" },
  video:           { icon: "videocam",         color: "#A855F7", bg: "#A855F722", label: "فيديو" },
  mention:         { icon: "at",               color: "#06B6D4", bg: "#06B6D422", label: "إشارة" },
};

const DEFAULT_CONFIG = { icon: "notifications", color: "#7C6FCD", bg: "#7C6FCD22", label: "إشعار" };

const getTypeConfig = (type) => TYPE_CONFIG[type] || DEFAULT_CONFIG;

const SystemNotificationsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("الكل");
  const { userToken, fetchNotificationCount } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [navigatingId, setNavigatingId] = useState(null);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const diff = Date.now() - new Date(dateString).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return "الآن";
    if (mins  < 60) return `منذ ${mins} د`;
    if (hours < 24) return `منذ ${hours} س`;
    if (days  <  7) return `منذ ${days} ي`;
    return new Date(dateString).toLocaleDateString("ar-EG");
  };

  // ── Filter tabs → notifications ─────────────────────────────────────────
  const filteredNotifications = (() => {
    const tab = TABS.find((t) => t.label === activeTab);
    if (!tab || !tab.types) return notifications;
    return notifications.filter((n) => {
      if (tab.types.includes(n.type)) return true;
      // Also match LIVE tab via data payload
      if (activeTab === "LIVE" && (n.data?.roomId || n.data?.type === "live")) return true;
      return false;
    });
  })();

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setNotifications(res.data || []);
    } catch (e) {
      console.error("Error fetching notifications:", e);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(
        `${BASE_URL}/notifications/mark-read`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      fetchNotificationCount?.();
    } catch (_) {}
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      markAllAsRead();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // ── Mark single as read ──────────────────────────────────────────────────
  const markOneRead = async (id) => {
    try {
      await axios.put(
        `${BASE_URL}/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      fetchNotificationCount?.();
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  // ── Navigation on press ──────────────────────────────────────────────────
  const handlePress = async (item) => {
    if (navigatingId === item._id) return;
    await markOneRead(item._id);

    const type = item.type;
    const data = item.data || {};

    // ── LIVE notification ──
    if (type === "live" || data.roomId || data.type === "live") {
      const roomId = data.roomId;
      if (!roomId) return;
      setNavigatingId(item._id);
      try {
        const res = await axios.get(`${BASE_URL}/liverooms/${roomId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const room = res.data;
        if (room && room.isLive !== false) {
          navigation.navigate("LiveRoom", {
            roomId: room._id || roomId,
            hostId: room.host?._id || data.hostId,
            roomName: room.title || room.name || data.hostName,
          });
        } else {
          Alert.alert("البث انتهى", "هذه الغرفة لم تعد متاحة");
        }
      } catch (_) {
        Alert.alert("البث انتهى", "هذه الغرفة لم تعد متاحة");
      } finally {
        setNavigatingId(null);
      }
      return;
    }

    // ── Follow / social notification ──
    if (type === "follow" && item.fromUser?._id) {
      navigation.navigate("UserProfile", { userId: item.fromUser._id });
      return;
    }

    // ── Like / Comment on a video ──
    if ((type === "like" || type === "comment") && item.video?._id) {
      navigation.navigate("VideoPlayer", { videoId: item.video._id });
      return;
    }

    // ── Admin / system → already visible inline, nothing more to do ──
  };

  // ── Render item ──────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const cfg      = getTypeConfig(item.type);
    const isUnread = !item.read;
    const isNav    = navigatingId === item._id;
    const title    = item.title || item.message || cfg.label;
    const body     = item.message && item.title ? item.message : (item.body || "");
    const isActionable =
      item.type === "live" || item.data?.roomId ||
      (item.type === "follow" && item.fromUser?._id) ||
      ((item.type === "like" || item.type === "comment") && item.video?._id);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isUnread && { borderLeftColor: cfg.color, borderLeftWidth: 3 },
          !isUnread && styles.readCard,
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        {/* Left icon */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={ms(20)} color={cfg.color} />
        </View>

        {/* Content */}
        <View style={styles.cardBody}>
          {/* Type chip + time row */}
          <View style={styles.metaRow}>
            <Text style={[styles.typeChip, { color: cfg.color, backgroundColor: cfg.bg }]}>
              {cfg.label}
            </Text>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: cfg.color }]} />}
            <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, isUnread && { color: "#FFF" }]} numberOfLines={2}>
            {title}
          </Text>

          {/* Body */}
          {!!body && (
            <Text style={styles.cardMessage} numberOfLines={3}>
              {body}
            </Text>
          )}

          {/* CTA arrow for actionable items */}
          {isActionable && (
            <View style={styles.ctaRow}>
              {isNav ? (
                <ActivityIndicator size="small" color={cfg.color} />
              ) : (
                <>
                  <Text style={[styles.ctaText, { color: cfg.color }]}>
                    {item.type === "live" || item.data?.roomId
                      ? "الانضمام للبث"
                      : item.type === "follow"
                        ? "عرض الملف الشخصي"
                        : "عرض الفيديو"}
                  </Text>
                  <Ionicons name="chevron-back" size={ms(13)} color={cfg.color} />
                </>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Count per tab ────────────────────────────────────────────────────────
  const countForTab = (tab) => {
    if (!tab.types) return notifications.length;
    return notifications.filter((n) => {
      if (tab.types.includes(n.type)) return true;
      if (tab.label === "LIVE" && (n.data?.roomId || n.data?.type === "live")) return true;
      return false;
    }).length;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientBackground />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={ms(22)} color="#B8B0D8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إشعارات النظام</Text>
        <TouchableOpacity onPress={markAllAsRead} style={styles.backBtn}>
          <Ionicons name="checkmark-done" size={ms(20)} color="#25F4EE" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.label;
            const count    = countForTab(tab);
            return (
              <TouchableOpacity
                key={tab.label}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.label)}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <LottieView
            source={require("../../assets/lottie-loader.json")}
            style={{ width: ms(80), height: ms(80) }}
            autoPlay
            loop
          />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7C6FCD"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={ms(56)} color="#3A3460" />
              <Text style={styles.emptyText}>لا توجد إشعارات</Text>
              <Text style={styles.emptySubText}>
                {activeTab !== "الكل" ? `لا توجد إشعارات في هذه الفئة` : "ستظهر إشعاراتك هنا"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: ms(16), paddingVertical: ms(12),
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(14,11,30,0.6)",
  },
  backBtn: { padding: ms(4) },
  headerTitle: { fontSize: fs(17), fontWeight: "700", color: "#FFF" },

  tabsContainer: { paddingVertical: ms(10) },
  tabsContent: { paddingHorizontal: ms(16), gap: ms(8) },
  tab: {
    flexDirection: "row", alignItems: "center", gap: ms(5),
    paddingHorizontal: ms(14), paddingVertical: ms(7),
    borderRadius: ms(20), backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  activeTab: {
    backgroundColor: "rgba(124,111,205,0.25)",
    borderColor: "#7C6FCD",
  },
  tabText: { color: "#9B94BD", fontWeight: "600", fontSize: fs(12) },
  activeTabText: { color: "#FFF", fontWeight: "700" },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: ms(9), minWidth: ms(18), height: ms(18),
    alignItems: "center", justifyContent: "center", paddingHorizontal: ms(4),
  },
  tabBadgeActive: { backgroundColor: "#7C6FCD" },
  tabBadgeText: { color: "#FFF", fontSize: fs(10), fontWeight: "700" },

  listContent: { padding: ms(16), gap: ms(10), paddingBottom: ms(32) },

  card: {
    flexDirection: "row", gap: ms(12),
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ms(14), padding: ms(14),
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    borderLeftWidth: 0,
  },
  readCard: { opacity: 0.85 },

  iconWrap: {
    width: ms(44), height: ms(44), borderRadius: ms(22),
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  cardBody: { flex: 1, gap: ms(4) },

  metaRow: {
    flexDirection: "row", alignItems: "center",
    gap: ms(6), marginBottom: ms(2),
  },
  typeChip: {
    fontSize: fs(10), fontWeight: "700",
    paddingHorizontal: ms(8), paddingVertical: ms(2),
    borderRadius: ms(10), overflow: "hidden",
  },
  unreadDot: {
    width: ms(6), height: ms(6), borderRadius: ms(3),
  },
  timeText: { color: "#6B6B80", fontSize: fs(11), marginLeft: "auto" },

  cardTitle: {
    fontSize: fs(14), fontWeight: "700",
    color: "#C8C5E8", lineHeight: ms(20),
  },
  cardMessage: {
    fontSize: fs(13), color: "#9B94BD",
    lineHeight: ms(19),
  },

  ctaRow: {
    flexDirection: "row", alignItems: "center",
    gap: ms(3), marginTop: ms(4),
  },
  ctaText: { fontSize: fs(12), fontWeight: "700" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { alignItems: "center", paddingVertical: ms(70) },
  emptyText: { color: "#7C6FCD", fontSize: fs(16), fontWeight: "700", marginTop: ms(14) },
  emptySubText: { color: "#6B6B80", fontSize: fs(13), marginTop: ms(6) },
});

export default SystemNotificationsScreen;
