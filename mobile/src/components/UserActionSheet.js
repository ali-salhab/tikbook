import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import ProfileBadgeFrame from "./ProfileBadgeFrame";
import { ms, fs } from "../utils/responsive";

/**
 * UserActionSheet
 *
 * A modal "profile card" that appears when tapping a user's avatar inside
 * the live-room comments. Supports the @mention shortcut, follow toggle,
 * and host/moderator-only actions: chat-mute, kick, ban, pin/unpin
 * comment.
 *
 * Props:
 *  - visible              : boolean
 *  - onClose              : () => void
 *  - targetUser           : the user object pulled from the comment
 *  - currentUserId        : viewer's id (so we hide self-only actions)
 *  - userToken            : auth token
 *  - apiBaseUrl           : BASE_URL from config
 *  - roomId               : current live-room id
 *  - isHost / isModerator : permissions for moderation actions
 *  - isMuted              : whether targetUser is currently chat-muted
 *  - canPinThisComment    : true when a comment object was provided
 *  - isThisCommentPinned  : highlight unpin instead of pin
 *  - onMention(username)  : insert @username into input
 *  - onPinComment(item)
 *  - onUnpinComment()
 *  - onChatMuteChanged(userId, muted)
 *  - onKicked(userId)
 *  - onBanned(userId)
 *  - onOpenProfile(userId)
 */
