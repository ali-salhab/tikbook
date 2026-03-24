/**
 * LevelScreen — shows the current user's level and level benefits.
 * Displays 3 levels total (1, 2, 3), styled with the blue glassmorphism
 * badge design. Accepts route.params.level (defaults to current user level).
 *
 * The overall style mirrors the reference screenshots:
 *   - Dark purple/navy gradient background
 *   - Horizontal level selector at top
 *   - Large hero badge card in the middle
 *   - Rewards section below
 */

import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { ms, fs } from "../utils/responsive";

const { width } = Dimensions.get("window");

const LEVEL_IMAGES = {
  1: require("../../assets/images/level1.png"),
  2: require("../../assets/images/level2.png"),
  3: require("../../assets/images/level3.png"),
};

// Larger detail icons used in the hero card inside the level page
const LEVEL_DETAIL_IMAGES = {
  1: require("../../assets/images/level_1details.png"),
  2: require("../../assets/images/level_2details.png"),
  3: require("../../assets/images/level_3details.png"),
};

// ─── Level data ───────────────────────────────────────────────────────────────
const LEVEL_DATA = {
  1: {
    title: "المستوى 1",
    subtitle: "المستوى 1 - المستوى 9",
    description: "أرسل هدية لإعادة تفعيل مكافآتك",
    range: "1 – 9",
    rewards: [
      { id: "r1", title: "شارة الداعمين", subtitle: "المستوى 1", icon: "shield-checkmark-outline", color: "#60A5FA" },
      { id: "r2", title: "شارة الداعمين", subtitle: "المستوى 5", icon: "shield-checkmark-outline", color: "#818CF8" },
      { id: "r3", title: "ظهور مميز في التوصيات", subtitle: "تصفح وضع اكتشاف الأصدقاء", icon: "people-outline", color: "#34D399" },
      { id: "r4", title: "رمز تعبيري حصري", subtitle: "للتعليقات والمحادثات", icon: "happy-outline", color: "#FBBF24" },
    ],
    gradient: ["#0D0B2B", "#1A1A50", "#0F0F30"],
    cardGradient: ["#1A2A6C", "#2A3D8A", "#1E2D70"],
    accentColor: "#5599FF",
    borderColor: "rgba(100,160,255,0.4)",
  },
  2: {
    title: "المستوى 2",
    subtitle: "المستوى 10 - المستوى 19",
    description: "أرسل هدية لإعادة تفعيل مكافآتك",
    range: "10 – 19",
    rewards: [
      { id: "r1", title: "شارة داعم نشط", subtitle: "المستوى 10", icon: "star-outline", color: "#FBBF24" },
      { id: "r2", title: "إطار ملف شخصي", subtitle: "حصري للمستوى 2", icon: "person-circle-outline", color: "#A78BFA" },
      { id: "r3", title: "دخول VIP للغرف", subtitle: "أولوية في البث المباشر", icon: "radio-outline", color: "#F472B6" },
      { id: "r4", title: "رموز تعبيرية حصرية", subtitle: "مجموعة موسعة", icon: "happy-outline", color: "#34D399" },
      { id: "r5", title: "إشعار بالمتابعين الجدد", subtitle: "قائمة مميزة", icon: "notifications-outline", color: "#60A5FA" },
    ],
    gradient: ["#0D0B2B", "#1A1A50", "#0F0F30"],
    cardGradient: ["#1C2A6E", "#2C3D8E", "#1E2F72"],
    accentColor: "#7AB8FF",
    borderColor: "rgba(120,180,255,0.4)",
  },
  3: {
    title: "المستوى 3",
    subtitle: "المستوى 20 - المستوى 29",
    description: "أرسل هدية لإعادة تفعيل مكافآتك",
    range: "20 – 29",
    rewards: [
      { id: "r1", title: "شارة داعم أسطوري", subtitle: "المستوى 20", icon: "trophy-outline", color: "#FBBF24" },
      { id: "r2", title: "إطار ملف شخصي ماسي", subtitle: "حصري للمستوى 3", icon: "diamond-outline", color: "#E879F9" },
      { id: "r3", title: "دخول VIP للغرف", subtitle: "أولوية قصوى في البث", icon: "radio-outline", color: "#F472B6" },
      { id: "r4", title: "تأثيرات هدايا خاصة", subtitle: "إضافة تأثيرات بصرية", icon: "sparkles-outline", color: "#34D399" },
      { id: "r5", title: "بث مباشر ممتد", subtitle: "وقت بث إضافي", icon: "videocam-outline", color: "#60A5FA" },
      { id: "r6", title: "دعم أولوية", subtitle: "وصول لفريق الدعم", icon: "headset-outline", color: "#FB923C" },
    ],
    gradient: ["#0D0B2B", "#1A1A50", "#0F0F30"],
    cardGradient: ["#1E2E72", "#2E3F92", "#203176"],
    accentColor: "#9ACFFF",
    borderColor: "rgba(150,200,255,0.4)",
  },
};

