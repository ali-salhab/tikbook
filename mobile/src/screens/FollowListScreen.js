import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import GradientBackground from "../components/GradientBackground";
import { ms, fs } from "../utils/responsive";

/**
 * Generic followers / following list screen.
 *
 * Route params:
 *   - userId   : the user whose list we are viewing
 *   - type     : "followers" | "following"
 *   - title?   : optional override title
 *   - username?: optional username for header subtitle
 */
const FollowListScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId, type = "followers", title, username } = route.params || {};
  const { userToken, userInfo, BASE_URL } = useContext(AuthContext);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingMap, setPendingMap] = useState({});

  const isFollowers = type === "followers";
  const headerTitle = title || (isFollowers ? "المتابعون" : "متابَعون");

  const fetchList = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await axios.get(
        `${BASE_URL}/users/${userId}/${isFollowers ? "followers" : "following"}`,
        userToken
          ? { headers: { Authorization: `Bearer ${userToken}` } }
          : undefined,
      );
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.log("FollowList error:", e.response?.data?.message || e.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [BASE_URL, userId, userToken, isFollowers]);

  useEffect(() => {
    setLoading(true);
    fetchList();
  }, [fetchList]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchList();
    } catch (_) {}
    setRefreshing(false);
  }, [fetchList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) =>
      String(u.username || "").toLowerCase().includes(q),
    );
  }, [list, search]);

  const toggleFollow = async (target) => {
    if (!userToken || !target?._id) return;
    if (String(target._id) === String(userInfo?._id)) return;
    setPendingMap((p) => ({ ...p, [target._id]: true }));
    const willFollow = !target.isFollowing;
    setList((prev) =>
      prev.map((u) =>
        u._id === target._id ? { ...u, isFollowing: willFollow } : u,
      ),
    );
    try {
      await axios.put(
        `${BASE_URL}/users/${target._id}/${willFollow ? "follow" : "unfollow"}`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
    } catch (e) {
      // Revert
      setList((prev) =>
        prev.map((u) =>
          u._id === target._id ? { ...u, isFollowing: !willFollow } : u,
        ),
      );
    } finally {
      setPendingMap((p) => {
        const next = { ...p };
        delete next[target._id];
        return next;
      });
    }
  };

  const renderItem = ({ item }) => {
    const isMe = String(item._id) === String(userInfo?._id);
    const pending = !!pendingMap[item._id];
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          if (isMe) {
            navigation.navigate("MainTabs", { screen: "Profile" });
          } else {
            navigation.push("UserProfile", { userId: item._id });
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.avatarWrap}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={ms(22)} color="#888" />
            </View>
          )}
          {item.isOnline ? <View style={styles.onlineDot} /> : null}
        </View>

        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <Text style={styles.username} numberOfLines={1}>
              {item.username || "user"}
            </Text>
            {item.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={ms(14)}
                color="#1DA1F2"
                style={{ marginRight: ms(4) }}
              />
            )}
            {item.vipLevel > 0 && (
              <View style={styles.vipPill}>
                <Text style={styles.vipPillText}>VIP{item.vipLevel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.handle} numberOfLines={1}>
            @{item.username}
          </Text>
        </View>

        {!isMe && (
          <TouchableOpacity
            onPress={() => toggleFollow(item)}
            disabled={pending}
            style={[
              styles.followBtn,
              item.isFollowing && styles.followBtnFollowing,
            ]}
            activeOpacity={0.85}
          >
            {pending ? (
              <ActivityIndicator
                size="small"
                color={item.isFollowing ? "#FF2D92" : "#FFF"}
              />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  item.isFollowing && styles.followBtnTextFollowing,
                ]}
              >
                {item.isFollowing ? "متابَع" : "متابعة"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GradientBackground />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={28} color="#F0EEFF" />
        </TouchableOpacity>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          {!!username && (
            <Text style={styles.headerSubtitle}>@{username}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color="#F0EEFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={ms(16)}
          color="#888"
          style={{ marginRight: ms(8) }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث…"
          placeholderTextColor="#777"
          style={styles.searchInput}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={ms(16)} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF2D92" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={isFollowers ? "people-outline" : "person-add-outline"}
            size={ms(60)}
            color="#666"
          />
          <Text style={styles.emptyTitle}>
            {isFollowers ? "لا يوجد متابعون بعد" : "لا توجد حسابات تتابعها"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isFollowers
              ? "ستظهر قائمة المتابعين هنا فور قيام أي شخص بمتابعة هذا الحساب."
              : "ابدأ باكتشاف الحسابات وتابع من تحب لمشاهدة محتواه."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: ms(40) + insets.bottom,
            paddingTop: ms(4),
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF2D92"
              colors={["#FF2D92"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
  },
  iconButton: { padding: ms(6) },
  headerTitle: {
    fontSize: fs(17),
    fontWeight: "700",
    color: "#F0EEFF",
  },
  headerSubtitle: {
    fontSize: fs(12),
    color: "#9C95B8",
    marginTop: ms(1),
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: ms(14),
    marginBottom: ms(8),
    paddingHorizontal: ms(12),
    borderRadius: ms(10),
    height: ms(40),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  searchInput: {
    flex: 1,
    color: "#FFF",
    fontSize: fs(14),
    textAlign: "right",
    paddingVertical: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ms(40),
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: "700",
    color: "#F0EEFF",
    marginTop: ms(14),
    marginBottom: ms(6),
  },
  emptySubtitle: {
    fontSize: fs(13),
    color: "#9C95B8",
    textAlign: "center",
    lineHeight: ms(20),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
  },
  avatarWrap: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    overflow: "visible",
  },
  avatar: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    backgroundColor: "#1A1330",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#0A0716",
  },
  middle: {
    flex: 1,
    paddingHorizontal: ms(12),
  },
  nameRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(4),
  },
  username: {
    color: "#F0EEFF",
    fontSize: fs(15),
    fontWeight: "700",
    maxWidth: "75%",
  },
  vipPill: {
    backgroundColor: "rgba(255, 215, 0, 0.16)",
    borderColor: "rgba(255, 215, 0, 0.45)",
    borderWidth: 1,
    paddingHorizontal: ms(6),
    paddingVertical: 1,
    borderRadius: ms(8),
    marginRight: ms(4),
  },
  vipPillText: {
    color: "#FFD700",
    fontSize: fs(10),
    fontWeight: "700",
  },
  handle: {
    color: "#9C95B8",
    fontSize: fs(12),
    marginTop: ms(2),
    textAlign: "right",
  },
  followBtn: {
    backgroundColor: "#FF2D92",
    paddingHorizontal: ms(14),
    paddingVertical: ms(7),
    borderRadius: ms(8),
    minWidth: ms(78),
    alignItems: "center",
  },
  followBtnFollowing: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#FF2D92",
  },
  followBtnText: {
    color: "#FFF",
    fontSize: fs(13),
    fontWeight: "700",
  },
  followBtnTextFollowing: {
    color: "#FF2D92",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: ms(14),
  },
});

export default FollowListScreen;
