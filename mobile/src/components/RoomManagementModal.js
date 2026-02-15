import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const RoomManagementModal = ({
  visible,
  onClose,
  participants,
  moderators,
  bannedUsers,
  isHost,
  currentUserId,
  onKickUser,
  onBanUser,
  onUnbanUser,
  onAssignModerator,
  onRemoveModerator,
}) => {
  const [activeTab, setActiveTab] = useState("participants"); // participants, moderators, banned
  const [banReason, setBanReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  const isModerator = (userId) => {
    return moderators?.some((m) => m.user._id === userId);
  };

  const handleKick = (userId) => {
    Alert.alert("طرد المستخدم", "هل أنت متأكد من طرد هذا المستخدم من الغرفة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "طرد",
        style: "destructive",
        onPress: () => onKickUser(userId),
      },
    ]);
  };

  const handleBan = (userId) => {
    setSelectedUserId(userId);
    Alert.prompt(
      "حظر المستخدم",
      "اكتب سبب الحظر (اختياري):",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حظر",
          style: "destructive",
          onPress: (reason) => {
            onBanUser(userId, reason || "");
            setBanReason("");
          },
        },
      ],
      "plain-text",
    );
  };

  const handleUnban = (userId) => {
    Alert.alert("إلغاء الحظر", "هل تريد إلغاء حظر هذا المستخدم؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "إلغاء الحظر",
        onPress: () => onUnbanUser(userId),
      },
    ]);
  };

  const handleToggleModerator = (userId) => {
    if (isModerator(userId)) {
      Alert.alert(
        "إزالة المسؤول",
        "هل تريد إزالة صلاحيات المسؤول من هذا المستخدم؟",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "إزالة",
            style: "destructive",
            onPress: () => onRemoveModerator(userId),
          },
        ],
      );
    } else {
      Alert.alert("تعيين كمسؤول", "هل تريد تعيين هذا المستخدم كمسؤول؟", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تعيين",
          onPress: () => onAssignModerator(userId),
        },
      ]);
    }
  };

  const renderParticipantItem = ({ item }) => {
    const participant = item.user;
    const isCurrentUser = participant._id === currentUserId;
    const isModeratorUser = isModerator(participant._id);

    return (
      <View style={styles.participantItem}>
        <View style={styles.participantInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#666" />
          </View>
          <View style={styles.participantText}>
            <Text style={styles.participantName} numberOfLines={1}>
              {participant.username}
              {isModeratorUser && " 👑"}
            </Text>
            <Text style={styles.participantType}>
              {item.type === "speaker" ? "متحدث" : "مستمع"}
            </Text>
          </View>
        </View>

        {!isCurrentUser && isHost && (
          <View style={styles.participantActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleToggleModerator(participant._id)}
            >
              <Ionicons
                name={isModeratorUser ? "shield" : "shield-outline"}
                size={20}
                color={isModeratorUser ? "#FFD700" : "#666"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleKick(participant._id)}
            >
              <Ionicons name="exit-outline" size={20} color="#FF9800" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleBan(participant._id)}
            >
              <Ionicons name="ban-outline" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderModeratorItem = ({ item }) => {
    const moderator = item.user;

    return (
      <View style={styles.participantItem}>
        <View style={styles.participantInfo}>
          <View style={[styles.avatar, styles.moderatorAvatar]}>
            <Ionicons name="shield" size={24} color="#FFD700" />
          </View>
          <View style={styles.participantText}>
            <Text style={styles.participantName} numberOfLines={1}>
              {moderator.username}
            </Text>
            <Text style={styles.participantType}>مسؤول</Text>
          </View>
        </View>

        {isHost && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemoveModerator(moderator._id)}
          >
            <Text style={styles.removeButtonText}>إزالة</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBannedItem = ({ item }) => {
    const banned = item.user;

    return (
      <View style={styles.participantItem}>
        <View style={styles.participantInfo}>
          <View style={[styles.avatar, styles.bannedAvatar]}>
            <Ionicons name="ban" size={24} color="#F44336" />
          </View>
          <View style={styles.participantText}>
            <Text style={styles.participantName} numberOfLines={1}>
              {banned.username}
            </Text>
            {item.reason && (
              <Text style={styles.banReason} numberOfLines={1}>
                {item.reason}
              </Text>
            )}
          </View>
        </View>

        {isHost && (
          <TouchableOpacity
            style={styles.unbanButton}
            onPress={() => handleUnban(banned._id)}
          >
            <Text style={styles.unbanButtonText}>إلغاء الحظر</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const getTabData = () => {
    switch (activeTab) {
      case "participants":
        return participants || [];
      case "moderators":
        return moderators || [];
      case "banned":
        return bannedUsers || [];
      default:
        return [];
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>إدارة الغرفة</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "participants" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("participants")}
            >
              <Ionicons
                name="people"
                size={20}
                color={activeTab === "participants" ? "#FE2C55" : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "participants" && styles.activeTabText,
                ]}
              >
                المشاركين ({participants?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "moderators" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("moderators")}
            >
              <Ionicons
                name="shield"
                size={20}
                color={activeTab === "moderators" ? "#FE2C55" : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "moderators" && styles.activeTabText,
                ]}
              >
                المسؤولين ({moderators?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "banned" && styles.activeTab]}
              onPress={() => setActiveTab("banned")}
            >
              <Ionicons
                name="ban"
                size={20}
                color={activeTab === "banned" ? "#FE2C55" : "#666"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "banned" && styles.activeTabText,
                ]}
              >
                المحظورين ({bannedUsers?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={getTabData()}
            keyExtractor={(item) => item.user?._id || item._id}
            renderItem={
              activeTab === "participants"
                ? renderParticipantItem
                : activeTab === "moderators"
                  ? renderModeratorItem
                  : renderBannedItem
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>لا يوجد</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#FE2C55",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FE2C55",
    fontWeight: "bold",
  },
  list: {
    padding: 16,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  moderatorAvatar: {
    backgroundColor: "#FFF8DC",
  },
  bannedAvatar: {
    backgroundColor: "#FFEBEE",
  },
  participantText: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  participantType: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  banReason: {
    fontSize: 12,
    color: "#F44336",
    marginTop: 2,
  },
  participantActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FE2C55",
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  unbanButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
  },
  unbanButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
});

export default RoomManagementModal;
