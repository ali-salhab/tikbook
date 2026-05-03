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
  /** إطار الملف الشخصي من مستوى VIP (لوحة الإدارة) عند عدم وجود شارة شخصية */
  vipTierFrameUrl,
  /** مضيف/مشرف: دعوة المستخدم إلى مقعد المتحدثين (يربطه الأب بالـ socket) */
  onInviteToSeat,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const userId = targetUser?._id || targetUser?.id || null;
  const isSelf =
    userId != null &&
    currentUserId != null &&
    String(userId) === String(currentUserId);
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
  const tierFrameStr =
    typeof vipTierFrameUrl === "string" ? vipTierFrameUrl.trim() : "";
  /** شارة المستخدم أو إطار VIP من الإعدادات — يظهر الإطار حول الصورة */
  const ornamentBadgeUrl =
    frameBadgeUrl || (tierFrameStr.length > 4 ? tierFrameStr : null);

  const bottomPad = Math.max(insets.bottom, ms(8));

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
            <Ionicons name="close" size={fs(22)} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sheetScroll, { paddingBottom: bottomPad + ms(2) }]}
          >
            <Text style={styles.sheetKicker}>عضو في الغرفة</Text>

            {/* Avatar — إطار كامل من الشارة أو إطار VIP */}
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.02)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.avatarSlot}>
                <OrnateProfileFrame
                  avatarUrl={avatarUrl || undefined}
                  badgeUrl={ornamentBadgeUrl || undefined}
                  profileImageUri={avatarUrl || undefined}
                  username={username}
                  level={level}
                  vipLevel={vipLevel}
                  innerSize={ms(76)}
                />
              </View>
            </View>

            {/* Name */}
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={2}>
                {username || "—"}
              </Text>
              {profile?.isVerified ? (
                <Ionicons name="checkmark-circle" size={fs(12)} color="rgba(160,150,220,0.95)" style={{ marginLeft: ms(3) }} />
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
                  <MaterialCommunityIcons name="trophy" size={fs(18)} color="rgba(200,175,120,0.95)" />
                </View>
                <Text style={[styles.badgeCardVal, { color: "rgba(220,200,150,0.98)" }]}>
                  {level > 0 ? String(level) : "—"}
                </Text>
                <Text style={styles.badgeCardLbl}>المستوى</Text>
              </View>
              <View style={[styles.badgeCard, styles.badgeCardRose]}>
                <View style={styles.badgeCardIconWrap}>
                  <Ionicons name="diamond" size={fs(17)} color="rgba(180,165,220,0.95)" />
                </View>
                <Text style={[styles.badgeCardVal, { color: "rgba(235,230,250,0.98)" }]}>
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
                  <Ionicons name="wallet-outline" size={fs(17)} color="rgba(200,175,120,0.95)" />
                </View>
                <Text style={[styles.badgeCardVal, styles.badgeCardVipText]} numberOfLines={1}>
                  VIP
                </Text>
                <Text style={[styles.badgeCardLbl, { marginTop: 2 }]}>شحن VIP</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={brandColors.accent} style={{ marginTop: ms(8) }} />
            ) : null}

            {/* إجراءات سريعة — ذكر + دعوة مقعد (للمشرفين عند توفر الدالة) */}
            {!isSelf && (
              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={styles.quickBtnMention}
                  onPress={handleMention}
                  activeOpacity={0.88}
                >
                  <View style={styles.quickBtnIconWrap}>
                    <Ionicons name="at" size={fs(13)} color="rgba(170,155,220,0.95)" />
                  </View>
                  <Text style={styles.quickBtnMentionText} numberOfLines={1}>
                    ذكر في التعليق
                  </Text>
                </TouchableOpacity>
                {onInviteToSeat ? (
                  <TouchableOpacity
                    style={styles.quickBtnInvite}
                    onPress={onInviteToSeat}
                    activeOpacity={0.88}
                  >
                    <View style={styles.quickBtnIconWrapInvite}>
                      <Ionicons name="mic" size={fs(13)} color="rgba(120,175,150,0.95)" />
                    </View>
                    <Text style={styles.quickBtnInviteText} numberOfLines={1}>
                      دعوة للمقعد
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

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
              <Ionicons name="person-outline" size={fs(14)} color="rgba(210,200,235,0.9)" />
              <Text style={styles.viewProfileText}>عرض الملف الشخصي</Text>
            </TouchableOpacity>

            {/* إدارة الغرفة — شبكة أوضح للمضيف/المشرف */}
            {isModerationAllowed && (
              <View style={styles.modSection}>
                <Text style={styles.modSectionTitle}>إدارة الغرفة</Text>
                <View style={styles.modGrid}>
                  {comment ? (
                    <ModActionButton
                      icon={isThisCommentPinned ? "pin-off-outline" : "pin-outline"}
                      label={isThisCommentPinned ? "إلغاء تثبيت" : "تثبيت"}
                      color="#9D8BC9"
                      onPress={handlePin}
                    />
                  ) : (
                    <View style={styles.modCellSpacer} />
                  )}
                  <ModActionButton
                    icon={isMuted ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                    label={isMuted ? "رفع الكتم" : "كتم"}
                    color={isMuted ? "#8FB8A8" : "#C9A87A"}
                    onPress={handleChatMute}
                    disabled={busy}
                  />
                  <ModActionButton icon="exit-outline" label="طرد" color="#C49A6C" onPress={handleKick} disabled={busy} />
                  <ModActionButton icon="ban-outline" label="حظر" color="#B87A8A" onPress={handleBan} disabled={busy} />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const ModActionButton = ({ icon, label, color, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.modActionBtn, { borderColor: `${color}55` }]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.88}
  >
    <Ionicons name={icon} size={fs(15)} color={color} />
    <Text style={[styles.modActionLabel, { color }]} numberOfLines={2}>
      {label}
    </Text>
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
    borderTopLeftRadius: ms(18),
    borderTopRightRadius: ms(18),
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
    width: ms(36),
    height: ms(3),
    borderRadius: ms(2),
    backgroundColor: "rgba(255,255,255,0.2)",
    marginTop: ms(6),
    marginBottom: ms(2),
  },
  sheetCloseBtn: {
    position: "absolute",
    right: ms(10),
    top: ms(36),
    zIndex: 20,
    padding: ms(5),
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: ms(18),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  sheetScroll: {
    paddingHorizontal: ms(14),
    paddingTop: ms(0),
    maxWidth: 520,
    alignSelf: "center",
    width: "100%",
  },
  sheetKicker: {
    textAlign: "center",
    color: "rgba(255,255,255,0.38)",
    fontSize: fs(10),
    fontWeight: "600",
    marginBottom: 0,
    letterSpacing: 0.2,
  },
  heroCard: {
    marginTop: ms(2),
    marginBottom: ms(4),
    borderRadius: ms(16),
    paddingVertical: ms(10),
    paddingHorizontal: ms(8),
    overflow: "visible",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(12,10,22,0.5)",
    position: "relative",
  },
  avatarSlot: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: ms(2),
    marginBottom: ms(2),
    paddingBottom: ms(2),
    width: "100%",
    alignSelf: "center",
    overflow: "visible",
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ms(6),
    marginTop: ms(8),
    marginBottom: ms(2),
    width: "100%",
    justifyContent: "center",
  },
  quickBtnMention: {
    flexGrow: 1,
    flexBasis: ms(120),
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(5),
    paddingVertical: ms(7),
    paddingHorizontal: ms(8),
    borderRadius: ms(10),
    backgroundColor: "rgba(102,51,255,0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(167,139,250,0.28)",
  },
  quickBtnInvite: {
    flexGrow: 1,
    flexBasis: ms(120),
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(5),
    paddingVertical: ms(7),
    paddingHorizontal: ms(8),
    borderRadius: ms(10),
    backgroundColor: "rgba(45,90,75,0.2)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(100,180,150,0.3)",
  },
  quickBtnIconWrap: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(7),
    backgroundColor: "rgba(102,51,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickBtnIconWrapInvite: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(7),
    backgroundColor: "rgba(60,120,95,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickBtnMentionText: {
    color: "rgba(230,225,255,0.95)",
    fontWeight: "700",
    fontSize: fs(11),
    flexShrink: 1,
  },
  quickBtnInviteText: {
    color: "rgba(200,230,215,0.95)",
    fontWeight: "700",
    fontSize: fs(11),
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: ms(2),
    paddingHorizontal: ms(2),
    width: "100%",
  },
  username: {
    color: "#EDEAF8",
    fontSize: fs(15),
    fontWeight: "700",
    textAlign: "center",
    maxWidth: "95%",
    lineHeight: fs(20),
  },
  bioText: {
    marginTop: ms(4),
    color: "rgba(180,172,210,0.92)",
    fontSize: fs(11),
    lineHeight: fs(16),
    textAlign: "center",
    alignSelf: "center",
    maxWidth: "95%",
    paddingHorizontal: ms(4),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginTop: ms(8),
    paddingHorizontal: ms(2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
    paddingBottom: ms(8),
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: "#F4F2FA",
    fontWeight: "700",
    fontSize: fs(14),
  },
  statLabel: {
    color: "rgba(150,140,180,0.95)",
    fontSize: fs(9),
    marginTop: ms(2),
  },
  badgeCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: ms(6),
    marginTop: ms(10),
    width: "100%",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    paddingHorizontal: ms(2),
  },
  badgeCardIconWrap: {
    width: ms(28),
    height: ms(28),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ms(2),
  },
  badgeCard: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: ms(76),
    minWidth: 0,
    borderRadius: ms(11),
    paddingHorizontal: ms(6),
    paddingVertical: ms(8),
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  badgeCardAmber: {
    borderColor: "rgba(200,170,90,0.35)",
    backgroundColor: "rgba(200,170,90,0.06)",
    gap: ms(3),
  },
  badgeCardRose: {
    borderColor: "rgba(130,110,200,0.4)",
    backgroundColor: "rgba(102,51,255,0.07)",
    gap: ms(3),
  },
  badgeCardVip: {
    borderColor: "rgba(180,160,100,0.35)",
    backgroundColor: "rgba(180,160,100,0.06)",
    gap: ms(3),
  },
  badgeCardVal: {
    fontSize: fs(13),
    fontWeight: "800",
    marginTop: ms(2),
  },
  badgeCardVipText: {
    color: "rgba(230,200,120,0.95)",
    fontSize: fs(11),
    marginTop: ms(3),
    fontWeight: "700",
  },
  badgeCardLbl: {
    color: "rgba(160,152,190,0.95)",
    fontSize: fs(9),
    fontWeight: "600",
    textAlign: "center",
  },
  followBtn: {
    width: "100%",
    backgroundColor: "rgba(102,51,255,0.35)",
    paddingVertical: ms(9),
    borderRadius: ms(11),
    alignItems: "center",
    marginTop: ms(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(140,120,220,0.45)",
  },
  followingBtn: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  followBtnText: {
    color: "#F5F3FF",
    fontWeight: "700",
    fontSize: fs(13),
    letterSpacing: 0.2,
  },
  followingBtnText: {
    color: "rgba(230,210,255,0.95)",
  },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(4),
    marginTop: ms(6),
    paddingVertical: ms(4),
  },
  viewProfileText: {
    color: "rgba(200,192,230,0.95)",
    fontSize: fs(12),
    fontWeight: "600",
  },
  modSection: {
    marginTop: ms(10),
    paddingTop: ms(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.07)",
    width: "100%",
  },
  modSectionTitle: {
    color: "rgba(255,255,255,0.42)",
    fontSize: fs(10),
    fontWeight: "700",
    marginBottom: ms(6),
    letterSpacing: 0.3,
    textAlign: "right",
    writingDirection: "rtl",
  },
  modGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: ms(6),
    width: "100%",
  },
  modActionBtn: {
    width: "48%",
    minHeight: ms(64),
    borderRadius: ms(11),
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: ms(6),
    paddingHorizontal: ms(4),
    alignItems: "center",
    justifyContent: "center",
    gap: ms(3),
  },
  modActionLabel: {
    fontSize: fs(10),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: fs(13),
    paddingHorizontal: ms(2),
  },
  modCellSpacer: {
    width: "48%",
    minHeight: 0,
  },
});

export default UserActionSheet;
