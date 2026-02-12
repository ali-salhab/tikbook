import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useNetInfo } from "@react-native-community/netinfo";
import OfflineNotice from "../components/OfflineNotice";
import LoadingIndicator from "../components/LoadingIndicator";

const InboxScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const netInfo = useNetInfo();

  const [notifications, setNotifications] = useState([]);

  const fetchConversations = async () => {
    if (netInfo.isConnected === false) return;
    try {
      // Use the new endpoint for conversations
      const res = await axios.get(`${BASE_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setConversations(res.data);
    } catch (e) {
      console.error("Error fetching conversations:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    if (netInfo.isConnected === false) return;
    try {
      const res = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setNotifications(res.data || []);
    } catch (e) {
      console.error("Error fetching notifications:", e);
      setNotifications([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (netInfo.isConnected !== false) {
        fetchConversations();
        fetchNotifications();
      } else {
        setLoading(false);
      }
    }, [netInfo.isConnected]),
  );

  const onRefresh = () => {
    if (netInfo.isConnected !== false) {
      setRefreshing(true);
      fetchConversations();
      fetchNotifications();
    }
  };

  if (
    netInfo.isConnected === false &&
    conversations.length === 0 &&
    notifications.length === 0
  ) {
    return <OfflineNotice onRetry={onRefresh} />;
  }

  if (loading && conversations.length === 0) {
    return <LoadingIndicator />;
  }

  const renderStoryItem = (item) => {
    if (item.type === "create") {
      return (
        <TouchableOpacity style={styles.storyItem} key={item.id}>
          <View style={styles.createStoryContainer}>
            {userInfo?.profileImage ? (
              <Image
                source={{ uri: userInfo.profileImage }}
                style={styles.storyAvatar}
              />
            ) : (
              <Image
                source={require("../../assets/icon.png")} // Fallback
                style={styles.storyAvatar}
              />
            )}
            <View style={styles.createBadge}>
              <Ionicons name="add" size={12} color="#FFF" />
            </View>
          </View>
          <Text style={styles.storyUsername}>{item.user.username}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity style={styles.storyItem} key={item.id}>
        <View style={styles.storyRing}>
          {item.user.profileImage ? (
            <Image
              source={{ uri: item.user.profileImage }}
              style={styles.storyAvatar}
            />
          ) : (
            <View style={styles.storyAvatarPlaceholder}>
              <Ionicons name="person" size={24} color="#CCC" />
            </View>
          )}
          <View style={styles.liveBadge}>
            <Ionicons name="bar-chart" size={10} color="#FFF" />
          </View>
        </View>
        <Text style={styles.storyUsername} numberOfLines={1}>
          {item.user.username}
        </Text>
      </TouchableOpacity>
    );
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

  const stories = [
    { id: "create", type: "create", user: { username: "إنشاء" } },
    ...conversations
      .filter((c) => c.otherUser)
      .slice(0, 6)
      .map((c) => ({
        id: c._id,
        type: "story",
        user: c.otherUser,
        hasStory: true,
      })),
  ];

  const systemNotifications = notifications.filter(
    (n) => !n.fromUser && !n.read,
  );
  const followerNotifications = notifications.filter(
    (n) => n.type === "follow" && !n.read,
  );
  const activityNotifications = notifications.filter(
    (n) => n.fromUser && n.type !== "follow" && !n.read,
  );

  // Get latest notifications for preview (can be read or unread)
  const latestFollower = notifications.find((n) => n.type === "follow");
  const latestActivity = notifications.find(
    (n) => n.fromUser && n.type !== "follow",
  );
  const latestSystem = notifications.find((n) => !n.fromUser);

  const ListHeader = () => (
    <View>
      {/* Stories Section */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.storiesContainer}
        contentContainerStyle={styles.storiesContent}
      >
        {stories.map(renderStoryItem)}
      </ScrollView>

      {/* Fixed Menu Items */}
      <View style={styles.menuContainer}>
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
              {latestActivity ? getSummaryText(latestActivity) : "لا يوجد نشاط"}
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
      </View>
    </View>
  );

  const renderConversation = ({ item }) => {
    const otherUser = item.otherUser;
    if (!otherUser?._id) {
      return null;
    }

    const isOnline = otherUser?.isOnline;
    const lastMsg = item.lastMessage?.text || "بدأ محادثة";
    const time = formatDate(item.lastMessage?.createdAt);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() =>
          navigation.navigate("Chat", {
            userId: otherUser._id,
            username: otherUser.username,
            profileImage: otherUser.profileImage,
          })
        }
      >
        <View style={styles.avatarContainer}>
          {otherUser?.profileImage ? (
            <Image
              source={{ uri: otherUser.profileImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#CCC" />
            </View>
          )}
          {isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.username}>{otherUser?.username}</Text>
          <Text style={styles.message} numberOfLines={1}>
            {lastMsg}
            {time && <Text style={styles.time}> . {time}</Text>}
          </Text>
        </View>

        <TouchableOpacity>
          <Ionicons name="camera-outline" size={24} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>صندوق الوارد</Text>
          <View style={styles.statusDot} />
        </View>
        <TouchableOpacity>
          <Ionicons name="person-add-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#25F4EE",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  storiesContainer: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: "center",
    width: 64,
  },
  createStoryContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    position: "relative",
    marginBottom: 4,
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#FE2C55",
    padding: 2,
    marginBottom: 4,
    position: "relative",
  },
  storyAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  storyAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    backgroundColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  createBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#25F4EE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  liveBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  storyUsername: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  menuContainer: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "left",
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "left",
  },
  notificationBadge: {
    backgroundColor: "#FE2C55",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  dotBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FE2C55",
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#00E676",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  contentContainer: {
    flex: 1,
    marginRight: 12,
  },
  username: {
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 4,
    textAlign: "left",
  },
  message: {
    color: "#666",
    fontSize: 14,
    textAlign: "left",
  },
  time: {
    color: "#999",
  },
});

export default InboxScreen;
