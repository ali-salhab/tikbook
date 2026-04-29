/**
 * VipProfileScreen — Shows the current user's VIP level benefits page,
 * matching the design in the screenshot (dark card list, Lottie animations).
 *
 * Route params (optional):
 *   level {number} — which VIP level to display. Defaults to the user's own level.
 */

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { AuthContext } from "../context/AuthContext";
import { vipService } from "../services/vipService";
import { ms, fs, getWindowDimensions } from "../utils/responsive";

const { width } = getWindowDimensions();

// Gradient map for each VIP level (same as VipStoreScreen)
const VIP_GRADIENT = {
  1:  ["#3D1A00", "#B8651A"],   2:  ["#1A1A2E", "#3A3A5C"],
  3:  ["#4A3500", "#F0C040"],   4:  ["#2D0E4E", "#6633FF"],
  5:  ["#4A1E00", "#F59E42"],   6:  ["#2D0744", "#C026D3"],
  7:  ["#4A0000", "#EF4444"],   8:  ["#3C0000", "#B91C1C"],
  9:  ["#033526", "#34D399"],   10: ["#0A2540", "#60A5FA"],
  11: ["#0D1520", "#475569"],   12: ["#042418", "#2DD4BF"],
  13: ["#3D2500", "#FBBF24"],   14: ["#3A1000", "#EA580C"],
  15: ["#3D2C00", "#FCD34D"],
};

// Icon per benefit type
const BENEFIT_TYPE_ICON = {
  badge:  { name: "shield-checkmark-outline", color: "#60A5FA" },
  frame:  { name: "person-circle-outline",    color: "#A78BFA" },
  chat:   { name: "chatbubble-ellipses-outline", color: "#34D399" },
  points: { name: "star-outline",             color: "#FBBF24" },
  medal:  { name: "medal-outline",            color: "#F59E42" },
  entry:  { name: "sparkles-outline",         color: "#EC4899" },
  other:  { name: "gift-outline",             color: "#94A3B8" },
};

// ------------------------------------------------------------------
// Small component: renders either a Lottie animation or a static image
// for a benefit's preview icon (70×70 square).
// ------------------------------------------------------------------
const BenefitMedia = ({ lottieUrl, imageUrl, size = 70, color = "#6366f1" }) => {
  const [lottieData, setLottieData] = useState(null);
  const [loadingLottie, setLoadingLottie] = useState(false);

  useEffect(() => {
    if (!lottieUrl) return;
    setLoadingLottie(true);
    fetch(lottieUrl)
      .then((r) => r.json())
      .then((json) => { setLottieData(json); setLoadingLottie(false); })
      .catch(() => setLoadingLottie(false));
  }, [lottieUrl]);

  if (lottieUrl && lottieData) {
    return (
      <LottieView
        source={lottieData}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />
    );
  }
  if (loadingLottie) {
    return (
      <View style={[styles.mediaBox, { width: size, height: size, backgroundColor: color + "22" }]}>
        <ActivityIndicator size="small" color={color} />
      </View>
    );
  }
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.mediaBox, { width: size, height: size }]}
        resizeMode="contain"
      />
    );
  }
  // Fallback placeholder
  return (
    <View style={[styles.mediaBox, { width: size, height: size, backgroundColor: color + "22" }]}>
      <Ionicons name="gift-outline" size={ms(28)} color={color} />
    </View>
  );
};

// ------------------------------------------------------------------
// Main badge in the header — Lottie or image for the level icon
// ------------------------------------------------------------------
const LevelBadge = ({ lottieUrl, imageUrl, level, color }) => {
  const [lottieData, setLottieData] = useState(null);

  useEffect(() => {
    if (!lottieUrl) return;
    fetch(lottieUrl)
      .then((r) => r.json())
      .then(setLottieData)
      .catch(() => {});
  }, [lottieUrl]);

  if (lottieUrl && lottieData) {
    return (
      <LottieView
        source={lottieData}
        autoPlay
        loop
        style={{ width: ms(120), height: ms(120) }}
      />
    );
  }
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.headerBadgeImg}
        resizeMode="contain"
      />
    );
  }
  // Fallback crown icon
  return (
    <View style={[styles.headerBadgeFallback, { borderColor: color }]}>
      <MaterialCommunityIcons name="crown" size={ms(52)} color={color} />
    </View>
  );
};

