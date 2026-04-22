import React, { useState, useContext, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { ms, fs } from "../utils/responsive";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

const SystemNotificationsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("الكل");
  const { userToken, setNotificationCount, fetchNotificationCount } =
    useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = ["الكل", "TikTok", "مساعد المعاملات", "LIVE"];

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} س`;
    if (days < 7) return `منذ ${days} ي`;
    return date.toLocaleDateString("ar-EG");
  };

  const getSummaryText = (notification) => {
    switch (notification.type) {
      case "admin":
        return notification.title || "إشعار من الإدارة";
      case "admin_broadcast":
        return notification.title || "إشعار عام من الإدارة";
      case "system":
        return notification.title || "إشعار من النظام";
      case "announcement":
        return notification.title || "إعلان";
      case "promo":
        return notification.title || "عرض خاص";
      case "update":
        return notification.title || "تحديث التطبيق";
      default:
        return notification.title || "إشعار من النظام";
    }
  };

  const getDetailText = (notification) => {
    return notification.message || notification.body || "";
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      // Include system notifications AND admin notifications (types: admin, admin_broadcast, system, announcement, promo, update)
      const systemTypes = [
        "admin",
        "admin_broadcast",
        "system",
        "announcement",
        "promo",
        "update",
      ];
      const systemOnly = (res.data || []).filter(
        (n) => systemTypes.includes(n.type) || !n.fromUser,
      );
      setNotifications(systemOnly);
    } catch (e) {
      console.error("Error fetching system notifications:", e);
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
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      // Update notification counter
      if (fetchNotificationCount) {
        await fetchNotificationCount();
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
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

  const renderItem = ({ item }) => {
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => markAsRead(item._id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.sourceContainer}>
            <View
              style={[
                styles.iconContainer,
                item.type === "admin" && { backgroundColor: "#007bff" },
                item.type === "admin_broadcast" && {
                  backgroundColor: "#28a745",
                },
                item.type === "announcement" && { backgroundColor: "#ffc107" },
                item.type === "promo" && { backgroundColor: "#ff6b6b" },
                item.type === "update" && { backgroundColor: "#6c757d" },
              ]}
            >
              <Ionicons
                name={
                  item.type === "admin"
                    ? "person-circle"
                    : item.type === "admin_broadcast"
                      ? "megaphone"
                      : item.type === "announcement"
                        ? "megaphone-outline"
                        : item.type === "promo"
                          ? "gift"
                          : item.type === "update"
                            ? "cloud-download"
                            : "notifications"
                }
                size={16}
                color="#fff"
              />
            </View>
            <Text style={styles.sourceText}>TikBook . النظام</Text>
          </View>
          {isUnread && (
            <View style={styles.unreadBadge}>
              <View style={styles.unreadDot} />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, isUnread && styles.unreadTitle]}>
            {getSummaryText(item)}
          </Text>
          {getDetailText(item) ? (
            <Text style={styles.cardMessage} numberOfLines={2}>
              {getDetailText(item)}
            </Text>
          ) : null}
          <Text style={styles.moreText}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(
        `${BASE_URL}/notifications/${notificationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      // Update local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n,
        ),
      );
    } catch (e) {
      console.error("Error marking notification as read:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#B8B0D8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إشعارات النظام</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="notifications-off-outline"
                size={56}
                color="#ccc"
              />
              <Text style={styles.emptyText}>لا توجد إشعارات نظام</Text>
            </View>
          }
        />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: ms(16),
    backgroundColor: "transparent",
    borderBottomWidth: 0.5,
    borderBottomColor: "#2A2550",
  },
  headerTitle: {
    fontSize: fs(17),
    fontWeight: "bold",
    color: "#FFF",
  },
  tabsContainer: {
    backgroundColor: "transparent",
    paddingVertical: ms(12),
  },
  tabsContent: {
    paddingHorizontal: ms(16),
    gap: ms(10),
  },
  tab: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    borderRadius: ms(20),
    backgroundColor: "#151228",
  },
  activeTab: {
    backgroundColor: "#1A1630",
  },
  tabText: {
    color: "#B8B0D8",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#25F4EE",
  },
  listContent: {
    padding: ms(16),
    gap: ms(12),
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(60),
  },
  emptyText: {
    marginTop: ms(12),
    color: "#B8B0D8",
    fontSize: fs(14),
  },
  card: {
    backgroundColor: "#151228",
    borderRadius: ms(8),
    padding: ms(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: "#1A1630",
    borderLeftWidth: 3,
    borderLeftColor: "#7C6FCD",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(12),
  },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
  },
  iconContainer: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: "#2A2550",
    justifyContent: "center",
    alignItems: "center",
  },
  sourceText: {
    color: "#B8B0D8",
    fontSize: fs(13),
    fontWeight: "600",
  },
  unreadBadge: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: "#007bff",
  },
  unreadDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: "#007bff",
  },
  cardContent: {
    paddingRight: ms(32),
  },
  cardTitle: {
    fontSize: fs(15),
    fontWeight: "bold",
    marginBottom: ms(8),
    textAlign: "left",
    color: "#FFF",
  },
  unreadTitle: {
    color: "#25F4EE",
  },
  cardMessage: {
    fontSize: fs(14),
    color: "#E8E5FF",
    marginBottom: ms(8),
    textAlign: "left",
    lineHeight: ms(20),
  },
  cardDescription: {
    fontSize: fs(13),
    color: "#B8B0D8",
    marginBottom: ms(8),
    textAlign: "left",
  },
  moreText: {
    fontSize: fs(13),
    color: "#9B94BD",
    textAlign: "left",
  },
});

export default SystemNotificationsScreen;
