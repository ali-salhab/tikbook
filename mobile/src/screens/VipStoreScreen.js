import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  Image,
  Modal,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { AuthContext } from "../context/AuthContext";
import { vipService } from "../services/vipService";
import { ms, fs } from "../utils/responsive";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { useFocusEffect } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = (width - ms(48)) / 4;

const VIP_GRADIENT = {
  1:  ["#3D1A00", "#B8651A"],
  2:  ["#3A3A3A", "#C5C5C5"],
  3:  ["#4A3500", "#F0C040"],
  4:  ["#2D0E4E", "#A855F7"],
  5:  ["#4A1E00", "#F59E42"],
  6:  ["#2D0744", "#C026D3"],
  7:  ["#4A0000", "#EF4444"],
  8:  ["#3C0000", "#B91C1C"],
  9:  ["#033526", "#34D399"],
  10: ["#0A2540", "#60A5FA"],
  11: ["#0D1520", "#475569"],
  12: ["#042418", "#2DD4BF"],
  13: ["#3D2500", "#FBBF24"],
  14: ["#3A1000", "#EA580C"],
  15: ["#3D2C00", "#FCD34D"],
};

// Extra perks text shown in detail modal
const VIP_PERKS = {
  1:  ["لون اسم مميز", "شارة VIP"],
  2:  ["لون اسم فضي",  "إطار تعليق", "شارة VIP2"],
  3:  ["لون اسم ذهبي", "إطار تعليق متحرك", "رسالة انضمام"],
  4:  ["إطار بنفسجي",  "انيميشن انضمام", "كل مزايا ما قبله"],
  5:  ["انيميشن برتقالي حصري", "إطار مميز", "كل مزايا ما قبله"],
  6:  ["انيميشن ملكي", "إطار ملكي", "كل مزايا ما قبله"],
  7:  ["انيميشن نار",  "إطار فريد",  "كل مزايا ما قبله"],
  8:  ["إطار ياقوت حصري", "انيميشن خاص", "كل مزايا ما قبله"],
  9:  ["إطار كريستال",  "انيميشن تفاعلي", "كل مزايا ما قبله"],
  10: ["مزايا أسطورية", "انيميشن خاص بك", "كل مزايا ما قبله"],
  11: ["مزايا المحارب",  "انيميشن نادر",   "كل مزايا ما قبله"],
  12: ["إطار الأسياد",   "انيميشن فريد",   "كل مزايا ما قبله"],
  13: ["إطار ذهبي حصري", "انيميشن VIP13",  "كل مزايا ما قبله"],
  14: ["إطار نيون",      "انيميشن VIP14",  "كل مزايا ما قبله"],
  15: ["أعلى مستوى 👑",  "كل المزايا بلا حدود", "انيميشن أسطوري"],
};