const UserActionSheet = ({
  visible,
  onClose,
  targetUser,
  comment,
  currentUserId,
  userToken,
  apiBaseUrl,
  roomId,
  isHost,
  isModerator,
  isMuted,
  isThisCommentPinned,
  onMention,
  onPinComment,
  onUnpinComment,
  onChatMuteChanged,
  onKicked,
  onBanned,
  onOpenProfile,
}) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const userId = targetUser?._id || targetUser?.id || null;
  const isSelf = userId && userId === currentUserId;
  const isModerationAllowed = (isHost || isModerator) && !isSelf;

  useEffect(() => {
    if (!visible || !userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setProfile(null);
    axios
      .get(`${apiBaseUrl}/users/${userId}`, {
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : {},
      })
      .then((res) => {
        const data = res.data || {};
        setProfile(data);
        setIsFollowing(
          Array.isArray(data.followers)
            ? data.followers
                .map((f) => (typeof f === "object" ? f._id : f))
                .map(String)
                .includes(String(currentUserId))
            : false,
        );
      })
      .catch(() => {
        setProfile({
          _id: userId,
          username: targetUser?.username || "",
          profileImage: targetUser?.profileImage || targetUser?.avatar || null,
          activeBadge: targetUser?.activeBadge || null,
          vipLevel: targetUser?.vipLevel || 0,
          level: targetUser?.level || 0,
          followers: [],
          following: [],
          videosCount: 0,
        });
      })
      .finally(() => setLoading(false));
  }, [visible, userId]);

  const handleFollowToggle = async () => {
    if (!userId || isSelf) return;
    try {
      setBusy(true);
      const headers = { Authorization: `Bearer ${userToken}` };
      if (isFollowing) {
        await axios.put(
          `${apiBaseUrl}/users/${userId}/unfollow`,
          {},
          { headers },
        );
        setIsFollowing(false);
        setProfile((p) =>
          p
            ? {
                ...p,
                followers: (p.followers || []).filter(
                  (f) => String(typeof f === "object" ? f._id : f) !== String(currentUserId),
                ),
              }
            : p,
        );
      } else {
        await axios.put(
          `${apiBaseUrl}/users/${userId}/follow`,
          {},
          { headers },
        );
        setIsFollowing(true);
        setProfile((p) =>
          p
            ? { ...p, followers: [...(p.followers || []), currentUserId] }
            : p,
        );
      }
    } catch (e) {
      Alert.alert(
        "خطأ",
        e?.response?.data?.message || "تعذّر تنفيذ العملية",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleMention = () => {
    if (!profile?.username && !targetUser?.username) return;
    onMention?.(profile?.username || targetUser?.username);
    onClose?.();
  };

  const handleChatMute = async () => {
    if (!userId) return;
    const next = !isMuted;
    try {
      setBusy(true);
      await axios.post(
        `${apiBaseUrl}/live-rooms/${roomId}/chat-mute`,
        { userId, mute: next },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      onChatMuteChanged?.(userId, next);
      onClose?.();
    } catch (e) {
      Alert.alert("خطأ", e?.response?.data?.message || "تعذّر التنفيذ");
    } finally {
      setBusy(false);
    }
  };

  const confirm = (title, message, onConfirm, destructiveText = "تأكيد") =>
    Alert.alert(title, message, [
      { text: "إلغاء", style: "cancel" },
      { text: destructiveText, style: "destructive", onPress: onConfirm },
    ]);

  const handleKick = () => {
    if (!userId) return;
    confirm(
      "طرد المستخدم",
      `هل تريد طرد "${profile?.username || targetUser?.username}" من الغرفة؟`,
      async () => {
        try {
          setBusy(true);
          await axios.post(
            `${apiBaseUrl}/live-rooms/${roomId}/kick`,
            { userId },
            { headers: { Authorization: `Bearer ${userToken}` } },
          );
          onKicked?.(userId);
          onClose?.();
        } catch (e) {
          Alert.alert("خطأ", e?.response?.data?.message || "تعذّر الطرد");
        } finally {
          setBusy(false);
        }
      },
      "طرد",
    );
  };

  const handleBan = () => {
    if (!userId) return;
    confirm(
      "حظر نهائي",
      `هل تريد حظر "${profile?.username || targetUser?.username}" من الغرفة نهائياً؟`,
      async () => {
        try {
          setBusy(true);
          await axios.post(
            `${apiBaseUrl}/live-rooms/${roomId}/ban`,
            { userId },
            { headers: { Authorization: `Bearer ${userToken}` } },
          );
          onBanned?.(userId);
          onClose?.();
        } catch (e) {
          Alert.alert("خطأ", e?.response?.data?.message || "تعذّر الحظر");
        } finally {
          setBusy(false);
        }
      },
      "حظر",
    );
  };

  const handlePin = () => {
    if (isThisCommentPinned) {
      onUnpinComment?.();
    } else if (comment) {
      onPinComment?.(comment);
    }
    onClose?.();
  };

  const followers = profile?.followers?.length ?? 0;
  const following = profile?.following?.length ?? 0;
  const posts = profile?.videosCount ?? 0;
  const vipLevel = Number(profile?.vipLevel ?? targetUser?.vipLevel ?? 0);
  const level = Number(profile?.level ?? targetUser?.level ?? 0);
  const username = profile?.username || targetUser?.username || "";
  const avatarUrl =
    profile?.profileImage ||
    targetUser?.profileImage ||
    targetUser?.avatar ||
    null;
  const badgeUrl =
    profile?.activeBadge?.imageUrl ||
    profile?.activeBadge?.image ||
    targetUser?.activeBadge?.imageUrl ||
    targetUser?.activeBadge?.image ||
    (typeof targetUser?.activeBadge === "string"
      ? targetUser.activeBadge
      : null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.backdrop}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.cardWrap}>
          <LinearGradient
            colors={["#FFE4E1", "#FFD1DC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Top row: dots + mention */}
            <View style={styles.topRow}>
              <View style={styles.posChip}>
                <Text style={styles.posChipText}>1</Text>
              </View>
              <TouchableOpacity
                style={styles.mentionBtn}
                onPress={handleMention}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.mentionText}>@</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {badgeUrl ? (
                <ProfileBadgeFrame
                  profileImage={avatarUrl}
                  badgeImage={badgeUrl}
                  size={ms(82)}
                />
              ) : avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {(username || "?")[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Username */}
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>
                {username || "—"}
              </Text>
              {profile?.isVerified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={fs(15)}
                  color="#1DA1F2"
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{posts}</Text>
                <Text style={styles.statLabel}>منشورات</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{following}</Text>
                <Text style={styles.statLabel}>يتابع</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{followers}</Text>
                <Text style={styles.statLabel}>متابعون</Text>
              </View>
            </View>

            {/* Badges row (level + VIP) */}
            <View style={styles.badgeRow}>
              {level > 0 ? (
                <View style={[styles.badgePill, { backgroundColor: "#FFE9CC" }]}>
                  <MaterialCommunityIcons
                    name="trophy"
                    size={fs(13)}
                    color="#D97706"
                  />
                  <Text style={[styles.badgePillText, { color: "#92400E" }]}>
                    مستوى {level}
                  </Text>
                </View>
              ) : null}
              {vipLevel > 0 ? (
                <View style={[styles.badgePill, { backgroundColor: "#FCE4EC" }]}>
                  <Ionicons
                    name="diamond"
                    size={fs(13)}
                    color="#FF1493"
                  />
                  <Text style={[styles.badgePillText, { color: "#C2185B" }]}>
                    VIP{vipLevel}
                  </Text>
                </View>
              ) : null}
            </View>

            {loading ? (
              <ActivityIndicator
                color="#FF3366"
                style={{ marginTop: ms(10) }}
              />
            ) : null}

            {/* Follow button */}
            {!isSelf && (
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  isFollowing && styles.followingBtn,
                ]}
                onPress={handleFollowToggle}
                disabled={busy}
              >
                <Text
                  style={[
                    styles.followBtnText,
                    isFollowing && styles.followingBtnText,
                  ]}
                >
                  {isFollowing ? "متابَع ✓" : "متابعة"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Open full profile */}
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => {
                onOpenProfile?.(userId);
                onClose?.();
              }}
            >
              <Ionicons name="person-outline" size={fs(14)} color="#666" />
              <Text style={styles.viewProfileText}>عرض الملف الشخصي</Text>
            </TouchableOpacity>

            {/* Host/mod actions */}
            {isModerationAllowed && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionsRow}
              >
                {comment ? (
                  <ActionChip
                    icon={
                      isThisCommentPinned ? "pin-off-outline" : "pin-outline"
                    }
                    label={isThisCommentPinned ? "إلغاء التثبيت" : "تثبيت"}
                    color="#7C5DFA"
                    onPress={handlePin}
                  />
                ) : null}
                <ActionChip
                  icon={
                    isMuted ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
                  }
                  label={isMuted ? "إلغاء كتم الدردشة" : "كتم الدردشة"}
                  color={isMuted ? "#10B981" : "#F59E0B"}
                  onPress={handleChatMute}
                  disabled={busy}
                />
                <ActionChip
                  icon="exit-outline"
                  label="طرد"
                  color="#FF9800"
                  onPress={handleKick}
                  disabled={busy}
                />
                <ActionChip
                  icon="ban-outline"
                  label="حظر"
                  color="#F44336"
                  onPress={handleBan}
                  disabled={busy}
                />
              </ScrollView>
            )}
          </LinearGradient>

          {/* Close */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close-circle" size={fs(28)} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const ActionChip = ({ icon, label, color, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.actionChip, { borderColor: color }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Ionicons name={icon} size={fs(15)} color={color} />
    <Text style={[styles.actionChipText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: ms(18),
  },
  cardWrap: {
    width: "100%",
    maxWidth: ms(360),
  },
  card: {
    borderRadius: ms(20),
    paddingHorizontal: ms(16),
    paddingTop: ms(14),
    paddingBottom: ms(18),
    alignItems: "center",
    overflow: "hidden",
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(8),
  },
  posChip: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: "#FF1B68",
    alignItems: "center",
    justifyContent: "center",
  },
  posChipText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: fs(14),
  },
  mentionBtn: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    borderWidth: 1.5,
    borderColor: "#FF3366",
    alignItems: "center",
    justifyContent: "center",
  },
  mentionText: {
    color: "#FF3366",
    fontWeight: "900",
    fontSize: fs(18),
  },
  avatarWrap: {
    marginVertical: ms(6),
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: ms(82),
    height: ms(82),
    borderRadius: ms(41),
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  avatarFallback: {
    backgroundColor: "rgba(254,44,85,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: fs(32),
    fontWeight: "800",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ms(6),
    paddingHorizontal: ms(8),
    maxWidth: "100%",
  },
  username: {
    color: "#1F1B36",
    fontSize: fs(17),
    fontWeight: "800",
    textAlign: "center",
    maxWidth: ms(220),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginTop: ms(10),
    paddingHorizontal: ms(6),
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: "#1F1B36",
    fontWeight: "800",
    fontSize: fs(16),
  },
  statLabel: {
    color: "#6B6480",
    fontSize: fs(11),
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: ms(8),
    marginTop: ms(10),
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderRadius: ms(12),
  },
  badgePillText: {
    fontSize: fs(11),
    fontWeight: "800",
  },
  followBtn: {
    width: "100%",
    backgroundColor: "#FF3366",
    paddingVertical: ms(11),
    borderRadius: ms(22),
    alignItems: "center",
    marginTop: ms(14),
  },
  followingBtn: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1.2,
    borderColor: "#FF3366",
  },
  followBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: fs(15),
  },
  followingBtnText: {
    color: "#FF3366",
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    marginTop: ms(10),
    paddingVertical: ms(6),
  },
  viewProfileText: {
    color: "#666",
    fontSize: fs(12),
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: ms(8),
    paddingHorizontal: ms(2),
    paddingTop: ms(14),
    paddingBottom: ms(2),
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(5),
    paddingHorizontal: ms(10),
    paddingVertical: ms(7),
    borderRadius: ms(14),
    borderWidth: 1.4,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  actionChipText: {
    fontSize: fs(12),
    fontWeight: "700",
  },
  closeBtn: {
    position: "absolute",
    right: ms(-6),
    top: ms(-12),
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: ms(20),
  },
});

export default UserActionSheet;