// ─── Reward item ──────────────────────────────────────────────────────────────
const RewardItem = ({ item, level }) => {
  const config = LEVEL_DATA[level];
  return (
    <View style={[styles.rewardItem, { borderColor: config.borderColor }]}>
      <View style={[styles.rewardIconBox, { backgroundColor: item.color + "22", borderColor: item.color + "44" }]}>
        <Image
          source={LEVEL_DETAIL_IMAGES[level]}
          style={styles.rewardIcon}
          resizeMode="contain"
        />
      </View>
      <View style={styles.rewardTexts}>
        <Text style={styles.rewardTitle}>{item.title}</Text>
        <Text style={styles.rewardSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LevelScreen({ navigation, route }) {
  const { userInfo } = useContext(AuthContext);
  const initialLevel = route?.params?.level || 1;
  const [selectedLevel, setSelectedLevel] = useState(initialLevel);

  const data = LEVEL_DATA[selectedLevel];

  return (
    <LinearGradient colors={data.gradient} style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={ms(26)} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>المستويات</Text>
          <View style={{ width: ms(40) }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Level selector tabs */}
          <View style={styles.levelTabs}>
            {[1, 2, 3].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.levelTab,
                  selectedLevel === lvl && styles.levelTabActive,
                ]}
                onPress={() => setSelectedLevel(lvl)}
                activeOpacity={0.8}
              >
                <Image
                  source={LEVEL_DETAIL_IMAGES[lvl]}
                  style={styles.tabIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Hero card wrapper — badge floats over the top edge */}
          <View style={styles.heroCardWrapper}>
            {/* Floating badge above the card */}
            <View style={styles.floatingBadge}>
              <Image
                source={LEVEL_DETAIL_IMAGES[selectedLevel]}
                style={styles.heroBadgeImage}
                resizeMode="contain"
              />
            </View>

            {/* Card */}
            <LinearGradient
              colors={data.cardGradient}
              style={[styles.heroCard, { borderColor: data.borderColor }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Glowing corner accents */}
              <View style={[styles.cornerAccentTL, { backgroundColor: data.accentColor }]} />
              <View style={[styles.cornerAccentBR, { backgroundColor: data.accentColor }]} />

              {/* Spacer so text sits below the overlapping badge */}
              <View style={styles.badgeSpacer} />

              {/* Level range label */}
              <Text style={styles.heroRange}>{data.subtitle}</Text>
              <Text style={styles.heroDescription}>{data.description}</Text>
            </LinearGradient>
          </View>

          {/* Rewards section */}
          <Text style={styles.sectionTitle}>المكافآت</Text>
          <View style={styles.rewardsList}>
            {data.rewards.map((item) => (
              <RewardItem key={item.id} item={item} level={selectedLevel} />
            ))}
          </View>

      

          <View style={{ height: ms(40) }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
  },
  backBtn: {
    width: ms(40),
    height: ms(40),
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fs(18),
    fontWeight: "bold",
    color: "#FFF",
  },
  scrollContent: {
    paddingHorizontal: ms(16),
    paddingTop: ms(8),
  },
  // ── Level selector ────────────────────────────────────────────────
  levelTabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: ms(12),
    marginBottom: ms(24),
  },
  levelTab: {
    padding: ms(8),
    borderRadius: ms(16),
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    width: ms(72),
    height: ms(72),
  },
  levelTabActive: {
    backgroundColor: "rgba(85,153,255,0.15)",
    borderColor: "rgba(100,160,255,0.6)",
    shadowColor: "#5599FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  // ── Hero card ─────────────────────────────────────────────────────
  heroCardWrapper: {
    position: "relative",
    marginTop: ms(70),         // make room for the top half of the floating badge
    marginBottom: ms(24),
  },
  floatingBadge: {
    position: "absolute",
    top: -ms(80),              // half of heroBadgeImage height (160/2)
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  badgeSpacer: {
    height: ms(88),            // half badge height + small gap so text clears the icon
  },
  heroCard: {
    borderRadius: ms(20),
    borderWidth: 1,
    paddingBottom: ms(30),
    paddingHorizontal: ms(20),
    alignItems: "center",
    overflow: "visible",
    position: "relative",
  },
  cornerAccentTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: ms(60),
    height: ms(2),
    opacity: 0.7,
  },
  cornerAccentBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: ms(60),
    height: ms(2),
    opacity: 0.7,
  },
  heroBadgeImage: {
    width: ms(160),
    height: ms(160),
  },
  heroRange: {
    fontSize: fs(16),
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: ms(8),
    textAlign: "center",
    letterSpacing: 0.5,
  },
  heroDescription: {
    fontSize: fs(13),
    color: "rgba(200,220,255,0.8)",
    textAlign: "center",
  },
  // ── Rewards ───────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: fs(17),
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: ms(12),
    textAlign: "right",
  },
  rewardsList: {
    gap: ms(10),
  },
  rewardItem: {
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
    width: ms(50),
    height: ms(50),
    borderRadius: ms(12),
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardIcon: {
    width: ms(42),
    height: ms(42),
  },
  rewardTexts: {
    flex: 1,
    alignItems: "flex-end",
  },
  rewardTitle: {
    fontSize: fs(14),
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: ms(3),
    textAlign: "right",
  },
  rewardSubtitle: {
    fontSize: fs(12),
    color: "rgba(180,200,255,0.8)",
    textAlign: "right",
  },
  // ── Show more ─────────────────────────────────────────────────────
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(6),
    marginTop: ms(16),
    paddingVertical: ms(12),
    borderRadius: ms(12),
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  showMoreText: {
    fontSize: fs(13),
    fontWeight: "600",
  },
});
