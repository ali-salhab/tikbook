/**
 * LevelScreen — dynamic levels screen.
 * Design matches the reference screenshot: dark navy gradient, horizontal
 * level tabs, hero card with floating badge, rewards list below.
 * All data fetched from the backend — admin controls everything.
 */

import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import { ms, fs } from "../utils/responsive";
import { fetchLottieJson, getCachedLottieJson } from "../live/services/lottieCache";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";

const { width } = Dimensions.get("window");

// ─── Color helpers ────────────────────────────────────────────────────────────
const hexToRgb = (hex = "#1e40af") => {
  try {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return { r, g, b };
  } catch {
    return { r: 30, g: 64, b: 175 };
  }
};

/** Dark bg gradient derived from the level accent color */
const makeBgGradient = (color = "#60A5FA") => {
  const { r, g, b } = hexToRgb(color);
  return [
    `rgb(${Math.max(2, Math.round(r * 0.04))}, ${Math.max(2, Math.round(g * 0.06))}, ${Math.max(10, Math.round(b * 0.12))})`,
    `rgb(${Math.max(4, Math.round(r * 0.06))}, ${Math.max(5, Math.round(g * 0.10))}, ${Math.max(16, Math.round(b * 0.18))})`,
    `rgb(${Math.max(2, Math.round(r * 0.04))}, ${Math.max(2, Math.round(g * 0.06))}, ${Math.max(10, Math.round(b * 0.12))})`,
  ];
};

/** Card gradient derived from level color */
const makeCardGradient = (color = "#60A5FA") => {
  const { r, g, b } = hexToRgb(color);
  return [
    `rgb(${Math.max(7, Math.round(r * 0.16))}, ${Math.max(18, Math.round(g * 0.22))}, ${Math.max(40, Math.round(b * 0.42))})`,
    `rgb(${Math.max(10, Math.round(r * 0.24))}, ${Math.max(28, Math.round(g * 0.34))}, ${Math.max(60, Math.round(b * 0.60))})`,
    `rgb(${Math.max(7, Math.round(r * 0.16))}, ${Math.max(18, Math.round(g * 0.22))}, ${Math.max(40, Math.round(b * 0.42))})`,
  ];
};

