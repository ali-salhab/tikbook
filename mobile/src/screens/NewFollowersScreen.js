import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  FlatList as RNFlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

const NewFollowersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userToken, setNotificationCount, fetchNotificationCount } =
    useContext(AuthContext);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchFollowers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      // Filter only follow notifications
      const followNotifications = (res.data || []).filter(
        (n) => n.type === "follow" && n.fromUser,
      );
      setFollowers(followNotifications);
    } catch (e) {
      console.error("Error fetching followers:", e);
      setFollowers([]);
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
      fetchFollowers();
      markAllAsRead();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowers();
  };

  const handleFollowBack = async (userId, currentlyFollowing) => {
    try {
      if (currentlyFollowing) {
        // Unfollow
        await axios.delete(`${BASE_URL}/user/${userId}/unfollow`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
      } else {
        // Follow
        await axios.post(
          `${BASE_URL}/user/${userId}/follow`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
      }
      // Update local state
      setFollowers((prevFollowers) =>
        prevFollowers.map((f) =>
          f.fromUser?._id === userId
            ? { ...f, isFollowingBack: !currentlyFollowing }
            : f,
        ),
      );
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const suggested = [
    { id: "s1", username: "user_a", reason: "مقترح لك" },
    { id: "s2", username: "user_b", reason: "مشتركين" },
    { id: "s3", username: "user_c", reason: "نشط الآن" },
    { id: "s4", username: "user_d", reason: "الأصدقاء" },
  ];

  const renderItem = ({ item }) => {
    const user = item.fromUser;
    if (!user) return null;

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() =>
            navigation.navigate("UserProfile", { userId: user._id })
          }
        >
          <View style={styles.avatarContainer}>
            {user.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="#CCC" />
              </View>
            )}
            {!item.read && <View style={styles.newBadge} />}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.actionText}>
              بدأ في متابعتك{" "}
              <Text style={styles.time}>. {formatDate(item.createdAt)}</Text>
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.followButton,
            item.isFollowingBack && styles.followingButton,
          ]}
          onPress={() => handleFollowBack(user._id, item.isFollowingBack)}
        >
          <Text
            style={[
              styles.followButtonText,
              item.isFollowingBack && styles.followingButtonText,
            ]}
          >
            {item.isFollowingBack ? "أصدقاء" : "رد المتابعة"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>متابعون جدد</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      ) : (
        <>
          <FlatList
            data={followers}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={56} color="#ccc" />
                <Text style={styles.emptyText}>لا يوجد متابعون جدد</Text>
              </View>
            }
          />

          <View style={styles.suggestedSection}>
            <Text style={styles.suggestedTitle}>حسابات مقترحة ⓘ</Text>
            <RNFlatList
              data={suggested}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedList}
              renderItem={({ item }) => (
                <View style={styles.suggestedCard}>
                  <View style={styles.suggestedAvatar}>
                    <Ionicons name="person" size={20} color="#CCC" />
                  </View>
                  <Text style={styles.suggestedName}>{item.username}</Text>
                  <Text style={styles.suggestedReason}>{item.reason}</Text>
                </View>
              )}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
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
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  newBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#25F4EE",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 4,
    textAlign: "right",
  },
  actionText: {
    color: "#666",
    fontSize: 13,
    textAlign: "right",
  },
  time: {
    color: "#999",
  },
  followButton: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#E5E5E5",
  },
  followButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  followingButtonText: {
    color: "#000",
  },
  suggestedSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  suggestedTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#666",
    textAlign: "right",
  },
  suggestedList: {
    paddingVertical: 12,
    gap: 12,
  },
  suggestedCard: {
    width: 110,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  suggestedAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  suggestedName: {
    fontWeight: "700",
    fontSize: 13,
    color: "#111",
  },
  suggestedReason: {
    fontSize: 11,
    color: "#777",
    marginTop: 4,
    textAlign: "center",
  },
});

export default NewFollowersScreen;
