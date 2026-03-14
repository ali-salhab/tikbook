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
      case "legendary":
        return "#FFD700";
      case "epic":
        return "#9B59B6";
      case "rare":
        return "#3498DB";
      default:
        return "#95A5A6";
    }
  };

  const renderBadgeItem = ({ item }) => {
    const owned = isOwned(item._id);
    const isPurchasing = purchasing === item._id;

    return (
      <TouchableOpacity
        style={[
          styles.badgeCard,
          { borderColor: getRarityColor(item.rarity) },
          owned && styles.ownedBadge,
        ]}
        onPress={() => !owned && handlePurchase(item)}
        disabled={owned || isPurchasing}
      >
        {/* Badge Image */}
        <View style={styles.badgeImageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.badgeImage}
            resizeMode="contain"
          />
          {owned && (
            <View style={styles.ownedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
          )}
        </View>

        {/* Badge Info */}
        <View style={styles.badgeInfo}>
          <Text style={styles.badgeName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.badgeDescription} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Rarity Badge */}
          <View
            style={[
              styles.rarityBadge,
              { backgroundColor: getRarityColor(item.rarity) },
            ]}
          >
            <Text style={styles.rarityText}>{item.rarity.toUpperCase()}</Text>
          </View>

          {/* Price or Status */}
          <View style={styles.priceContainer}>
            {owned ? (
              <Text style={styles.ownedText}>OWNED</Text>
            ) : item.isExclusive ? (
              <Text style={styles.exclusiveText}>EXCLUSIVE</Text>
            ) : (
              <>
                <Ionicons name="logo-bitcoin" size={16} color="#FFD700" />
                <Text style={styles.priceText}>{item.price}</Text>
              </>
            )}
          </View>
        </View>

        {isPurchasing && (
          <View style={styles.purchasingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Badge Shop</Text>
        <TouchableOpacity
          style={styles.myBadgesButton}
          onPress={() => navigation.navigate("MyBadges")}
        >
          <Ionicons name="briefcase" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "frames" && styles.activeTab]}
          onPress={() => setActiveTab("frames")}
        >
          <Ionicons
            name="person-circle-outline"
            size={24}
            color={activeTab === "frames" ? "#000" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "frames" && styles.activeTabText,
            ]}
          >
            Profile Frames
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "backgrounds" && styles.activeTab]}
          onPress={() => setActiveTab("backgrounds")}
        >
          <Ionicons
            name="image-outline"
            size={24}
            color={activeTab === "backgrounds" ? "#000" : "#999"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "backgrounds" && styles.activeTabText,
            ]}
          >
            Backgrounds
          </Text>
        </TouchableOpacity>
      </View>

      {/* Badge List */}
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
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: ms(8),
  },
  headerTitle: {
    fontSize: fs(18),
    fontWeight: "bold",
    color: "#000",
  },
  myBadgesButton: {
    padding: ms(8),
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(8),
    paddingHorizontal: ms(12),
    borderRadius: ms(8),
    marginHorizontal: ms(4),
  },
  activeTab: {
    backgroundColor: "#f0f0f0",
  },
  tabText: {
    fontSize: fs(14),
    color: "#999",
    marginLeft: ms(8),
  },
  activeTabText: {
    color: "#000",
    fontWeight: "bold",
  },
  listContent: {
    padding: ms(8),
  },
  badgeCard: {
    width: (width - 32) / 2,
    margin: ms(8),
    borderRadius: ms(12),
    borderWidth: 2,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ownedBadge: {
    opacity: 0.7,
  },
  badgeImageContainer: {
    width: "100%",
    height: ms(150),
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeImage: {
    width: "80%",
    height: "80%",
  },
  ownedOverlay: {
    position: "absolute",
    top: ms(8),
    right: ms(8),
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    borderRadius: ms(12),
    padding: ms(4),
  },
  badgeInfo: {
    padding: ms(12),
  },
  badgeName: {
    fontSize: fs(14),
    fontWeight: "bold",
    color: "#000",
    marginBottom: ms(4),
  },
  badgeDescription: {
    fontSize: fs(11),
    color: "#666",
    marginBottom: ms(8),
  },
  rarityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderRadius: ms(4),
    marginBottom: ms(8),
  },
  rarityText: {
    fontSize: fs(10),
    fontWeight: "bold",
    color: "#fff",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ms(8),
    backgroundColor: "#f8f8f8",
    borderRadius: ms(8),
  },
  priceText: {
    fontSize: fs(16),
    fontWeight: "bold",
    color: "#000",
    marginLeft: ms(4),
  },
  ownedText: {
    fontSize: fs(14),
    fontWeight: "bold",
    color: "#4CAF50",
  },
  exclusiveText: {
    fontSize: fs(12),
    fontWeight: "bold",
    color: "#9B59B6",
  },
  purchasingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
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
