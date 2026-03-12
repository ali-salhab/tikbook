import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { vipService } from "../services/vipService";
import { ms, fs } from "../utils/responsive";
import axios from "axios";
import { BASE_URL } from "../config/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - ms(40)) / 4;

const VIP_GRADIENT = {
  1:  ["#6B2F06", "#B8651A"],
  2:  ["#6B6B6B", "#C5C5C5"],
  3:  ["#8B6914", "#F0C040"],
  4:  ["#5B1E8A", "#A855F7"],
  5:  ["#9B3D00", "#F59E42"],
  6:  ["#5B1574", "#C026D3"],
  7:  ["#8B0000", "#EF4444"],
  8:  ["#7C0000", "#B91C1C"],
  9:  ["#0D6E57", "#34D399"],
  10: ["#1A4A7A", "#60A5FA"],
  11: ["#1A2535", "#475569"],
  12: ["#0D4A40", "#2DD4BF"],
  13: ["#7A4A00", "#FBBF24"],
  14: ["#6B2400", "#EA580C"],
  15: ["#7A5A00", "#FCD34D"],
};

const VipCard = ({ item, myVipLevel, onPurchase, purchasing }) => {
  const owned = myVipLevel >= item.level;
  const isPurchasing = purchasing === item.level;
  const grad = VIP_GRADIENT[item.level] || ["#333", "#666"];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => !owned && !isPurchasing && onPurchase(item)}
      activeOpacity={owned ? 1 : 0.85}
    >
      <LinearGradient
        colors={[grad[0], grad[1], grad[0]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Top label */}
        <View style={[styles.cardTopLabel, { borderColor: item.color }]}>
          <Text style={[styles.cardTopLabelText, { color: item.color }]}>
            VIP{item.level} ★
          </Text>
        </View>

        {/* Badge icon */}
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.badgeIcon}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.badgeIconFallback, { borderColor: item.color }]}>
            <Text style={[styles.badgeIconText, { color: item.color }]}>
              {item.level}
            </Text>
          </View>
        )}

        {/* Name */}
        <Text style={styles.cardName} numberOfLines={2}>
          {item.nameAr}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          {owned ? (
            <View style={styles.ownedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4ADE80" />
              <Text style={styles.ownedText}>مفعّل</Text>
            </View>
          ) : isPurchasing ? (
            <ActivityIndicator size="small" color={item.color} />
          ) : (
            <>
              <Ionicons name="logo-bitcoin" size={12} color="#60CFFF" />
              <Text style={styles.priceText}>{item.price.toLocaleString()}</Text>
            </>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function VipStoreScreen({ navigation }) {
  const { userToken, userInfo } = useContext(AuthContext);
  const [levels, setLevels] = useState([]);
  const [myVipLevel, setMyVipLevel] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (err) {
      Alert.alert("خطأ", "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (item) => {
    if (balance < item.price) {
      Alert.alert(
        "رصيد غير كافٍ",
        `تحتاج إلى ${item.price.toLocaleString()} عملة\nرصيدك الحالي: ${balance.toLocaleString()} عملة`,
        [
          { text: "إلغاء", style: "cancel" },
          { text: "شحن الرصيد", onPress: () => navigation.navigate("Wallet") },
        ]
      );
      return;
    }

    Alert.alert(
      `شراء VIP${item.level}`,
      `هل تريد شراء ${item.nameAr}؟\nالسعر: ${item.price.toLocaleString()} عملة`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "شراء الآن",
          onPress: async () => {
            try {
              setPurchasing(item.level);
              const res = await vipService.purchaseLevel(userToken, item.level);
              setMyVipLevel(res.vipLevel);
              setBalance((prev) => prev - item.price);
              Alert.alert("🎉 تهانينا!", res.message);
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

  return (
    <View style={styles.container}>
      {/* BG gradient */}
      <LinearGradient
        colors={["#0A0A0F", "#1A0A2E", "#0D0D1A"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#FFD700" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="crown" size={22} color="#FFD700" />
            <Text style={styles.headerTitle}>متجر VIP المميز</Text>
            <MaterialCommunityIcons name="crown" size={22} color="#FFD700" />
          </View>
          <View style={styles.balancePill}>
            <Ionicons name="logo-bitcoin" size={14} color="#60CFFF" />
            <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
          </View>
        </View>

        {/* Current VIP status */}
        {myVipLevel > 0 && (
          <View style={styles.currentVipBanner}>
            <MaterialCommunityIcons name="crown" size={16} color="#FFD700" />
            <Text style={styles.currentVipText}>مستواك الحالي: VIP{myVipLevel}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FFD700" />
          </View>
        ) : (
          <FlatList
            data={levels}
            keyExtractor={(item) => String(item.level)}
            numColumns={4}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <VipCard
                item={item}
                myVipLevel={myVipLevel}
                onPurchase={handlePurchase}
                purchasing={purchasing}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
  },
  backBtn: { padding: ms(4) },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
  },
  headerTitle: {
    color: "#FFD700",
    fontSize: fs(17),
    fontWeight: "bold",
    textAlign: "center",
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(96,207,255,0.12)",
    borderRadius: ms(12),
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    gap: ms(3),
    borderWidth: 1,
    borderColor: "rgba(96,207,255,0.25)",
  },
  balanceText: { color: "#60CFFF", fontSize: fs(12), fontWeight: "bold" },
  currentVipBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(6),
    backgroundColor: "rgba(255,215,0,0.1)",
    marginHorizontal: ms(16),
    borderRadius: ms(10),
    paddingVertical: ms(8),
    marginBottom: ms(8),
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  currentVipText: { color: "#FFD700", fontSize: fs(13), fontWeight: "bold" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  grid: { paddingHorizontal: ms(8), paddingBottom: ms(30) },
  card: {
    width: CARD_WIDTH,
    margin: ms(4),
    borderRadius: ms(8),
    overflow: "hidden",
  },
  cardGradient: {
    padding: ms(6),
    alignItems: "center",
    borderRadius: ms(8),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTopLabel: {
    borderWidth: 1,
    borderRadius: ms(4),
    paddingHorizontal: ms(4),
    paddingVertical: ms(1),
    marginBottom: ms(4),
  },
  cardTopLabelText: { fontSize: fs(8), fontWeight: "bold" },
  badgeIcon: { width: ms(38), height: ms(38), marginVertical: ms(4) },
  badgeIconFallback: {
    width: ms(38),
    height: ms(38),
    borderRadius: ms(19),
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: ms(4),
  },
  badgeIconText: { fontSize: fs(14), fontWeight: "bold" },
  cardName: {
    color: "#FFF",
    fontSize: fs(8),
    textAlign: "center",
    marginBottom: ms(4),
    lineHeight: ms(11),
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: ms(10),
    paddingHorizontal: ms(5),
    paddingVertical: ms(2),
    gap: ms(2),
    minHeight: ms(18),
    justifyContent: "center",
  },
  priceText: { color: "#FFF", fontSize: fs(9), fontWeight: "bold" },
  ownedBadge: { flexDirection: "row", alignItems: "center", gap: ms(2) },
  ownedText: { color: "#4ADE80", fontSize: fs(8), fontWeight: "bold" },
});