// ── Small grid card ──────────────────────────────────────────────────────────
const VipCard = ({ item, myVipLevel, onPress, purchasing }) => {
  const owned      = myVipLevel >= item.level;
  const isCurrent  = myVipLevel === item.level;
  const isPurchasing = purchasing === item.level;
  const grad = VIP_GRADIENT[item.level] || ["#333", "#666"];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress(item);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.card}>
        <LinearGradient
          colors={[grad[0], grad[1], grad[0]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardGradient, isCurrent && styles.cardCurrentBorder]}
        >
          {isCurrent && (
            <View style={styles.currentDot}>
              <MaterialCommunityIcons name="crown" size={8} color="#FFD700" />
            </View>
          )}

          <View style={[styles.cardLevel, { borderColor: item.color + "99" }]}>
            <Text style={[styles.cardLevelText, { color: item.color }]}>VIP{item.level}</Text>
          </View>

          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.badgeImg} resizeMode="contain" />
          ) : (
            <View style={[styles.badgeFallback, { borderColor: item.color }]}>
              <Text style={[styles.badgeFallbackText, { color: item.color }]}>{item.level}</Text>
            </View>
          )}

          <Text style={styles.cardName} numberOfLines={2}>{item.nameAr}</Text>

          <View style={styles.cardBottom}>
            {isPurchasing ? (
              <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 22, height: 22 }} autoPlay loop />
            ) : owned ? (
              <View style={styles.ownedRow}>
                <Ionicons name="checkmark-circle" size={11} color="#4ADE80" />
                <Text style={styles.ownedText}>{isCurrent ? "حالي" : "مفعّل"}</Text>
              </View>
            ) : (
              <View style={styles.priceRow}>
                <Text style={styles.coinIcon}>💎</Text>
                <Text style={styles.priceText}>{item.price >= 1000 ? (item.price / 1000).toFixed(1) + "k" : item.price}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Detail bottom-sheet modal ────────────────────────────────────────────────
const VipDetailModal = ({ visible, item, myVipLevel, balance, onClose, onPurchase, purchasing }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!item) return null;
  const owned     = myVipLevel >= item.level;
  const isCurrent = myVipLevel === item.level;
  const notEnough = balance < item.price;
  const grad      = VIP_GRADIENT[item.level] || ["#333", "#666"];
  const perks     = VIP_PERKS[item.level] || [];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient colors={["#12071F", "#1A0D30"]} style={StyleSheet.absoluteFill} />

        <View style={styles.dragHandle} />

        {/* Coloured header band */}
        <LinearGradient colors={[grad[0], grad[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalHeader}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.modalBadgeImg} resizeMode="contain" />
          ) : (
            <View style={[styles.modalBadgeFallback, { borderColor: item.color }]}>
              <Text style={[styles.modalBadgeNum, { color: item.color }]}>{item.level}</Text>
            </View>
          )}
          <View style={{ flex: 1, marginLeft: ms(12) }}>
            <Text style={styles.modalVipLabel}>VIP {item.level}</Text>
            <Text style={styles.modalVipName}>{item.nameAr}</Text>
          </View>
          {(owned || isCurrent) && (
            <View style={styles.modalOwnedChip}>
              <Ionicons name="checkmark-circle" size={13} color="#4ADE80" />
              <Text style={styles.modalOwnedChipText}>{isCurrent ? "مستواك" : "مفعّل"}</Text>
            </View>
          )}
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: ms(20), paddingBottom: ms(20) }}>
          {/* Price info */}
          {!owned && (
            <View style={styles.priceBig}>
              <Text style={styles.priceBigLabel}>السعر</Text>
              <View style={styles.priceBigRow}>
                <Text style={styles.priceBigIcon}>💎</Text>
                <Text style={styles.priceBigValue}>{item.price.toLocaleString()}</Text>
                <Text style={styles.priceBigCurrency}>عملة</Text>
              </View>
              <View style={styles.balanceRow}>
                <Ionicons name="wallet-outline" size={13} color={notEnough ? "#F87171" : "#94A3B8"} />
                <Text style={[styles.balanceLabel, notEnough && { color: "#F87171" }]}>
                  رصيدك: {balance.toLocaleString()} عملة
                </Text>
                {notEnough && <Text style={styles.insufficientText}> — رصيد غير كافٍ</Text>}
              </View>
            </View>
          )}

          {/* Perk icons */}
          <Text style={styles.perksTitle}>المزايا الحصرية</Text>
          <View style={styles.perksGrid}>
            {[
              { icon: "person-outline",         color: item.color,   text: "لون اسم مخصص"      },
              { icon: "shield-checkmark-outline",color: "#60A5FA",   text: "شارة VIP حصرية"     },
              { icon: "chatbubble-outline",      color: "#A78BFA",   text: "إطار تعليق مميز"    },
              { icon: "sparkles-outline",        color: "#F59E42",   text: "انيميشن انضمام"     },
            ].map((p, i) => (
              <View key={i} style={styles.perkItem}>
                <View style={[styles.perkIcon, { backgroundColor: p.color + "22" }]}>
                  <Ionicons name={p.icon} size={16} color={p.color} />
                </View>
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
            {perks.map((p, i) => (
              <View key={"ep" + i} style={styles.perkItem}>
                <View style={[styles.perkIcon, { backgroundColor: item.color + "22" }]}>
                  <MaterialCommunityIcons name="crown" size={14} color={item.color} />
                </View>
                <Text style={styles.perkText}>{p}</Text>
              </View>
            ))}
          </View>

          {/* Features flags */}
          {item.features && (
            <>
              <Text style={styles.perksTitle}>الخصائص</Text>
              <View style={styles.featuresList}>
                {[
                  { key: "coloredUsername",      label: "اسم ملون في التعليقات" },
                  { key: "animatedCommentFrame",  label: "إطار تعليق متحرك"      },
                  { key: "specialBadge",          label: "شارة حصرية"             },
                  { key: "specialJoinAnimation",  label: "انيميشن خاص عند الدخول" },
                ].map((f) => (
                  <View key={f.key} style={styles.featureRow}>
                    <Ionicons
                      name={item.features[f.key] ? "checkmark-circle" : "close-circle"}
                      size={16}
                      color={item.features[f.key] ? "#4ADE80" : "#475569"}
                    />
                    <Text style={[styles.featureText, !item.features[f.key] && styles.featureTextOff]}>
                      {f.label}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Action button */}
        <View style={styles.modalFooter}>
          {owned ? (
            <View style={styles.modalOwnedBtn}>
              <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
              <Text style={styles.modalOwnedBtnText}>{isCurrent ? "هذا مستواك الحالي" : "مفعّل بالفعل"}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.buyBtn, { backgroundColor: item.color }, (notEnough || purchasing === item.level) && styles.buyBtnDisabled]}
              onPress={() => onPurchase(item)}
              disabled={notEnough || purchasing === item.level}
            >
              {purchasing === item.level ? (
                <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 28, height: 28 }} autoPlay loop />
              ) : notEnough ? (
                <>
                  <Ionicons name="wallet-outline" size={16} color="#FFF" />
                  <Text style={styles.buyBtnText}>شحن الرصيد أولاً</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="crown" size={18} color="#FFF" />
                  <Text style={styles.buyBtnText}>شراء VIP{item.level} — {item.price.toLocaleString()} 💎</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

// ── Main screen ──────────────────────────────────────────────────────────────
export default function VipStoreScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [levels,      setLevels]      = useState([]);
  const [myVipLevel,  setMyVipLevel]  = useState(0);
  const [balance,     setBalance]     = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [purchasing,  setPurchasing]  = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [levelsRes, vipRes, walletRes] = await Promise.all([
        vipService.getAllLevels(),
        vipService.getMyVip(userToken),
        axios.get(`${BASE_URL}/wallet`, { headers: { Authorization: `Bearer ${userToken}` } }),
      ]);
      setLevels(levelsRes.levels || []);
      setMyVipLevel(vipRes.vipLevel || 0);
      setBalance(walletRes.data?.balance || 0);
    } catch {
      Alert.alert("خطأ", "فشل تحميل بيانات VIP");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (item) => {
    setSelected(item);
    setModalVisible(true);
  };

  const handlePurchase = (item) => {
    if (balance < item.price) {
      Alert.alert(
        "رصيد غير كافٍ",
        `تحتاج ${item.price.toLocaleString()} 💎\nرصيدك: ${balance.toLocaleString()} 💎`,
        [
          { text: "إلغاء", style: "cancel" },
          { text: "شحن الرصيد", onPress: () => { setModalVisible(false); navigation.navigate("Wallet"); } },
        ]
      );
      return;
    }
    Alert.alert(
      `شراء VIP${item.level}`,
      `هل تريد شراء ${item.nameAr}؟\nالسعر: ${item.price.toLocaleString()} 💎`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "شراء",
          onPress: async () => {
            try {
              setPurchasing(item.level);
              const res = await vipService.purchaseLevel(userToken, item.level);
              setMyVipLevel(res.vipLevel);
              setBalance((b) => b - item.price);
              setModalVisible(false);
              Alert.alert("🎉 تهانينا!", res.message || `تم تفعيل VIP${item.level}!`);
            } catch (err) {
              Alert.alert("خطأ", err.response?.data?.message || "فشل الشراء");
            } finally {
              setPurchasing(null);
            }
          },
        },
      ]
    );
  };

  const currentLevel = levels.find((l) => l.level === myVipLevel);
  const nextLevel    = levels.find((l) => l.level === myVipLevel + 1);
  const progressPct  = levels.length > 0 ? (myVipLevel / levels.length) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#080614", "#130826", "#0A0A1A"]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#FFD700" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
            <Text style={styles.headerTitle}>متجر VIP</Text>
          </View>
          <TouchableOpacity style={styles.balancePill} onPress={() => navigation.navigate("Wallet")}>
            <Text style={styles.coinEmoji}>💎</Text>
            <Text style={styles.balanceText}>{balance >= 1000 ? (balance / 1000).toFixed(1) + "k" : balance}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 90, height: 90 }} autoPlay loop />
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </View>
        ) : levels.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="crown-outline" size={72} color="#334155" />
            <Text style={styles.emptyTitle}>لا توجد مستويات VIP بعد</Text>
            <Text style={styles.emptySubtitle}>تواصل مع الإدارة لإضافة مستويات VIP</Text>
          </View>
        ) : (
          <FlatList
            data={levels}
            keyExtractor={(item) => String(item.level)}
            numColumns={4}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.grid}
            ListHeaderComponent={
              <>
                {/* ── Current VIP status card ── */}
                <View style={styles.statusCard}>
                  <LinearGradient
                    colors={myVipLevel > 0 ? (VIP_GRADIENT[myVipLevel] || ["#1A1A2E", "#2D2D4E"]) : ["#1A1A2E", "#2D2D4E"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statusGrad}
                  >
                    <View style={styles.statusLeft}>
                      <Text style={styles.statusTitle}>{myVipLevel > 0 ? `VIP ${myVipLevel}` : "عضو عادي"}</Text>
                      <Text style={styles.statusSubtitle}>{currentLevel ? currentLevel.nameAr : "لا يوجد VIP حالياً"}</Text>
                      {nextLevel && (
                        <Text style={styles.statusNext}>التالي: VIP{nextLevel.level} — {nextLevel.price.toLocaleString()} 💎</Text>
                      )}
                    </View>
                    <View style={styles.statusRight}>
                      {currentLevel?.imageUrl ? (
                        <Image source={{ uri: currentLevel.imageUrl }} style={styles.statusBadgeImg} resizeMode="contain" />
                      ) : (
                        <View style={[styles.statusBadgeFallback, { borderColor: currentLevel?.color || "#FFD700" }]}>
                          <MaterialCommunityIcons name="crown" size={32} color={currentLevel?.color || "#FFD700"} />
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                  {/* Progress bar */}
                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: currentLevel?.color || "#FFD700" }]} />
                    </View>
                    <Text style={styles.progressLabel}>{myVipLevel} / {levels.length}</Text>
                  </View>
                </View>

                {/* ── Global perks strip ── */}
                <View style={styles.globalPerks}>
                  <Text style={styles.globalPerksTitle}>🎁 مزايا VIP</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: ms(10), paddingHorizontal: ms(4) }}>
                    {[
                      { icon: "person-circle-outline",      color: "#60A5FA", label: "اسم ملون"       },
                      { icon: "chatbubble-ellipses-outline", color: "#A78BFA", label: "إطار تعليق"     },
                      { icon: "shield-checkmark-outline",    color: "#34D399", label: "شارة حصرية"     },
                      { icon: "sparkles-outline",            color: "#F59E42", label: "انيميشن انضمام" },
                      { icon: "star-outline",                color: "#EC4899", label: "مكانة مميزة"    },
                      { icon: "heart-circle-outline",        color: "#EF4444", label: "هدايا حصرية"    },
                    ].map((p, i) => (
                      <View key={i} style={styles.globalPerkChip}>
                        <Ionicons name={p.icon} size={20} color={p.color} />
                        <Text style={[styles.globalPerkLabel, { color: p.color }]}>{p.label}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <Text style={styles.gridSectionTitle}>اختر مستوى VIP</Text>
              </>
            }
            renderItem={({ item }) => (
              <VipCard item={item} myVipLevel={myVipLevel} onPress={openDetail} purchasing={purchasing} />
            )}
            ListFooterComponent={<View style={{ height: ms(30) }} />}
          />
        )}
      </SafeAreaView>

      <VipDetailModal
        visible={modalVisible}
        item={selected}
        myVipLevel={myVipLevel}
        balance={balance}
        onClose={() => setModalVisible(false)}
        onPurchase={handlePurchase}
        purchasing={purchasing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080614" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
  },
  backBtn: { padding: ms(4) },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: ms(7) },
  headerTitle: { color: "#FFD700", fontSize: fs(18), fontWeight: "bold" },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    backgroundColor: "rgba(255,215,0,0.12)",
    borderRadius: ms(14),
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  coinEmoji: { fontSize: fs(13) },
  balanceText: { color: "#FFD700", fontSize: fs(12), fontWeight: "bold" },

  // Loading / empty
  loadingWrap:    { flex: 1, justifyContent: "center", alignItems: "center", gap: ms(12) },
  loadingText:    { color: "#475569", fontSize: fs(13) },
  emptyWrap:      { flex: 1, justifyContent: "center", alignItems: "center", gap: ms(12), paddingHorizontal: ms(40) },
  emptyTitle:     { color: "#94A3B8", fontSize: fs(16), fontWeight: "bold", textAlign: "center" },
  emptySubtitle:  { color: "#475569", fontSize: fs(13), textAlign: "center" },

  // Status card
  statusCard: {
    marginHorizontal: ms(14),
    marginBottom: ms(14),
    borderRadius: ms(16),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.2)",
  },
  statusGrad:         { flexDirection: "row", alignItems: "center", padding: ms(16) },
  statusLeft:         { flex: 1 },
  statusTitle:        { color: "#FFD700", fontSize: fs(20), fontWeight: "bold" },
  statusSubtitle:     { color: "#CBD5E1", fontSize: fs(13), marginTop: ms(2) },
  statusNext:         { color: "#94A3B8", fontSize: fs(11), marginTop: ms(6) },
  statusRight:        { marginLeft: ms(12) },
  statusBadgeImg:     { width: ms(60), height: ms(60) },
  statusBadgeFallback:{ width: ms(60), height: ms(60), borderRadius: ms(30), borderWidth: 2, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  progressWrap:       { flexDirection: "row", alignItems: "center", gap: ms(8), paddingHorizontal: ms(14), paddingVertical: ms(10), backgroundColor: "rgba(0,0,0,0.35)" },
  progressTrack:      { flex: 1, height: ms(5), backgroundColor: "#1E293B", borderRadius: ms(3), overflow: "hidden" },
  progressFill:       { height: "100%", borderRadius: ms(3) },
  progressLabel:      { color: "#94A3B8", fontSize: fs(11), minWidth: ms(30), textAlign: "right" },

  // Global perks strip
  globalPerks:      { marginHorizontal: ms(14), marginBottom: ms(14) },
  globalPerksTitle: { color: "#94A3B8", fontSize: fs(12), fontWeight: "600", marginBottom: ms(8) },
  globalPerkChip: {
    alignItems: "center",
    gap: ms(5),
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: ms(12),
    paddingHorizontal: ms(12),
    paddingVertical: ms(8),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  globalPerkLabel:   { fontSize: fs(10), fontWeight: "600" },
  gridSectionTitle:  { color: "#CBD5E1", fontSize: fs(13), fontWeight: "bold", marginHorizontal: ms(16), marginBottom: ms(8) },

  // Grid / card
  grid:            { paddingHorizontal: ms(12) },
  card:            { width: CARD_WIDTH, margin: ms(3), borderRadius: ms(10), overflow: "hidden" },
  cardGradient:    { padding: ms(7), alignItems: "center", borderRadius: ms(10), borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", minHeight: ms(110), justifyContent: "space-between" },
  cardCurrentBorder: { borderColor: "#FFD700", borderWidth: 1.5 },
  currentDot:      { position: "absolute", top: ms(4), right: ms(4) },
  cardLevel:       { borderWidth: 1, borderRadius: ms(4), paddingHorizontal: ms(4), paddingVertical: ms(1), marginBottom: ms(3) },
  cardLevelText:   { fontSize: fs(8), fontWeight: "bold" },
  badgeImg:        { width: ms(36), height: ms(36), marginVertical: ms(3) },
  badgeFallback:   { width: ms(36), height: ms(36), borderRadius: ms(18), borderWidth: 2, justifyContent: "center", alignItems: "center", marginVertical: ms(3) },
  badgeFallbackText: { fontSize: fs(13), fontWeight: "bold" },
  cardName:        { color: "#E2E8F0", fontSize: fs(8), textAlign: "center", lineHeight: ms(11) },
  cardBottom:      { marginTop: ms(4), minHeight: ms(18), justifyContent: "center", alignItems: "center" },
  ownedRow:        { flexDirection: "row", alignItems: "center", gap: ms(2) },
  ownedText:       { color: "#4ADE80", fontSize: fs(8), fontWeight: "bold" },
  priceRow:        { flexDirection: "row", alignItems: "center", gap: ms(2) },
  coinIcon:        { fontSize: fs(9) },
  priceText:       { color: "#E2E8F0", fontSize: fs(9), fontWeight: "bold" },

  // Modal
  modalOverlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.75,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    overflow: "hidden",
  },
  dragHandle: {
    width: ms(40), height: ms(4),
    backgroundColor: "#334155",
    borderRadius: ms(2),
    alignSelf: "center",
    marginTop: ms(10),
    marginBottom: ms(4),
  },
  modalHeader:        { flexDirection: "row", alignItems: "center", padding: ms(16), margin: ms(12), borderRadius: ms(14) },
  modalBadgeImg:      { width: ms(56), height: ms(56) },
  modalBadgeFallback: { width: ms(56), height: ms(56), borderRadius: ms(28), borderWidth: 2, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  modalBadgeNum:      { fontSize: fs(22), fontWeight: "bold" },
  modalVipLabel:      { color: "rgba(255,255,255,0.6)", fontSize: fs(11), fontWeight: "600" },
  modalVipName:       { color: "#FFF", fontSize: fs(20), fontWeight: "bold" },
  modalOwnedChip: {
    flexDirection: "row", alignItems: "center", gap: ms(4),
    backgroundColor: "rgba(74,222,128,0.15)",
    paddingHorizontal: ms(8), paddingVertical: ms(4),
    borderRadius: ms(10), borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  modalOwnedChipText: { color: "#4ADE80", fontSize: fs(10), fontWeight: "bold" },

  // Price section in modal
  priceBig: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: ms(14), padding: ms(14),
    marginBottom: ms(16), borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  priceBigLabel:    { color: "#64748B", fontSize: fs(11), marginBottom: ms(6) },
  priceBigRow:      { flexDirection: "row", alignItems: "baseline", gap: ms(5) },
  priceBigIcon:     { fontSize: fs(22) },
  priceBigValue:    { color: "#FFD700", fontSize: fs(28), fontWeight: "bold" },
  priceBigCurrency: { color: "#94A3B8", fontSize: fs(13) },
  balanceRow:       { flexDirection: "row", alignItems: "center", gap: ms(5), marginTop: ms(8) },
  balanceLabel:     { color: "#94A3B8", fontSize: fs(12) },
  insufficientText: { color: "#F87171", fontSize: fs(11), fontWeight: "600" },

  // Perks
  perksTitle:  { color: "#94A3B8", fontSize: fs(12), fontWeight: "600", marginBottom: ms(10), marginTop: ms(4) },
  perksGrid:   { flexDirection: "row", flexWrap: "wrap", gap: ms(8), marginBottom: ms(16) },
  perkItem:    { flexDirection: "row", alignItems: "center", gap: ms(8), width: "47%" },
  perkIcon:    { width: ms(30), height: ms(30), borderRadius: ms(8), justifyContent: "center", alignItems: "center" },
  perkText:    { color: "#CBD5E1", fontSize: fs(11), flex: 1 },

  // Features
  featuresList:   { gap: ms(8), marginBottom: ms(16) },
  featureRow:     { flexDirection: "row", alignItems: "center", gap: ms(8) },
  featureText:    { color: "#CBD5E1", fontSize: fs(13) },
  featureTextOff: { color: "#475569" },

  // Footer
  modalFooter: { paddingHorizontal: ms(20), paddingBottom: ms(28), paddingTop: ms(10) },
  buyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: ms(8), borderRadius: ms(14), paddingVertical: ms(14),
  },
  buyBtnDisabled:     { opacity: 0.45 },
  buyBtnText:         { color: "#FFF", fontSize: fs(14), fontWeight: "bold" },
  modalOwnedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: ms(8), borderRadius: ms(14), paddingVertical: ms(14),
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1, borderColor: "rgba(74,222,128,0.3)",
  },
  modalOwnedBtnText: { color: "#4ADE80", fontSize: fs(14), fontWeight: "bold" },
});