// ------------------------------------------------------------------
// Main Screen
// ------------------------------------------------------------------
export default function VipProfileScreen({ navigation, route }) {
  const { userToken, userInfo } = useContext(AuthContext);
  const levelParam = route?.params?.level ?? null;

  const [levelData, setLevelData] = useState(null);
  const [myVipLevel, setMyVipLevel] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [levelsRes, vipRes] = await Promise.all([
        vipService.getAllLevels(),
        vipService.getMyVip(userToken),
      ]);
      const allLevels = levelsRes.levels || [];
      const userLevel = vipRes.vipLevel || 0;
      setMyVipLevel(userLevel);
      // Which level to show: param > user's current level > level 1 fallback
      const targetLevel = levelParam ?? (userLevel > 0 ? userLevel : 1);
      const found = allLevels.find((l) => l.level === targetLevel) || allLevels[0];
      setLevelData(found);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <LottieView
          source={require("../../assets/lottie-loader.json")}
          style={{ width: 80, height: 80 }}
          autoPlay
          loop
        />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  if (!levelData) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <MaterialCommunityIcons name="crown-outline" size={60} color="#334155" />
        <Text style={{ color: "#94A3B8", fontSize: fs(14), marginTop: ms(10) }}>
          لا توجد بيانات VIP
        </Text>
      </View>
    );
  }

  const grad = VIP_GRADIENT[levelData.level] || ["#1A1A2E", "#2D2D4E"];
  const color = levelData.color || "#FFD700";
  const owned = myVipLevel >= levelData.level;
  const benefits = Array.isArray(levelData.benefits)
    ? levelData.benefits.filter((b) => b.isVisible !== false)
    : [];
  const customFeatures = Array.isArray(levelData.customFeatures)
    ? levelData.customFeatures.filter((cf) => cf.isVisible !== false)
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0A0A18", "#12071F", "#0A0A18"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header bar ─────────────────────────────────────────── */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rechargeBtn}
            onPress={() => navigation.navigate("VipStore")}
          >
            <Text style={styles.rechargeBtnText}>شحن VIP</Text>
            <Ionicons name="chevron-forward" size={14} color="#FBBF24" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: ms(40) }}>
          {/* ── VIP badge hero card ─────────────────────────────── */}
          <LinearGradient
            colors={[grad[0] + "EE", grad[1] + "CC", grad[0] + "AA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Left info column (RTL: visually right) */}
            <View style={styles.heroInfo}>
              {/* VIP level label */}
              <Text style={[styles.vipBigLabel, { color }]}>VIP{levelData.level}</Text>

              {/* Owned/locked chip */}
              <View style={[styles.statusChip, { borderColor: owned ? "#4ADE80" : "#64748B" }]}>
                {owned ? (
                  <>
                    <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
                    <Text style={[styles.statusChipText, { color: "#4ADE80" }]}>مفعّل</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={11} color="#94A3B8" />
                    <Text style={[styles.statusChipText, { color: "#94A3B8" }]}>مقفل</Text>
                  </>
                )}
              </View>
            </View>

            {/* Right: badge image/lottie (RTL: visually left) */}
            <View style={styles.heroBadgeWrap}>
              <LevelBadge
                lottieUrl={levelData.badgeLottieUrl}
                imageUrl={levelData.imageUrl || levelData.badgeImageUrl}
                level={levelData.level}
                color={color}
              />
            </View>
          </LinearGradient>

          {/* ── Username row ───────────────────────────────────── */}
          <View style={styles.usernameCard}>
            {userInfo?.profileImage ? (
              <Image
                source={{ uri: userInfo.profileImage }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={[styles.avatarFallback, { borderColor: color }]}>
                <Ionicons name="person" size={ms(16)} color={color} />
              </View>
            )}
            <Text style={styles.username}>{userInfo?.username || "..."}</Text>
            <View style={[styles.vipMiniChip, { backgroundColor: color + "33", borderColor: color + "66" }]}>
              <Text style={[styles.vipMiniChipText, { color }]}>VIP{levelData.level}</Text>
            </View>
          </View>

          {/* ── Invite friends banner ──────────────────────────────── */}
          <TouchableOpacity style={styles.inviteBanner} activeOpacity={0.8}>
            <Text style={styles.inviteEmoji}>📅</Text>
            <Text style={styles.inviteText}>
              ادعو أصدقائك واكسب المكافآت بلا حدود
            </Text>
            <Ionicons name="chevron-back" size={14} color="#94A3B8" />
          </TouchableOpacity>

          {/* ── Benefits section ───────────────────────────────────── */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsSectionTitle}>
              مكافأة المستوى {levelData.level} لـVIP
            </Text>

            {benefits.length === 0 ? (
              // Default built-in benefits if none configured
              <DefaultBenefits level={levelData.level} color={color} owned={owned} />
            ) : (
              benefits
                .slice()
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                .map((benefit, idx) => {
                  const isUnlocked = owned && !benefit.isLocked;
                  const typeIcon = BENEFIT_TYPE_ICON[benefit.type] || BENEFIT_TYPE_ICON.other;
                  return (
                    <View key={idx} style={styles.benefitRow}>
                      {/* Left: media preview */}
                      <View style={styles.benefitMediaWrap}>
                        <BenefitMedia
                          lottieUrl={benefit.lottieUrl}
                          imageUrl={benefit.imageUrl}
                          size={ms(70)}
                          color={typeIcon.color}
                        />
                      </View>

                      {/* Center: text */}
                      <View style={styles.benefitTextWrap}>
                        <Text style={styles.benefitTitle}>{benefit.titleAr}</Text>
                        {benefit.descriptionAr ? (
                          <Text style={styles.benefitDesc}>{benefit.descriptionAr}</Text>
                        ) : null}
                      </View>

                      {/* Right: lock/unlock icon */}
                      <View style={styles.benefitLockWrap}>
                        {isUnlocked ? (
                          <Ionicons name="lock-open-outline" size={ms(18)} color="#4ADE80" />
                        ) : (
                          <Ionicons name="lock-closed-outline" size={ms(18)} color="#475569" />
                        )}
                      </View>
                    </View>
                  );
                })
            )}
            {/* Custom admin-defined features */}
            {customFeatures
              .slice()
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((cf, idx) => (
                <View key={`cf-${idx}`} style={styles.benefitRow}>
                  <View style={[styles.benefitMediaWrap, { justifyContent: "center", alignItems: "center" }]}>
                    <View style={{ width: ms(70), height: ms(70), borderRadius: ms(14), backgroundColor: color + "22", justifyContent: "center", alignItems: "center" }}>
                      <Text style={{ fontSize: ms(32) }}>{cf.icon || "🎁"}</Text>
                    </View>
                  </View>
                  <View style={styles.benefitTextWrap}>
                    <Text style={styles.benefitTitle}>{cf.titleAr}</Text>
                    {cf.title ? <Text style={styles.benefitDesc}>{cf.title}</Text> : null}
                  </View>
                  <View style={styles.benefitLockWrap}>
                    {owned ? (
                      <Ionicons name="lock-open-outline" size={ms(18)} color="#4ADE80" />
                    ) : (
                      <Ionicons name="lock-closed-outline" size={ms(18)} color="#475569" />
                    )}
                  </View>
                </View>
              ))
            }
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ------------------------------------------------------------------
// Fallback benefits list when the admin hasn't configured any yet
// ------------------------------------------------------------------
function DefaultBenefits({ level, color, owned }) {
  const defaults = [
    {
      titleAr: "زخرفة بطاقة البيانات",
      descriptionAr: "زخرفة بطاقة المعلومات الشخصية. كلما ارتفع المستوى، زاد ثراء الزخرفة.",
      type: "badge", isLocked: !owned,
    },
    {
      titleAr: "إطار الصورة الرمزية للمستوى VIP",
      descriptionAr: "",
      type: "frame", isLocked: false,
    },
    {
      titleAr: "فقاعة الدردشة للمستوى VIP",
      descriptionAr: "",
      type: "chat", isLocked: false,
    },
    {
      titleAr: "النقاط الأساسية",
      descriptionAr: "سيتم الحصول على نقاط على نقاط المستوى المقابلة بعد الهبوط التالية وفق مستوى الشهر الماضي.",
      type: "points", isLocked: !owned,
    },
    {
      titleAr: "وسام المستوى VIP",
      descriptionAr: "",
      type: "medal", isLocked: !owned,
    },
  ];

  const typeIcon = (type) => BENEFIT_TYPE_ICON[type] || BENEFIT_TYPE_ICON.other;

  return (
    <>
      {defaults.map((b, idx) => {
        const isUnlocked = !b.isLocked;
        const ti = typeIcon(b.type);
        return (
          <View key={idx} style={styles.benefitRow}>
            <View style={[styles.benefitMediaWrap, { backgroundColor: ti.color + "22" }]}>
              <Ionicons name={ti.name} size={ms(30)} color={ti.color} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>{b.titleAr}</Text>
              {b.descriptionAr ? (
                <Text style={styles.benefitDesc}>{b.descriptionAr}</Text>
              ) : null}
            </View>
            <View style={styles.benefitLockWrap}>
              {isUnlocked ? (
                <Ionicons name="lock-open-outline" size={ms(18)} color="#4ADE80" />
              ) : (
                <Ionicons name="lock-closed-outline" size={ms(18)} color="#475569" />
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A18",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A18",
    justifyContent: "center",
    alignItems: "center",
    gap: ms(12),
  },
  loadingText: {
    color: "#475569",
    fontSize: fs(13),
  },

  // Header bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
  },
  backBtn: {
    padding: ms(4),
  },
  rechargeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    backgroundColor: "rgba(251,191,36,0.12)",
    borderRadius: ms(14),
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  rechargeBtnText: {
    color: "#FBBF24",
    fontSize: fs(12),
    fontWeight: "bold",
  },

  // Hero card (side by side)
  heroCard: {
    marginHorizontal: ms(16),
    marginBottom: ms(10),
    borderRadius: ms(20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(20),
    paddingVertical: ms(18),
    marginTop: ms(4),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroInfo: {
    flex: 1,
    alignItems: "flex-end",
    gap: ms(8),
  },
  heroBadgeWrap: {
    marginLeft: ms(12),
  },
  vipBigLabel: {
    fontSize: fs(32),
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  headerBadgeImg: {
    width: ms(110),
    height: ms(110),
  },
  headerBadgeFallback: {
    width: ms(110),
    height: ms(110),
    borderRadius: ms(55),
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(5),
    borderWidth: 1,
    borderRadius: ms(12),
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  statusChipText: {
    fontSize: fs(11),
    fontWeight: "bold",
  },
  // Username card below hero
  usernameCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: ms(16),
    marginBottom: ms(14),
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ms(12),
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    gap: ms(10),
  },
  avatarImg: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
  },
  avatarFallback: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  vipMiniChip: {
    borderWidth: 1,
    borderRadius: ms(8),
    paddingHorizontal: ms(7),
    paddingVertical: ms(2),
  },
  vipMiniChipText: {
    fontSize: fs(9),
    fontWeight: "bold",
  },
  username: {
    color: "#E2E8F0",
    fontSize: fs(15),
    fontWeight: "bold",
  },

  // Invite banner
  inviteBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
    marginHorizontal: ms(16),
    marginBottom: ms(20),
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ms(12),
    paddingHorizontal: ms(14),
    paddingVertical: ms(12),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inviteEmoji: {
    fontSize: fs(18),
  },
  inviteText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: fs(12),
    textAlign: "right",
  },

  // Benefits section
  benefitsSection: {
    paddingHorizontal: ms(16),
  },
  benefitsSectionTitle: {
    color: "#F1F5F9",
    fontSize: fs(15),
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: ms(12),
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ms(14),
    marginBottom: ms(10),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    paddingRight: ms(12),
  },
  benefitMediaWrap: {
    width: ms(72),
    height: ms(72),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  mediaBox: {
    borderRadius: ms(10),
    justifyContent: "center",
    alignItems: "center",
  },
  benefitTextWrap: {
    flex: 1,
    paddingHorizontal: ms(12),
    paddingVertical: ms(12),
    alignItems: "flex-end",
  },
  benefitTitle: {
    color: "#F1F5F9",
    fontSize: fs(13),
    fontWeight: "bold",
    textAlign: "right",
  },
  benefitDesc: {
    color: "#94A3B8",
    fontSize: fs(10),
    textAlign: "right",
    marginTop: ms(4),
    lineHeight: ms(15),
  },
  benefitLockWrap: {
    marginLeft: ms(4),
  },
});
