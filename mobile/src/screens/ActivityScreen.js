import React, { useState, useContext, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useNetInfo } from "@react-native-community/netinfo";
import OfflineNotice from "../components/OfflineNotice";
import { ms, fs } from "../utils/responsive";
import LoadingIndicator from "../components/LoadingIndicator";

const ActivityScreen = ({ navigation }) => {
  const { userToken, userInfo, setNotificationCount, fetchNotificationCount } =
    useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingMap, setFollowingMap] = useState({});
  const netInfo = useNetInfo();

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

  const buildCloudinaryThumbnail = (url) => {
    if (!url) return null;
    if (!url.includes("cloudinary.com")) return null;
    return url
      .replace("/upload/", "/upload/c_fill,g_center,w_200,h_260,so_1/")
      .replace(/\.(mp4|mov|m4v|avi|mkv|webm)$/i, ".jpg");
  };

  const isImageUrl = (url) =>
    typeof url === "string" && url.match(/\.(jpe?g|png|gif|webp)$/i) !== null;

  const getActionText = (notification) => {
    const username = notification.fromUser?.username || "TikBook";
    switch (notification.type) {
      case "like":
        return `${username} أعجب بالفيديو الخاص بك`;
      case "comment":
        return `${username} علّق على الفيديو الخاص بك`;
      case "follow":
        return `${username} بدأ في متابعتك`;
      case "new_video":
        return `${username} نشر فيديو جديد`;
      case "live_stream":
        return `${username} بدأ بث مباشر`;
      default:
        return `${username} تفاعل معك`;
    }
  };

  const handleNotificationPress = (notification) => {
    if (
      notification.type === "like" ||
      notification.type === "comment" ||
      notification.type === "new_video"
    ) {
      if (notification.video) {
        navigation.navigate("MainTabs", {
          screen: "Home",
          params: { videoId: notification.video._id },
        });
      }
    } else if (notification.type === "follow") {
      if (notification.fromUser) {
        navigation.navigate("UserProfile", {
          userId: notification.fromUser._id,
        });
      }
    } else if (notification.type === "live_stream") {
      navigation.navigate("LiveStreamsListScreen");
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      await axios.put(
        `${BASE_URL}/notifications/mark-read`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      // Clear badge immediately and then refetch to stay in sync
      setNotificationCount(0);
      // Refetch count from server to ensure accuracy
      if (fetchNotificationCount) {
        await fetchNotificationCount();
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const fetchNotifications = async () => {
    if (netInfo.isConnected === false) return;
    try {
      const res = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const notifs = res.data || [];
      setActivities(notifs);

      // Build a followingMap from follow notifications
      if (userInfo?._id) {
        const profileRes = await axios.get(
          `${BASE_URL}/users/${userInfo._id}`,
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
        const following = profileRes.data?.following || [];
        const map = {};
        following.forEach((id) => {
          map[id] = true;
        });
        setFollowingMap(map);
      }
    } catch (e) {
      console.error("Error fetching notifications:", e);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (netInfo.isConnected !== false) {
        fetchNotifications();
        markNotificationsAsRead();
      } else {
        setLoading(false);
      }
    }, [netInfo.isConnected]),
  );

  const onRefresh = () => {
    if (netInfo.isConnected !== false) {
      setRefreshing(true);
      fetchNotifications();
    }
  };

  if (netInfo.isConnected === false && activities.length === 0) {
    return <OfflineNotice onRetry={onRefresh} />;
  }

  if (loading && activities.length === 0) {
    return <LoadingIndicator />;
  }

  const handleFollowBack = async (targetUserId) => {
    if (!targetUserId) return;
    const alreadyFollowing = followingMap[targetUserId];
    try {
      if (alreadyFollowing) {
        await axios.put(
          `${BASE_URL}/users/${targetUserId}/unfollow`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: false }));
      } else {
        await axios.put(
          `${BASE_URL}/users/${targetUserId}/follow`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
        setFollowingMap((prev) => ({ ...prev, [targetUserId]: true }));
      }
    } catch (e) {
      Alert.alert(
        "خطأ",
        e?.response?.data?.message || "فشل تغيير حالة المتابعة",
      );
    }
  };

  const renderItem = ({ item }) => {
    const videoUrl = item.video?.videoUrl;
    const thumbUrl = isImageUrl(videoUrl)
      ? videoUrl
      : buildCloudinaryThumbnail(videoUrl);

    // Get icon for notification type
    const getNotificationIcon = () => {
      switch (item.type) {
        case "like":
          return { name: "heart", color: "#FE2C55" };
        case "comment":
          return { name: "chatbubble", color: "#4A90E2" };
        case "follow":
          return { name: "person-add", color: "#00C875" };
        case "new_video":
          return { name: "videocam", color: "#9B59B6" };
        case "live_stream":
          return { name: "radio", color: "#E74C3C" };
        default:
          return { name: "notifications", color: "#999" };
      }
    };

    const notifIcon = getNotificationIcon();

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.leftContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              {item.fromUser?.profileImage ? (
                <Image
                  source={{ uri: item.fromUser.profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person" size={24} color="#CCC" />
              )}
            </View>
            {/* Notification type icon badge */}
            <View
              style={[styles.iconBadge, { backgroundColor: notifIcon.color }]}
            >
              <Ionicons name={notifIcon.name} size={14} color="#FFF" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.username}>
              {item.fromUser?.username || "TikBook"}
            </Text>
            <Text style={styles.actionText}>
              {getActionText(item)}{" "}
              <Text style={styles.time}>. {formatDate(item.createdAt)}</Text>
            </Text>
          </View>
        </View>

        {/* Follow Back button for follow notifications */}
        {item.type === "follow" && item.fromUser && (
          <TouchableOpacity
            style={[
              styles.followBackBtn,
              followingMap[item.fromUser._id] && styles.followingBack,
            ]}
            onPress={() => handleFollowBack(item.fromUser._id)}
          >
            <Text style={styles.followBackText}>
              {followingMap[item.fromUser._id] ? "متابَع" : "رد المتابعة"}
            </Text>
          </TouchableOpacity>
        )}
        {videoUrl ? (
          thumbUrl ? (
            <Image source={{ uri: thumbUrl }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>النشاط</Text>
          <Ionicons name="chevron-down" size={16} color="#000" />
        </View>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      ) : (
        <FlatList
          data={activities}
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
              <Text style={styles.emptyText}>لا توجد إشعارات بعد</Text>
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
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: ms(16),
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
  },
  headerTitle: {
    fontSize: fs(17),
    fontWeight: "bold",
  },
  listContent: {
    padding: ms(16),
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
    color: "#999",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(20),
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: ms(10),
  },
  avatarContainer: {
    position: "relative",
    marginRight: ms(12),
    width: ms(56),
    height: ms(56),
  },
  avatarPlaceholder: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: ms(28),
  },
  iconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontWeight: "bold",
    fontSize: fs(15),
    marginBottom: ms(4),
    textAlign: "left",
  },
  actionText: {
    color: "#666",
    fontSize: fs(13),
    textAlign: "left",
    lineHeight: ms(18),
  },
  time: {
    color: "#999",
  },
  thumbnailPlaceholder: {
    width: ms(48),
    height: ms(64),
    backgroundColor: "#333",
    borderRadius: ms(4),
  },
  thumbnailImage: {
    width: ms(48),
    height: ms(64),
    borderRadius: ms(4),
  },
  followBackBtn: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(7),
    borderRadius: ms(20),
    backgroundColor: "#FE2C55",
    alignSelf: "center",
    minWidth: ms(80),
    alignItems: "center",
  },
  followingBack: {
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#555",
  },
  followBackText: {
    color: "#fff",
    fontSize: fs(13),
    fontWeight: "600",
  },
});

export default ActivityScreen;
