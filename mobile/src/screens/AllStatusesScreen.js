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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { ms, fs } from "../utils/responsive";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";

export default function AllStatusesScreen({ navigation }) {
  const { userToken, userInfo } = useContext(AuthContext);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/status`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setStatuses(res.data || []);
    } catch (_) {}
    setLoading(false);
  }, [userToken]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStatuses();
    setRefreshing(false);
  };

  const openViewer = (index) => {
    navigation.navigate("StatusViewer", {
      statuses,
      initialIndex: index,
    });
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return "منذ لحظات";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  };

  const renderItem = ({ item, index }) => {
    const isOwn = item.user?._id === userInfo?._id;
    return (
      <TouchableOpacity
        style={styles.statusItem}
        onPress={() => openViewer(index)}
        activeOpacity={0.8}
      >
        {/* Thumbnail */}
        <View
          style={[styles.thumb, { backgroundColor: item.bgColor || "#333" }]}
        >
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : item.text ? (
            <Text style={styles.thumbText} numberOfLines={2}>
              {item.text}
            </Text>
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.statusInfo}>
          <View style={styles.statusUserRow}>
            {item.user?.profileImage ? (
              <Image
                source={{ uri: item.user.profileImage }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                <Ionicons name="person" size={14} color="#FFF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.statusUsername}>
                {item.user?.username}
                {isOwn ? " (أنت)" : ""}
              </Text>
              <Text style={styles.statusTime}>
                {getTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
          {item.text ? (
            <Text style={styles.statusPreviewText} numberOfLines={2}>
              {item.text}
            </Text>
          ) : null}
          <View style={styles.statusMeta}>
            <Ionicons name="eye-outline" size={13} color="#888" />
            <Text style={styles.statusMetaText}>{item.views?.length || 0}</Text>
            <Ionicons
              name="chatbubble-outline"
              size={12}
              color="#888"
              style={{ marginLeft: 8 }}
            />
            <Text style={styles.statusMetaText}>
              {item.comments?.length || 0}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>كل الحالات</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
        </View>
      ) : statuses.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>لا توجد حالات حتى الآن</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate("CreateStatus")}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFF" />
            <Text style={styles.createBtnText}>أنشئ حالة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={statuses}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#FF2D92"]}
              tintColor="#FF2D92"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  backBtn: { padding: ms(4) },
  headerTitle: { fontSize: fs(17), fontWeight: "700", color: "#000" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: ms(12),
  },
  emptyText: {
    color: "#888",
    fontSize: fs(16),
    fontWeight: "500",
    textAlign: "center",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    backgroundColor: "#FF2D92",
    paddingHorizontal: ms(20),
    paddingVertical: ms(10),
    borderRadius: ms(24),
    marginTop: ms(8),
  },
  createBtnText: { color: "#FFF", fontWeight: "700", fontSize: fs(14) },
  list: { paddingVertical: ms(8) },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: ms(16),
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    gap: ms(12),
  },
  thumb: {
    width: ms(64),
    height: ms(90),
    borderRadius: ms(10),
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbText: {
    color: "#FFF",
    fontSize: fs(11),
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: ms(4),
  },
  statusInfo: {
    flex: 1,
    gap: ms(4),
  },
  statusUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
  },
  userAvatar: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    borderWidth: 1,
    borderColor: "#EEE",
  },
  userAvatarFallback: {
    backgroundColor: "#888",
    justifyContent: "center",
    alignItems: "center",
  },
  statusUsername: {
    fontSize: fs(14),
    fontWeight: "700",
    color: "#111",
  },
  statusTime: {
    fontSize: fs(12),
    color: "#999",
  },
  statusPreviewText: {
    fontSize: fs(13),
    color: "#555",
    lineHeight: ms(18),
  },
  statusMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(3),
    marginTop: ms(2),
  },
  statusMetaText: { fontSize: fs(12), color: "#888" },
});
