import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BASE_URL } from "../config/api";

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "settings", label: "إعدادات", icon: "settings-outline" },
  { id: "users", label: "المستخدمون", icon: "people-outline" },
  { id: "banned", label: "المحظورون", icon: "ban-outline" },
];

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────

const SettingsTab = ({ room, roomId, userToken, onSaved, fetchRoomData }) => {
  const [title, setTitle] = useState(room?.title || "");
  const [description, setDescription] = useState(room?.description || "");
  const [maxSpeakers, setMaxSpeakers] = useState(room?.maxSpeakers ?? 8);
  const [isPrivate, setIsPrivate] = useState(room?.isPrivate ?? false);
  const [canChat, setCanChat] = useState(room?.permissions?.canChat ?? true);
  const [canSendGifts, setCanSendGifts] = useState(room?.permissions?.canSendGifts ?? true);
  const [requestToSpeak, setRequestToSpeak] = useState(room?.permissions?.requestToSpeak ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (room) {
      setTitle(room.title || "");
      setDescription(room.description || "");
      setMaxSpeakers(room.maxSpeakers ?? 8);
      setIsPrivate(room.isPrivate ?? false);
      setCanChat(room.permissions?.canChat ?? true);
      setCanSendGifts(room.permissions?.canSendGifts ?? true);
      setRequestToSpeak(room.permissions?.requestToSpeak ?? false);
    }
  }, [room]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("خطأ", "عنوان الغرفة مطلوب");
      return;
    }
    setSaving(true);
    try {
      await axios.patch(
        `${BASE_URL}/live-rooms/${roomId}/settings`,
        {
          title: title.trim(),
          description: description.trim(),
          maxSpeakers,
          isPrivate,
          permissions: { canChat, canSendGifts, requestToSpeak },
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      // Directly refresh room data so the seat grid updates immediately
      fetchRoomData?.();
      onSaved?.();
      Alert.alert("تم", "تم حفظ الإعدادات بنجاح");
    } catch (e) {
      Alert.alert("خطأ", e?.response?.data?.message || "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const SeatButton = ({ value }) => (
    <TouchableOpacity
      style={[styles.seatBtn, maxSpeakers === value && styles.seatBtnActive]}
      onPress={() => setMaxSpeakers(value)}
    >
      <Text style={[styles.seatBtnText, maxSpeakers === value && styles.seatBtnTextActive]}>
        {value}
      </Text>
    </TouchableOpacity>
  );

  const ToggleRow = ({ label, icon, value, onChange }) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Ionicons name={icon} size={20} color="#aaa" style={styles.toggleIcon} />
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#333", true: "#FE2C55" }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>عنوان الغرفة</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="اكتب عنوان الغرفة…"
        placeholderTextColor="#555"
        maxLength={60}
      />

      <Text style={styles.sectionTitle}>الوصف</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="وصف اختياري…"
        placeholderTextColor="#555"
        multiline
        numberOfLines={3}
        maxLength={200}
      />

      <Text style={styles.sectionTitle}>عدد المقاعد ({maxSpeakers})</Text>
      <View style={styles.seatGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => (
          <SeatButton key={v} value={v} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>الخصوصية والأذونات</Text>
      <ToggleRow label="غرفة خاصة" icon="lock-closed-outline" value={isPrivate} onChange={setIsPrivate} />
      <ToggleRow label="السماح بالدردشة" icon="chatbubble-outline" value={canChat} onChange={setCanChat} />
      <ToggleRow label="السماح بالهدايا" icon="gift-outline" value={canSendGifts} onChange={setCanSendGifts} />
      <ToggleRow label="طلب للتحدث" icon="hand-left-outline" value={requestToSpeak} onChange={setRequestToSpeak} />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>حفظ الإعدادات</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

// ─── USERS TAB ────────────────────────────────────────────────────────────────

const UsersTab = ({ room, roomId, userToken, currentUserId, isHost, onChanged }) => {
  const [loading, setLoading] = useState(false);

  const moderatorIds = new Set((room?.moderators || []).map((m) => m.user?._id || m.user?.toString()));

  const participants = [
    ...(room?.speakers || []).map((s) => ({ ...s, role: "متحدث" })),
    ...(room?.listeners || []).map((l) => ({ ...l, role: "مستمع" })),
  ];

  const hostId = room?.host?._id;

  const handleKick = (userId, username) => {
    Alert.alert("طرد المستخدم", `هل تريد طرد "${username}" من الغرفة؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "طرد",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await axios.post(
              `${BASE_URL}/live-rooms/${roomId}/kick`,
              { userId },
              { headers: { Authorization: `Bearer ${userToken}` } },
            );
            onChanged?.();
          } catch (e) {
            Alert.alert("خطأ", e?.response?.data?.message || "تعذّر الطرد");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleBan = (userId, username) => {
    Alert.alert("حظر المستخدم", `هل تريد حظر "${username}" من الغرفة؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حظر",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await axios.post(
              `${BASE_URL}/live-rooms/${roomId}/ban`,
              { userId },
              { headers: { Authorization: `Bearer ${userToken}` } },
            );
            onChanged?.();
          } catch (e) {
            Alert.alert("خطأ", e?.response?.data?.message || "تعذّر الحظر");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleToggleModerator = (userId, username, isMod) => {
    const action = isMod ? "إزالة صلاحيات" : "تعيين كمشرف";
    const endpoint = isMod ? "remove-moderator" : "assign-moderator";
    Alert.alert(
      `${action}`,
      `هل تريد ${action} "${username}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: action,
          onPress: async () => {
            setLoading(true);
            try {
              await axios.post(
                `${BASE_URL}/live-rooms/${roomId}/${endpoint}`,
                { userId },
                { headers: { Authorization: `Bearer ${userToken}` } },
              );
              onChanged?.();
            } catch (e) {
              Alert.alert("خطأ", e?.response?.data?.message || "تعذّر تغيير الصلاحية");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const user = item.user;
    if (!user) return null;
    const isCurrentUser = user._id === currentUserId;
    const isRoomHost = user._id === hostId;
    const isModerator = moderatorIds.has(user._id);

    return (
      <View style={styles.userRow}>
        <View style={styles.userAvatar}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person" size={22} color="#666" />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.username || user.name}
            {isRoomHost ? " 👑" : isModerator ? " 🛡️" : ""}
          </Text>
          <Text style={styles.userRole}>
            {isRoomHost ? "صاحب الغرفة" : isModerator ? "مشرف" : item.role}
          </Text>
        </View>
        {isHost && !isCurrentUser && !isRoomHost && (
          <View style={styles.userActions}>
            {/* Promote / Demote moderator */}
            <TouchableOpacity
              style={[styles.actionBtn, isModerator && styles.actionBtnActive]}
              onPress={() => handleToggleModerator(user._id, user.username, isModerator)}
              disabled={loading}
            >
              <Ionicons
                name={isModerator ? "shield" : "shield-outline"}
                size={19}
                color={isModerator ? "#FE2C55" : "#aaa"}
              />
            </TouchableOpacity>
            {/* Kick */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleKick(user._id, user.username)}
              disabled={loading}
            >
              <Ionicons name="exit-outline" size={19} color="#FF9800" />
            </TouchableOpacity>
            {/* Ban */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleBan(user._id, user.username)}
              disabled={loading}
            >
              <Ionicons name="ban-outline" size={19} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={participants}
      keyExtractor={(item, idx) => item.user?._id || String(idx)}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد مستخدمون</Text>}
    />
  );
};

// ─── BANNED TAB ───────────────────────────────────────────────────────────────

const BannedTab = ({ room, roomId, userToken, isHost, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const banned = room?.bannedUsers || [];

  const handleUnban = (userId, username) => {
    Alert.alert("إلغاء الحظر", `هل تريد رفع الحظر عن "${username}"?`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "رفع الحظر",
        onPress: async () => {
          setLoading(true);
          try {
            await axios.post(
              `${BASE_URL}/live-rooms/${roomId}/unban`,
              { userId },
              { headers: { Authorization: `Bearer ${userToken}` } },
            );
            onChanged?.();
          } catch (e) {
            Alert.alert("خطأ", e?.response?.data?.message || "تعذّر رفع الحظر");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const user = item.user;
    if (!user) return null;

    return (
      <View style={styles.userRow}>
        <View style={[styles.userAvatar, styles.bannedAvatar]}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
          ) : (
            <Ionicons name="person" size={22} color="#F44336" />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{user.username || user.name}</Text>
          {item.reason ? (
            <Text style={styles.banReason} numberOfLines={1}>{item.reason}</Text>
          ) : (
            <Text style={styles.userRole}>محظور</Text>
          )}
        </View>
        {isHost && (
          <TouchableOpacity
            style={styles.unbanBtn}
            onPress={() => handleUnban(user._id, user.username)}
            disabled={loading}
          >
            <Text style={styles.unbanBtnText}>رفع الحظر</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={banned}
      keyExtractor={(item, idx) => item.user?._id || String(idx)}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={<Text style={styles.emptyText}>لا يوجد محظورون</Text>}
    />
  );
};

// ─── MAIN MODAL ───────────────────────────────────────────────────────────────

const RoomManagementModal = ({
  visible,
  onClose,
  room,
  roomId,
  isHost,
  userToken,
  currentUserId,
  fetchRoomData,
}) => {
  const [activeTab, setActiveTab] = useState("settings");

  const onChanged = () => {
    fetchRoomData?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>إدارة الغرفة</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#aaa" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? "#FE2C55" : "#666"}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === "settings" && (
            <SettingsTab
              room={room}
              roomId={roomId}
              userToken={userToken}
              onSaved={onChanged}
              fetchRoomData={fetchRoomData}
            />
          )}
          {activeTab === "users" && (
            <UsersTab
              room={room}
              roomId={roomId}
              userToken={userToken}
              currentUserId={currentUserId}
              isHost={isHost}
              onChanged={onChanged}
            />
          )}
          {activeTab === "banned" && (
            <BannedTab
              room={room}
              roomId={roomId}
              userToken={userToken}
              isHost={isHost}
              onChanged={onChanged}
            />
          )}
        </View>
      </View>
      </View>
    </Modal>
  );
};

export default RoomManagementModal;

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "85%",
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#444",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 4,
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#FE2C55",
  },
  tabText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#FE2C55",
    fontWeight: "bold",
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  sectionTitle: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  seatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  seatBtn: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  seatBtnActive: {
    backgroundColor: "#FE2C55",
    borderColor: "#FE2C55",
  },
  seatBtnText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  seatBtnTextActive: {
    color: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleLabel: {
    color: "#ddd",
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 24,
    marginBottom: 12,
    backgroundColor: "#FE2C55",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // ── User rows ─────────────────────────────────────────────────────────────
  listContent: {
    padding: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  bannedAvatar: {
    backgroundColor: "#2a1010",
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  userRole: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
  },
  banReason: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 2,
  },
  userActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
  },
  actionBtnActive: {
    backgroundColor: "rgba(254,44,85,0.15)",
  },
  unbanBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#1e3a2a",
  },
  unbanBtnText: {
    color: "#4CAF50",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    color: "#555",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
});