// ─── Remote Lottie hook ───────────────────────────────────────────────────────
const useRemoteLottie = (url) => {
  const [json, setJson] = useState(() => (url ? getCachedLottieJson(url) : null));
  useEffect(() => {
    let active = true;
    if (!url) { setJson(null); return; }
    const cached = getCachedLottieJson(url);
    if (cached) { setJson(cached); return; }
    fetchLottieJson(url)
      .then((data) => { if (active && data) setJson(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [url]);
  return json;
};

// ─── Level badge (tab + hero) ─────────────────────────────────────────────────
const LevelBadge = ({ level, size }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Static image takes priority for the badge display (set by admin in imageUrl/badgeImageUrl)
  const imgUri = level?.badgeImageUrl || level?.imageUrl;
  // Lottie is used ONLY when there is no static image available
  const lottieJson = useRemoteLottie(imgUri ? null : level?.badgeLottieUrl);
  const color = level?.color || "#60A5FA";

  // Fallback (numeric) shown while loading or when nothing is set
  const Fallback = (
    <View style={[styles.fallbackBadge, { width: size, height: size, borderColor: color, backgroundColor: color + "22" }]}>
      <Text style={[styles.fallbackNum, { color, fontSize: size * 0.38 }]}>{level?.level ?? "?"}</Text>
    </View>
  );

  // If we have a static image URL — show it, keep fallback visible until loaded
  if (imgUri && !imgError) {
    return (
      <View style={{ width: size, height: size }}>
        {!imgLoaded && Fallback}
        <Image
          source={{ uri: imgUri }}
          style={{ width: size, height: size, position: imgLoaded ? "relative" : "absolute", opacity: imgLoaded ? 1 : 0 }}
          resizeMode="contain"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  // If no image but lottie available
  if (lottieJson) {
    return <LottieView source={lottieJson} autoPlay loop style={{ width: size, height: size }} />;
  }

  // Numeric fallback
  return Fallback;
};

// ─── Feature list meta ───────────────────────────────────────────────────────
const FEATURE_LIST = [
  { key: "animatedCommentFrame", label: "إطار تعليق متحرك",   icon: "chatbubble-ellipses-outline" },
  { key: "coloredUsername",      label: "اسم ملون",               icon: "color-palette-outline" },
  { key: "specialBadge",         label: "شارة خاصة",             icon: "shield-checkmark-outline" },
  { key: "specialJoinAnimation", label: "انيميشن دخول خاص", icon: "sparkles-outline" },
];

// ─── Reward row ─────────────────────────────────────────────────────────────────────────
const RewardRow = ({ benefit, level, accentColor }) => {
  const [benefitImgLoaded, setBenefitImgLoaded] = useState(false);
  const [levelImgLoaded, setLevelImgLoaded] = useState(false);
  const benefitHasImg = !!benefit?.imageUrl;
  const lottieJson = useRemoteLottie(benefitHasImg ? null : benefit?.lottieUrl);
  const borderColor = accentColor + "55";
  const iconBg = accentColor + "1A";
  const iconBorder = accentColor + "44";

  const renderIcon = () => {
    // 1. Frame-type benefit — render as ProfileBadgeFrame preview (frame over a circle)
    if (benefit?.type === "frame" && benefit?.imageUrl) {
      return (
        <ProfileBadgeFrame
          badgeImage={benefit.imageUrl}
          size={ms(34)}
        />
      );
    }
    // 2. Other benefit images
    if (benefit?.imageUrl) {
      return (
        <View style={{ width: ms(38), height: ms(38) }}>
          {!benefitImgLoaded && (
            <Ionicons name="sparkles-outline" size={ms(22)} color={accentColor} style={{ position: "absolute", alignSelf: "center", top: ms(8) }} />
          )}
          <Image
            source={{ uri: benefit.imageUrl }}
            style={{ width: ms(38), height: ms(38), opacity: benefitImgLoaded ? 1 : 0 }}
            resizeMode="contain"
            onLoad={() => setBenefitImgLoaded(true)}
          />
        </View>
      );
    }
    // 2. Benefit's own Lottie
    if (lottieJson) {
      return <LottieView source={lottieJson} autoPlay loop style={{ width: ms(38), height: ms(38) }} />;
    }
    // 3. Level badge image
    const lvlImg = level?.badgeImageUrl || level?.imageUrl;
    if (lvlImg) {
      return (
        <View style={{ width: ms(38), height: ms(38) }}>
          {!levelImgLoaded && (
            <Ionicons name="medal-outline" size={ms(22)} color={accentColor} style={{ position: "absolute", alignSelf: "center", top: ms(8) }} />
          )}
          <Image
            source={{ uri: lvlImg }}
            style={{ width: ms(38), height: ms(38), opacity: levelImgLoaded ? 1 : 0 }}
            resizeMode="contain"
            onLoad={() => setLevelImgLoaded(true)}
          />
        </View>
      );
    }
    // 4. Icon fallback
    const ICONS = { badge:"shield-checkmark-outline",frame:"person-circle-outline",chat:"chatbubble-ellipses-outline",points:"star-outline",medal:"medal-outline",entry:"rocket-outline",other:"sparkles-outline" };
    return <Ionicons name={ICONS[benefit?.type] || ICONS.other} size={ms(22)} color={accentColor} />;
  };

  return (
    <View style={[styles.rewardRow, { borderColor, opacity: benefit?.isLocked ? 0.55 : 1 }]}>
      <View style={[styles.rewardIconBox, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        {renderIcon()}
        {benefit?.isLocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={ms(13)} color="#FFF" />
          </View>
        )}
      </View>
      <View style={styles.rewardTexts}>
        <Text style={styles.rewardTitle}>{benefit?.titleAr || benefit?.title || "ميزة"}</Text>
        {(benefit?.descriptionAr || benefit?.description) ? (
          <Text style={styles.rewardSubtitle}>{benefit?.descriptionAr || benefit?.description}</Text>
        ) : null}
      </View>
      {benefit?.isLocked && (
        <Ionicons name="lock-closed" size={ms(16)} color="rgba(255,255,255,0.35)" />
      )}
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LevelScreen({ navigation, route }) {
  const { userInfo, refreshUserInfo } = useContext(AuthContext);
  const initialLevelNum = route?.params?.level ?? null;

  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const tabListRef = useRef(null);

  const fetchLevels = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${BASE_URL}/vip/levels`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = (data.levels || []).filter((l) => l.isActive !== false);
      if (list.length === 0) throw new Error("no_levels");
      setLevels(list);
      setError(null);
      const target = initialLevelNum ?? userInfo?.vipLevel ?? list[0].level;
      const idx = list.findIndex((l) => l.level === target);
      setSelectedIdx(idx >= 0 ? idx : 0);
    } catch (e) {
      clearTimeout(timer);
      if (e.name === "AbortError") {
        setError("انتهت مهلة الاتصال، يرجى إعادة المحاولة.");
      } else if (e.message === "no_levels") {
        setError("لا توجد مستويات حالياً.");
      } else {
        setError("تعذّر تحميل المستويات.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLevelNum]);

  // Fetch fresh user data to sync vipLevel from server
  useEffect(() => {
    refreshUserInfo?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch once on mount; re-select tab when userInfo.vipLevel becomes available
  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  useEffect(() => {
    if (levels.length === 0) return;
    const target = initialLevelNum ?? userInfo?.vipLevel ?? levels[0].level;
    const idx = levels.findIndex((l) => l.level === target);
    if (idx >= 0) setSelectedIdx(idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.vipLevel]);

  const onRefresh = () => { setRefreshing(true); fetchLevels(true); };

  const selectLevel = (idx) => {
    setSelectedIdx(idx);
    tabListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
  };

  const sel = levels[selectedIdx] || null;
  const accent = sel?.color || "#60A5FA";
  const bgGradient = sel ? makeBgGradient(accent) : ["#020A1A", "#04152E", "#03101F"];
  const cardGradient = sel ? makeCardGradient(accent) : ["#07254A", "#0E3F7A", "#092E5C"];
  const borderColor = accent + "80";
  const rewards = (sel?.benefits || [])
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Loading screen
  if (loading) {
    return (
      <LinearGradient colors={["#020A1A","#04152E","#020A1A"]} style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.center]} edges={["top"]}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={styles.loadingText}>جارٍ التحميل…</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Error screen
  if (error || levels.length === 0) {
    return (
      <LinearGradient colors={["#020A1A","#04152E","#020A1A"]} style={styles.root}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={ms(26)} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>المستويات</Text>
            <View style={{ width: ms(40) }} />
          </View>
          <View style={[styles.safe, styles.center, { paddingHorizontal: ms(24) }]}>
            <Ionicons name="alert-circle-outline" size={ms(52)} color="#60A5FA" />
            <Text style={[styles.loadingText, { marginTop: ms(12) }]}>{error || "لا توجد مستويات حالياً"}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchLevels()}>
              <Text style={{ color: "#60A5FA", fontWeight: "700", fontSize: fs(14) }}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={bgGradient} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>

        {/* ── Header ── */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(26)} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>المستويات</Text>
          <View style={{ width: ms(40) }} />
        </View>

        {/* ── Level tabs ── */}
        <FlatList
          ref={tabListRef}
          data={levels}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.level)}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={styles.tabsContainer}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item, index }) => {
            const isSelected = index === selectedIdx;
            const tabColor = item.color || "#60A5FA";
            return (
              <TouchableOpacity
                style={[
                  styles.levelTab,
                  isSelected && {
                    backgroundColor: tabColor + "26",
                    borderColor: tabColor + "99",
                    shadowColor: tabColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 14,
                    elevation: 10,
                  },
                ]}
                onPress={() => selectLevel(index)}
                activeOpacity={0.8}
              >
                <View style={styles.tabIconWrapper}>
                  <LevelBadge level={item} size={isSelected ? ms(62) : ms(50)} />
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />}
        >
          {/* ── Hero card ── */}
          <LinearGradient
            colors={cardGradient}
            style={[styles.heroCard, { borderColor }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardRow}>
              {/* Text — takes remaining space */}
              <View style={styles.cardTexts}>
                {(userInfo?.vipLevel ?? 0) === sel?.level && (
                  <View style={[styles.currentTag, { backgroundColor: accent + "33", borderColor: accent }]}>
                    <Ionicons name="checkmark-circle" size={ms(13)} color={accent} />
                    <Text style={[styles.currentTagText, { color: accent }]}>مستواك الحالي</Text>
                  </View>
                )}
                <Text style={styles.heroTitle}>
                  {sel?.nameAr || sel?.name || `المستوى ${sel?.level}`}
                </Text>
                <Text style={[styles.heroDesc, { color: accent + "DD" }]}>
                  {sel?.description || "أرسل هدية لإعادة تفعيل مكافآتك"}
                </Text>
                {/* Price */}
                {sel?.price > 0 && (
                  <View style={[styles.priceChip, { backgroundColor: accent + "22", borderColor: accent + "66" }]}>
                    <Ionicons name="logo-bitcoin" size={ms(13)} color={accent} />
                    <Text style={[styles.priceText, { color: accent }]}>{sel.price} عملة</Text>
                  </View>
                )}
              </View>
              {/* Badge — right side */}
              <View style={styles.heroBadgeWrap}>
                <LevelBadge level={sel} size={ms(102)} />
              </View>
            </View>
            {/* Special join text */}
            {!!sel?.specialJoinText && (
              <View style={[styles.joinTextRow, { borderTopColor: accent + "33" }]}>
                <Ionicons name="megaphone-outline" size={ms(14)} color={accent} />
                <Text style={[styles.joinText, { color: accent + "EE" }]}>{sel.specialJoinText}</Text>
              </View>
            )}
          </LinearGradient>

          {/* ── Features ── */}
          {sel?.features && (
            <View style={[styles.featuresCard, { borderColor: accent + "33" }]}>
              <Text style={[styles.featuresSectionTitle, { color: accent }]}>✨ الخصائص</Text>
              <View style={styles.featuresGrid}>
                {FEATURE_LIST.map((f) => {
                  const enabled = sel?.features?.[f.key];
                  return (
                    <View key={f.key} style={[styles.featureItem, { borderColor: enabled ? accent + "55" : "rgba(255,255,255,0.08)" }]}>
                      <Ionicons
                        name={enabled ? f.icon : f.icon}
                        size={ms(18)}
                        color={enabled ? accent : "rgba(255,255,255,0.22)"}
                      />
                      <Text style={[styles.featureLabel, { color: enabled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)" }]}>
                        {f.label}
                      </Text>
                      <Ionicons
                        name={enabled ? "checkmark-circle" : "close-circle"}
                        size={ms(13)}
                        color={enabled ? accent : "rgba(255,255,255,0.18)"}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Username color preview ── */}
          {sel?.usernameColor && (
            <View style={[styles.usernamePreviewRow, { borderColor: accent + "33" }]}>
              <View style={styles.usernamePreviewLeft}>
                <Ionicons name="at-outline" size={ms(16)} color={accent} />
                <Text style={styles.usernamePreviewLabel}>لون اسم المستخدم</Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: sel.usernameColor }]} />
            </View>
          )}

          {/* ── Rewards ── */}
          <Text style={styles.sectionTitle}>المكافآت</Text>

          {rewards.length === 0 ? (
            <View style={[styles.emptyRewards, { borderColor: accent + "33" }]}>
              <Ionicons name="gift-outline" size={ms(32)} color={accent + "88"} />
              <Text style={[styles.emptyText, { color: accent + "88" }]}>لا توجد مكافآت بعد</Text>
              <Text style={styles.emptyHint}>يمكن للأدمن إضافة مكافآت لهذا المستوى</Text>
            </View>
          ) : (
            <View style={styles.rewardsList}>
              {rewards.map((benefit, idx) => (
                <RewardRow
                  key={benefit._id || idx}
                  benefit={benefit}
                  level={sel}
                  accentColor={accent}
                />
              ))}
            </View>
          )}

          <View style={{ height: ms(40) }} />
          
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, justifyContent: "flex-start" },
  center: { justifyContent: "center", alignItems: "center" },

  // ── Header ──
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
  },
  backBtn: {
    width: ms(40), height: ms(40),
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: {
    fontSize: fs(18), fontWeight: "bold", color: "#6f6e6e",
  },

  // ── Tabs ──
  tabsContainer: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(4),
    gap: ms(10),
    alignItems: "center",
  },
  levelTab: {
    borderRadius: ms(14),
    // backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    width: ms(88),
    height: ms(88),
  },
  tabIconWrapper: {
    width: ms(64), height: ms(64),
    alignItems: "center", justifyContent: "center",
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: ms(16),
    paddingTop: ms(4),
  },

  // ── Hero card ──
  heroCard: {
    borderRadius: ms(14),
    borderWidth: 1,
    marginBottom: ms(14),
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(18),
    paddingHorizontal: ms(16),
    gap: ms(10),
  },
  cardTexts: { flex: 1, alignItems: "flex-end" },
  heroBadgeWrap: {
    width: ms(110),
    height: ms(110),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  currentTag: {
    flexDirection: "row", alignItems: "center", gap: ms(4),
    borderWidth: 1, borderRadius: ms(20),
    paddingHorizontal: ms(8), paddingVertical: ms(3),
    marginBottom: ms(6), alignSelf: "flex-end",
  },
  currentTagText: { fontSize: fs(11), fontWeight: "700" },
  heroTitle: {
    fontSize: fs(16), fontWeight: "bold", color: "#FFF",
    textAlign: "right", marginBottom: ms(6), letterSpacing: 0.3,
  },
  heroDesc: {
    fontSize: fs(13), textAlign: "right",
  },

  // ── Section title ──
  sectionTitle: {
    fontSize: fs(17), fontWeight: "bold", color: "#FFF",
    marginBottom: ms(14), textAlign: "right",
  },

  // ── Price ──
  priceChip: {
    flexDirection: "row", alignItems: "center", gap: ms(4),
    borderWidth: 1, borderRadius: ms(20),
    paddingHorizontal: ms(8), paddingVertical: ms(3),
    marginTop: ms(8), alignSelf: "flex-end",
  },
  priceText: { fontSize: fs(12), fontWeight: "700" },

  // ── Special join text ──
  joinTextRow: {
    flexDirection: "row", alignItems: "center", gap: ms(6),
    paddingHorizontal: ms(16), paddingVertical: ms(10),
    borderTopWidth: 1,
  },
  joinText: { flex: 1, fontSize: fs(12), textAlign: "right" },

  // ── Features section ──
  featuresCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ms(14), borderWidth: 1,
    padding: ms(14), marginBottom: ms(14),
  },
  featuresSectionTitle: {
    fontSize: fs(14), fontWeight: "700",
    marginBottom: ms(10), textAlign: "right",
  },
  featuresGrid: { gap: ms(8) },
  featureItem: {
    flexDirection: "row", alignItems: "center",
    gap: ms(8), paddingVertical: ms(8), paddingHorizontal: ms(10),
    borderRadius: ms(10), borderWidth: 1,
  },
  featureLabel: { flex: 1, fontSize: fs(12), textAlign: "right" },

  // ── Username color preview ──
  usernamePreviewRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ms(14), borderWidth: 1,
    paddingHorizontal: ms(14), paddingVertical: ms(10),
    marginBottom: ms(14),
  },
  usernamePreviewLeft: { flexDirection: "row", alignItems: "center", gap: ms(6) },
  usernamePreviewLabel: { color: "rgba(255,255,255,0.7)", fontSize: fs(13) },
  colorDot: { width: ms(20), height: ms(20), borderRadius: ms(10), borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)" },

  // ── Reward rows ──
  rewardsList: { gap: ms(10) },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: ms(14),
    borderWidth: 1,
    paddingVertical: ms(14),
    paddingHorizontal: ms(14),
    gap: ms(14),
  },
  rewardIconBox: {
    width: ms(52), height: ms(52),
    borderRadius: ms(12), borderWidth: 1,
    justifyContent: "center", alignItems: "center",
    flexShrink: 0,
    position: "relative",
  },
  lockOverlay: {
    position: "absolute", bottom: -ms(4), right: -ms(4),
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: ms(8), padding: ms(2),
  },
  rewardTexts: { flex: 1, alignItems: "flex-end" },
  rewardTitle: {
    fontSize: fs(14), fontWeight: "bold", color: "#FFF",
    textAlign: "right", marginBottom: ms(3),
  },
  rewardSubtitle: {
    fontSize: fs(12), color: "rgba(180,200,255,0.75)",
    textAlign: "right",
  },

  // ── Empty rewards ──
  emptyRewards: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: ms(32),
    borderWidth: 1, borderRadius: ms(16),
    borderStyle: "dashed",
    gap: ms(8),
  },
  emptyText: {
    fontSize: fs(14), fontWeight: "600",
  },
  emptyHint: {
    fontSize: fs(12), color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },

  // ── Fallback badge ──
  fallbackBadge: {
    borderRadius: ms(16), borderWidth: 2,
    justifyContent: "center", alignItems: "center",
  },
  fallbackNum: { fontWeight: "900" },

  // ── Loading/error ──
  loadingText: {
    color: "rgba(255,255,255,0.7)", fontSize: fs(14),
    marginTop: ms(12), textAlign: "center",
  },
  retryBtn: {
    marginTop: ms(20), borderWidth: 1, borderColor: "#60A5FA",
    borderRadius: ms(12), paddingHorizontal: ms(24), paddingVertical: ms(12),
  },
});
