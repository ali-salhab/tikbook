import React, { useState, useContext, useCallback } from "react";
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#000" />
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
          <ActivityIndicator size="large" color="#FE2C55" />
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
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  tabsContainer: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F1F1",
  },
  activeTab: {
    backgroundColor: "#E8F3FF",
  },
  tabText: {
    color: "#666",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#25F4EE",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    color: "#999",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: "#F0F8FF",
    borderLeftWidth: 3,
    borderLeftColor: "#007bff",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F1F1",
    justifyContent: "center",
    alignItems: "center",
  },
  sourceText: {
    color: "#666",
    fontSize: 13,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007bff",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007bff",
  },
  cardContent: {
    paddingRight: 32, // Indent content to align with text
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "left",
  },
  unreadTitle: {
    color: "#007bff",
  },
  cardMessage: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    textAlign: "left",
    lineHeight: 20,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    textAlign: "left",
  },
  moreText: {
    fontSize: 13,
    color: "#666",
    textAlign: "left",
  },
});

export default SystemNotificationsScreen;
