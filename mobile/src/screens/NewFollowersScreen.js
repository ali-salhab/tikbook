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
import LottieView from "lottie-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { ms, fs } from "../utils/responsive";

const NewFollowersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userToken, userInfo, fetchNotificationCount } =
    useContext(AuthContext);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followedIds, setFollowedIds] = useState({});
  const [followLoadingMap, setFollowLoadingMap] = useState({});

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

  const fetchSuggested = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/user/suggestions`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setSuggestedUsers(res.data || []);
    } catch (e) {
      console.error("Error fetching suggested users:", e);
    }
  };

  const fetchFollowers = async () => {
    try {
      let myFollowingIds = new Set();

      if (userInfo?._id) {
        try {
          const meRes = await axios.get(`${BASE_URL}/users/${userInfo._id}`, {
            headers: { Authorization: `Bearer ${userToken}` },
          });
          myFollowingIds = new Set(
            (meRes.data?.following || []).map((id) => id?.toString()),
          );
        } catch (profileErr) {
          console.warn(
            "Could not fetch my following list:",
            profileErr?.message,
          );
        }
      }

      const res = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      // Filter only follow notifications
      const followNotifications = (res.data || []).filter(
        (n) => n.type === "follow" && n.fromUser,
      );

      const enrichedNotifications = followNotifications.map((n) => ({
        ...n,
        isFollowingBack: myFollowingIds.has(n.fromUser?._id?.toString()),
      }));

      setFollowers(enrichedNotifications);
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
      fetchSuggested();
      markAllAsRead();
    }, [userInfo?._id]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFollowers();
    fetchSuggested();
  };

  const handleFollowSuggested = async (userId) => {
    try {
      const isFollowing = !!followedIds[userId];
      if (isFollowing) {
        await axios.put(
          `${BASE_URL}/users/${userId}/unfollow`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        setFollowedIds((prev) => {
          const n = { ...prev };
          delete n[userId];
          return n;
        });
      } else {
        await axios.put(
          `${BASE_URL}/users/${userId}/follow`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        setFollowedIds((prev) => ({ ...prev, [userId]: true }));
      }
    } catch (e) {
      console.error("Error following suggested user:", e);
    }
  };

  const handleFollowBack = async (userId, currentlyFollowing) => {
    if (!userId || followLoadingMap[userId]) return;

    setFollowLoadingMap((prev) => ({ ...prev, [userId]: true }));

    const setLocalFollowState = (isFollowingBack) => {
      setFollowers((prevFollowers) =>
        prevFollowers.map((f) =>
          f.fromUser?._id === userId ? { ...f, isFollowingBack } : f,
        ),
      );
    };

    try {
      if (currentlyFollowing) {
        // Unfollow
        await axios.put(
          `${BASE_URL}/users/${userId}/unfollow`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
      } else {
        // Follow
        await axios.put(
          `${BASE_URL}/users/${userId}/follow`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
      }

      setLocalFollowState(!currentlyFollowing);
    } catch (error) {
      const status = error?.response?.status;
      const message = (error?.response?.data?.message || "").toLowerCase();

      const alreadyFollowingError =
        !currentlyFollowing &&
        status === 403 &&
        message.includes("already follow");

      const alreadyUnfollowedError =
        currentlyFollowing &&
        status === 403 &&
        (message.includes("dont follow") || message.includes("don't follow"));

      // Sync local UI with server state when backend says state already applied.
      if (alreadyFollowingError) {
        setLocalFollowState(true);
        return;
      }

      if (alreadyUnfollowedError) {
        setLocalFollowState(false);
        return;
      }

      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoadingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const renderItem = ({ item }) => {
    const user = item.fromUser;
    const isFollowingBack = !!item.isFollowingBack;
    const isFollowLoading = !!followLoadingMap[user?._id];
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
            isFollowingBack && styles.followingButton,
          ]}
          onPress={() => handleFollowBack(user._id, isFollowingBack)}
          disabled={isFollowLoading}
        >
          {isFollowLoading ? (
            <ActivityIndicator
              size="small"
              color={isFollowingBack ? "#666" : "#FFF"}
            />
          ) : (
            <Text
              style={[
                styles.followButtonText,
                isFollowingBack && styles.followingButtonText,
              ]}
            >
              {isFollowingBack ? "أصدقاء" : "رد المتابعة"}
            </Text>
          )}
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
          <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
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

          {suggestedUsers.length > 0 && (
            <View style={styles.suggestedSection}>
              <Text style={styles.suggestedTitle}>حسابات مقترحة</Text>
              <RNFlatList
                data={suggestedUsers}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestedCard}
                    onPress={() =>
                      navigation.navigate("UserProfile", { userId: item._id })
                    }
                  >
                    <View style={{ position: "relative" }}>
                      {item.profileImage ? (
                        <Image
                          source={{ uri: item.profileImage }}
                          style={styles.suggestedAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.suggestedAvatar,
                            styles.suggestedAvatarPlaceholder,
                          ]}
                        >
                          <Ionicons name="person" size={20} color="#CCC" />
                        </View>
                      )}
                      {item.isVerified && (
                        <View style={styles.verifiedBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={
                              item.verificationBadge === "gold"
                                ? "#FFD700"
                                : "#1DA1F2"
                            }
                          />
                        </View>
                      )}
                    </View>
                    <Text style={styles.suggestedName} numberOfLines={1}>
                      {item.username}
                    </Text>
                    <Text style={styles.suggestedReason}>
                      {item.followersCount > 0
                        ? `${item.followersCount} متابع`
                        : "حساب جديد"}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.suggestedFollowBtn,
                        followedIds[item._id] && styles.suggestedFollowingBtn,
                      ]}
                      onPress={() => handleFollowSuggested(item._id)}
                    >
                      <Text
                        style={[
                          styles.suggestedFollowText,
                          followedIds[item._id] &&
                            styles.suggestedFollowingText,
                        ]}
                      >
                        {followedIds[item._id] ? "أصدقاء" : "متابعة"}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
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
    paddingVertical: ms(60),
  },
  emptyText: {
    fontSize: fs(16),
    color: "#999",
    marginTop: ms(12),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: ms(16),
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
    paddingTop: ms(12),
  },
  headerTitle: {
    fontSize: fs(17),
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  listContent: {
    padding: ms(16),
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(20),
    gap: ms(12),
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: ms(8),
  },
  avatarContainer: {
    position: "relative",
    marginRight: ms(12),
  },
  avatar: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
  },
  avatarPlaceholder: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  newBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: "#25F4EE",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontWeight: "bold",
    fontSize: fs(15),
    marginBottom: ms(4),
    textAlign: "right",
  },
  actionText: {
    color: "#666",
    fontSize: fs(13),
    textAlign: "right",
  },
  time: {
    color: "#999",
  },
  followButton: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: ms(18),
    paddingVertical: ms(10),
    borderRadius: ms(8),
    minWidth: ms(110),
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#E5E5E5",
  },
  followButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: fs(14),
  },
  followingButtonText: {
    color: "#000",
  },
  suggestedSection: {
    paddingHorizontal: ms(16),
    paddingBottom: ms(20),
    paddingTop: ms(8),
  },
  suggestedTitle: {
    fontSize: fs(15),
    fontWeight: "bold",
    color: "#666",
    textAlign: "right",
  },
  suggestedList: {
    paddingVertical: ms(12),
    gap: ms(12),
  },
  suggestedCard: {
    width: ms(120),
    backgroundColor: "#F7F7F7",
    borderRadius: ms(12),
    padding: ms(12),
    alignItems: "center",
  },
  suggestedAvatar: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    marginBottom: ms(8),
  },
  suggestedAvatarPlaceholder: {
    backgroundColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: ms(8),
  },
  suggestedName: {
    fontWeight: "700",
    fontSize: fs(13),
    color: "#111",
    textAlign: "center",
    marginBottom: ms(2),
  },
  suggestedReason: {
    fontSize: fs(11),
    color: "#777",
    marginTop: ms(2),
    textAlign: "center",
    marginBottom: ms(8),
  },
  suggestedFollowBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: ms(6),
    paddingHorizontal: ms(14),
    paddingVertical: ms(5),
    marginTop: ms(4),
  },
  suggestedFollowingBtn: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  suggestedFollowText: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "700",
  },
  suggestedFollowingText: {
    color: "#333",
  },
});

export default NewFollowersScreen;
