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
    gradient: ["#020A1A", "#04152E", "#03101F"],
    cardGradient: ["#07254A", "#0E3F7A", "#092E5C"],
    accentColor: "#60A5FA",
    borderColor: "rgba(96,165,250,0.5)",
    descriptionColor: "rgba(186,230,253,0.9)",
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
    gradient: ["#030B22", "#061840", "#040E28"],
    cardGradient: ["#0C2D6A", "#1648A0", "#0E3578"],
    accentColor: "#3B82F6",
    borderColor: "rgba(59,130,246,0.55)",
    descriptionColor: "rgba(147,197,253,0.9)",
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
    gradient: ["#1A0800", "#2E1400", "#130600"],
    cardGradient: ["#5C1C00", "#8C3000", "#4A1600"],
    accentColor: "#F97316",
    borderColor: "rgba(249,115,22,0.5)",
    descriptionColor: "rgba(253,186,116,0.9)",
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
          resizeMode="cover"
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
                  selectedLevel === lvl && {
                    backgroundColor: LEVEL_DATA[lvl].accentColor + "26",
                    borderColor: LEVEL_DATA[lvl].accentColor + "99",
                    shadowColor: LEVEL_DATA[lvl].accentColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 12,
                    elevation: 8,
                  },
                ]}
                onPress={() => setSelectedLevel(lvl)}
                activeOpacity={0.8}
              >
                <View style={styles.tabIconWrapper}>
                  <Image
                    source={LEVEL_DETAIL_IMAGES[lvl]}
                    style={styles.tabIcon}
                    resizeMode="stretch"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hero card wrapper — badge floats off the left edge */}
          <View style={styles.heroCardWrapper}>
            {/* Card */}
            <LinearGradient
              colors={data.cardGradient}
              style={[styles.heroCard, { borderColor: data.borderColor }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Row: icon space on left + text on right */}
              <View style={styles.cardRow}>
                {/* Empty space for the icon that overflows left */}
                <View style={styles.cardIconSpace} />

                {/* Text content */}
                <View style={styles.cardTexts}>
                  <Text style={styles.heroRange}>{data.subtitle}</Text>
                  <Text style={[styles.heroDescription, { color: data.descriptionColor }]}>{data.description}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Floating badge on the left, vertically centered over the card */}
            <View style={styles.floatingBadge}>
              <Image
                source={LEVEL_DETAIL_IMAGES[selectedLevel]}
                style={styles.heroBadgeImage}
                resizeMode="contain"
              />
            </View>
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
    padding: ms(10),
    borderRadius: ms(16),
    backgroundColor: "rgba(151, 60, 60, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    width: ms(100),
    height: ms(100),
  },
  tabIconWrapper: {
    width: ms(100),
    height: ms(100),
    alignItems: "center",
    justifyContent: "center",
  },
  levelTabActive: {},
  // ── Hero card ─────────────────────────────────────────────────────
  heroCardWrapper: {
    position: "relative",
    marginLeft: ms(80),
    marginBottom: ms(8),
    paddingVertical: ms(2),   // breathing room so icon can overflow card top/bottom
  },
  floatingBadge: {
    position: "absolute",
    left: -ms(100),
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ms(24),
    paddingHorizontal: ms(16),
  },
  cardIconSpace: {
    width: ms(80),             // gap that the overflowing icon visually occupies
  },
  cardTexts: {
    flex: 1,
    alignItems: "flex-end",
  },
  heroCard: {
    borderRadius: ms(20),
    borderWidth: 1,
    overflow: "visible",
    position: "relative",
    minHeight: ms(110),
    justifyContent: "center",
  },
  heroBadgeImage: {
    width: ms(200),
    height: ms(200),
  },
  heroRange: {
    fontSize: fs(16),
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: ms(8),
    textAlign: "right",
    letterSpacing: 0.5,
  },
  heroDescription: {
    fontSize: fs(13),
    color: "rgba(200,220,255,0.8)",
    textAlign: "right",
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
