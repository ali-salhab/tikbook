import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { AuthContext } from "../context/AuthContext";
import { badgeService } from "../services/badgeService";
import { ms, fs } from "../utils/responsive";

const { width } = Dimensions.get("window");
const CARD_W = (width - ms(48)) / 2;

const BadgeShopScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const [badges, setBadges] = useState([]);
  const [myBadges, setMyBadges] = useState({
    ownedBadges: [],
    ownedBackgrounds: [],
  });
  const [activeTab, setActiveTab] = useState("frames");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    loadBadges();
    loadMyBadges();
  }, [activeTab]);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const type = activeTab === "frames" ? "frame" : "background";
      const response = await badgeService.getAllBadges(userToken, type);
      setBadges(response.badges || []);
    } catch (error) {
      console.error("Error loading badges:", error);
      Alert.alert("خطأ", "فشل تحميل الشارات");
    } finally {
      setLoading(false);
    }
  };

  const loadMyBadges = async () => {
    try {
      const response = await badgeService.getMyBadges(userToken);
      setMyBadges(response);
    } catch (error) {
      console.error("Error loading my badges:", error);
    }
  };

  const handlePurchase = async (badge) => {
    if (badge.isExclusive) {
      Alert.alert("شارة حصرية", "هذه الشارة تُمنح من قِبل الإدارة فقط");
      return;
    }
    Alert.alert(
      "تأكيد الشراء",
      `شراء "${badge.name}" مقابل ${badge.price} عملة؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "شراء",
          onPress: async () => {
            try {
              setPurchasing(badge._id);
              await badgeService.purchaseBadge(userToken, badge._id);
              Alert.alert("✅ تم الشراء", `تم شراء "${badge.name}" بنجاح!`);
              loadMyBadges();
              loadBadges();
            } catch (error) {
              const message =
                error.response?.data?.message || "فشل شراء الشارة، حاول مجدداً";
              Alert.alert("خطأ", message);
            } finally {
              setPurchasing(null);
            }
          },
        },
      ],
    );
  };

  const isOwned = (badgeId) => {
    const ownedList =
      activeTab === "frames" ? myBadges.ownedBadges : myBadges.ownedBackgrounds;
    return ownedList.some((item) => item.badge?._id === badgeId);
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case "legendary": return "#FFD700";
      case "epic":      return "#9B59B6";
      case "rare":      return "#3498DB";
      default:          return "#607D8B";
    }
  };

  const renderBadgeItem = ({ item }) => {
    const owned       = isOwned(item._id);
    const isPurchasing = purchasing === item._id;
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
      <TouchableOpacity
        style={[
          styles.badgeCard,
          { borderColor: owned ? "#4CAF50" : getRarityColor(item.rarity) },
        ]}
        onPress={() => !owned && handlePurchase(item)}
        disabled={owned || isPurchasing}
        activeOpacity={0.82}
      >
        {/* Image area with skeleton */}
        <View style={styles.imgWrap}>
          {!imgLoaded && (
            <View style={styles.imgSkeleton}>
              <ActivityIndicator size="small" color="#6C3FC5" />
            </View>
          )}
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.badgeImage, !imgLoaded && { opacity: 0 }]}
            resizeMode="contain"
            onLoad={() => setImgLoaded(true)}
          />
          {owned && (
            <View style={styles.ownedBadge}>
              <Ionicons name="checkmark-circle" size={ms(22)} color="#4CAF50" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.badgeInfo}>
          <Text style={styles.badgeName} numberOfLines={1}>{item.name}</Text>

          <View style={[styles.rarityChip, { backgroundColor: getRarityColor(item.rarity) + "33", borderColor: getRarityColor(item.rarity) }]}>
            <Text style={[styles.rarityText, { color: getRarityColor(item.rarity) }]}>
              {item.rarity.toUpperCase()}
            </Text>
          </View>

          <View style={styles.priceRow}>
            {owned ? (
              <Text style={styles.ownedText}>مملوكة ✓</Text>
            ) : item.isExclusive ? (
              <Text style={styles.exclusiveText}>حصري</Text>
            ) : (
              <>
                <Text style={styles.coinIcon}>🪙</Text>
                <Text style={styles.priceText}>{item.price}</Text>
              </>
            )}
          </View>
        </View>

        {isPurchasing && (
          <View style={styles.purchasingOverlay}>
            <ActivityIndicator size="large" color="#A78BFA" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={ms(22)} color="#E2D9F3" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>متجر الإطارات</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("MyBadges")}>
          <Ionicons name="briefcase-outline" size={ms(22)} color="#E2D9F3" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "backgrounds" && styles.activeTab]}
          onPress={() => setActiveTab("backgrounds")}
        >
          <Ionicons name="image-outline" size={ms(18)} color={activeTab === "backgrounds" ? "#FFF" : "#9985C8"} />
          <Text style={[styles.tabText, activeTab === "backgrounds" && styles.activeTabText]}>Backgrounds</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "frames" && styles.activeTab]}
          onPress={() => setActiveTab("frames")}
        >
          <Ionicons name="person-circle-outline" size={ms(18)} color={activeTab === "frames" ? "#FFF" : "#9985C8"} />
          <Text style={[styles.tabText, activeTab === "frames" && styles.activeTabText]}>Profile Frames</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
        </View>
      ) : (
        <FlatList
          data={badges}
          renderItem={renderBadgeItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0A1E",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backButton: {
    padding: ms(6),
  },
  headerTitle: {
    fontSize: fs(17),
    fontWeight: "700",
    color: "#E2D9F3",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: ms(16),
    paddingVertical: ms(10),
    gap: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(9),
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: "rgba(160,130,255,0.25)",
    gap: ms(6),
  },
  activeTab: {
    backgroundColor: "#6C3FC5",
    borderColor: "#6C3FC5",
  },
  tabText: {
    fontSize: fs(13),
    color: "#9985C8",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFF",
    fontWeight: "700",
  },
  listContent: {
    padding: ms(12),
    paddingBottom: ms(30),
  },
  columnWrapper: {
    gap: ms(12),
    justifyContent: "space-between",
  },
  badgeCard: {
    width: CARD_W,
    marginBottom: ms(12),
    borderRadius: ms(14),
    borderWidth: 1.5,
    backgroundColor: "#151228",
    overflow: "hidden",
  },
  imgWrap: {
    width: "100%",
    height: ms(140),
    backgroundColor: "#1A1630",
    alignItems: "center",
    justifyContent: "center",
  },
  imgSkeleton: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1630",
  },
  badgeImage: {
    width: "82%",
    height: "82%",
  },
  ownedBadge: {
    position: "absolute",
    top: ms(8),
    right: ms(8),
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: ms(12),
    padding: ms(2),
  },
  badgeInfo: {
    padding: ms(10),
    gap: ms(6),
  },
  badgeName: {
    fontSize: fs(13),
    fontWeight: "700",
    color: "#E2D9F3",
  },
  rarityChip: {
    alignSelf: "flex-start",
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderRadius: ms(6),
    borderWidth: 1,
  },
  rarityText: {
    fontSize: fs(10),
    fontWeight: "800",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    paddingTop: ms(2),
  },
  coinIcon: {
    fontSize: fs(14),
  },
  priceText: {
    fontSize: fs(15),
    fontWeight: "800",
    color: "#FFD700",
  },
  ownedText: {
    fontSize: fs(13),
    fontWeight: "700",
    color: "#4CAF50",
  },
  exclusiveText: {
    fontSize: fs(12),
    fontWeight: "700",
    color: "#CE93D8",
  },
  purchasingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BadgeShopScreen;
