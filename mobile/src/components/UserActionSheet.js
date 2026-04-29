import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import OrnateProfileFrame from "./OrnateProfileFrame";
import { ms, fs, getWindowDimensions } from "../utils/responsive";
import { brandColors, darkUi } from "../theme/brand";

const { height: WINDOW_H } = getWindowDimensions();
const SHEET_MAX_H = WINDOW_H * 0.92;

/**
 * Bottom sheet modal when tapping an avatar in live-room comments.
 * Slides up from bottom, dark blur-style surface, stats, badges, follow, mod actions.
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
  onOpenVipStore,
}) => {
  const insets = useSafeAreaInsets();
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
          p ? { ...p, followers: [...(p.followers || []), currentUserId] } : p,
        );
      }
    } catch (e) {
      Alert.alert("خطأ", e?.response?.data?.message || "تعذّر تنفيذ العملية");
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
    (typeof targetUser?.activeBadge === "string" ? targetUser.activeBadge : null);
  /** إطار الإدارة يحتاج رابط http(s) صالحاً */
  const frameBadgeUrl =
    typeof badgeUrl === "string" && /^https?:\/\//i.test(badgeUrl.trim()) ? badgeUrl.trim() : null;

  const bottomPad = Math.max(insets.bottom, ms(12));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlayRoot}>
        <Pressable style={styles.backdropHit} onPress={onClose} accessibilityRole="button" />

        <View style={[styles.sheetOuter, { maxHeight: SHEET_MAX_H }]}>
          <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[darkUi.elevated, darkUi.surface, darkUi.surfaceMuted]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.sheetTint}
          />
          {/* drag handle */}
          <View style={styles.grabber} />

          {/* Close */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.sheetCloseBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={fs(26)} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sheetScroll, { paddingBottom: bottomPad + ms(12) }]}
          >
            {/* Top row — menu + mention */}
            <View style={styles.topRow}>
              <TouchableOpacity
                style={styles.iconCircle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() =>
                  Alert.alert("خيارات", "مزيد من الإجراءات قريباً.", [{ text: "حسناً" }])
                }
              >
                <MaterialCommunityIcons name="dots-vertical" size={fs(22)} color="#EEE" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconCircle, styles.iconCircleAccent]}
                onPress={handleMention}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.mentionGlyph}>@</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar — ornate gold frame + level orb + VIP ribbon (reference layout) */}
            <View style={styles.avatarSlot}>
              <OrnateProfileFrame
                avatarUrl={avatarUrl || undefined}
                badgeUrl={frameBadgeUrl || undefined}
                profileImageUri={avatarUrl || undefined}
                username={username}
                level={level}
                vipLevel={vipLevel}
                innerSize={ms(88)}
              />
            </View>

            {/* Name */}
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={2}>
                {username || "—"}
              </Text>
              {profile?.isVerified ? (
                <Ionicons name="checkmark-circle" size={fs(17)} color="#33CCFF" style={{ marginLeft: ms(6) }} />
              ) : null}
            </View>

            {/* Bio */}
            {!!profile?.bio && (
              <Text style={styles.bioText} numberOfLines={3}>
                {profile.bio}
              </Text>
            )}

            {/* Stats */}
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

            {/* Badge cards — spaced matching sheet */}
            <View style={styles.badgeCardsRow}>
              <View style={[styles.badgeCard, styles.badgeCardAmber]}>
                <View style={styles.badgeCardIconWrap}>
                  <MaterialCommunityIcons name="trophy" size={fs(24)} color="#FBBF24" />
                </View>
                <Text style={[styles.badgeCardVal, { color: "#FCD34D" }]}>
                  {level > 0 ? String(level) : "—"}
                </Text>
                <Text style={styles.badgeCardLbl}>المستوى</Text>
              </View>
              <View style={[styles.badgeCard, styles.badgeCardRose]}>
                <View style={styles.badgeCardIconWrap}>
                  <Ionicons name="diamond" size={fs(22)} color="#FDA4AF" />
                </View>
                <Text style={[styles.badgeCardVal, { color: "#FFF" }]}>
                  {vipLevel > 0 ? `VIP${vipLevel}` : "—"}
                </Text>
                <Text style={styles.badgeCardLbl}>VIP</Text>
              </View>
              <TouchableOpacity
                style={[styles.badgeCard, styles.badgeCardVip]}
                activeOpacity={0.85}
                onPress={() => {
                  if (typeof onOpenVipStore === "function") {
                    onClose?.();
                    onOpenVipStore();
                  } else {
                    Alert.alert("VIP", "تأكد من تحديث التطبيق.");
                  }
                }}
              >
                <View style={styles.badgeCardIconWrap}>
                  <Ionicons name="wallet-outline" size={fs(22)} color="#FBBF24" />
                </View>
                <Text style={[styles.badgeCardVal, styles.badgeCardVipText]} numberOfLines={1}>
                  VIP
                </Text>
                <Text style={[styles.badgeCardLbl, { marginTop: 2 }]}>شحن VIP</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={brandColors.accent} style={{ marginTop: ms(12) }} />
            ) : null}

            {/* Follow */}
            {!isSelf && (
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={handleFollowToggle}
                disabled={busy}
              >
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? "متابَع ✓" : "متابعة"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Full profile */}
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => {
                onOpenProfile?.(userId);
                onClose?.();
              }}
            >
              <Ionicons name="person-outline" size={fs(16)} color="#EDEAF8" />
              <Text style={styles.viewProfileText}>عرض الملف الشخصي</Text>
            </TouchableOpacity>

            {/* Mod actions */}
            {isModerationAllowed && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionsRow}
              >
                {comment ? (
                  <ActionChip
                    icon={isThisCommentPinned ? "pin-off-outline" : "pin-outline"}
                    label={isThisCommentPinned ? "إلغاء التثبيت" : "تثبيت"}
                    color="#A78BFA"
                    onPress={handlePin}
                  />
                ) : null}
                <ActionChip
                  icon={isMuted ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                  label={isMuted ? "رفع الكتم من الدردشة" : "كتم الدردشة"}
                  color={isMuted ? "#34D399" : "#FBBF24"}
                  onPress={handleChatMute}
                  disabled={busy}
                />
                <ActionChip icon="exit-outline" label="طرد" color="#FB923C" onPress={handleKick} disabled={busy} />
                <ActionChip icon="ban-outline" label="حظر" color="#F87171" onPress={handleBan} disabled={busy} />
              </ScrollView>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const ActionChip = ({ icon, label, color, onPress, disabled }) => (
  <TouchableOpacity style={[styles.actionChip, { borderColor: color }]} onPress={onPress} disabled={disabled}>
    <Ionicons name={icon} size={fs(15)} color={color} />
    <Text style={[styles.actionChipText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  backdropHit: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetOuter: {
    width: "100%",
    borderTopLeftRadius: ms(22),
    borderTopRightRadius: ms(22),
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: darkUi.surfaceMuted,
  },
  sheetTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.92,
  },
  grabber: {
    alignSelf: "center",
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: "rgba(255,255,255,0.28)",
    marginTop: ms(10),
    marginBottom: ms(4),
  },
  sheetCloseBtn: {
    position: "absolute",
    right: ms(14),
    top: ms(44),
    zIndex: 20,
    padding: ms(8),
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: ms(22),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sheetScroll: {
    paddingHorizontal: ms(18),
    paddingTop: ms(8),
    maxWidth: 520,
    alignSelf: "center",
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ms(4),
    width: "100%",
  },
  iconCircle: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(21),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconCircleAccent: {
    borderColor: `${brandColors.accent}55`,
    backgroundColor: "rgba(255,51,102,0.08)",
  },
  mentionGlyph: {
    color: brandColors.accent,
    fontWeight: "900",
    fontSize: fs(22),
    marginBottom: ms(3),
  },
  avatarSlot: {
    alignItems: "center",
    marginTop: ms(8),
    marginBottom: ms(22),
    paddingBottom: ms(6),
    width: "100%",
    alignSelf: "center",
    overflow: "visible",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: ms(4),
    paddingHorizontal: ms(4),
    width: "100%",
  },
  username: {
    color: "#F0EEFF",
    fontSize: fs(17),
    fontWeight: "800",
    textAlign: "center",
    maxWidth: "95%",
    lineHeight: fs(23),
  },
  bioText: {
    marginTop: ms(8),
    color: "#B8B0D8",
    fontSize: fs(13),
    lineHeight: fs(19),
    textAlign: "center",
    alignSelf: "center",
    maxWidth: "95%",
    paddingHorizontal: ms(8),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginTop: ms(16),
    paddingHorizontal: ms(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
    paddingBottom: ms(14),
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: fs(17),
  },
  statLabel: {
    color: "#958BA8",
    fontSize: fs(11),
    marginTop: ms(4),
  },
  badgeCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: ms(14),
    marginTop: ms(18),
    width: "100%",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    paddingHorizontal: ms(6),
  },
  badgeCardIconWrap: {
    width: ms(44),
    height: ms(44),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(4),
  },
  badgeCard: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: ms(112),
    minWidth: ms(92),
    borderRadius: ms(14),
    paddingHorizontal: ms(10),
    paddingVertical: ms(14),
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  badgeCardAmber: {
    borderColor: "rgba(251,191,36,0.4)",
    backgroundColor: "rgba(251,191,36,0.08)",
    gap: ms(6),
  },
  badgeCardRose: {
    borderColor: `${brandColors.accent}44`,
    backgroundColor: "rgba(255,51,102,0.06)",
    gap: ms(6),
  },
  badgeCardVip: {
    borderColor: "rgba(251,191,36,0.45)",
    backgroundColor: "rgba(251,191,36,0.07)",
    gap: ms(4),
  },
  badgeCardVal: {
    fontSize: fs(17),
    fontWeight: "900",
    marginTop: ms(4),
  },
  badgeCardVipText: {
    color: "#FBBF24",
    fontSize: fs(13),
    marginTop: ms(6),
    fontWeight: "800",
  },
  badgeCardLbl: {
    color: "#B8B0D8",
    fontSize: fs(11),
    fontWeight: "600",
    textAlign: "center",
  },
  followBtn: {
    width: "100%",
    backgroundColor: "#EA580C",
    paddingVertical: ms(13),
    borderRadius: ms(14),
    alignItems: "center",
    marginTop: ms(18),
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: ms(2),
    borderColor: `${brandColors.accent}BB`,
    shadowOpacity: 0,
  },
  followBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: fs(16),
    letterSpacing: 0.3,
  },
  followingBtnText: {
    color: brandColors.accent,
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(6),
    marginTop: ms(12),
    paddingVertical: ms(8),
  },
  viewProfileText: {
    color: "#EDEAF8",
    fontSize: fs(14),
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: ms(10),
    paddingTop: ms(16),
    paddingBottom: ms(10),
    paddingHorizontal: ms(4),
    flexGrow: 1,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(5),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderRadius: ms(14),
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    maxWidth: 180,
    flexShrink: 0,
  },
  actionChipText: {
    fontSize: fs(11),
    fontWeight: "700",
    flexShrink: 1,
  },
});

export default UserActionSheet;
