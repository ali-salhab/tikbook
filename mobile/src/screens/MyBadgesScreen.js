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
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";
import { ms, fs } from "../utils/responsive";

const { width } = Dimensions.get("window");

const MyBadgesScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const [myBadges, setMyBadges] = useState({
    ownedBadges: [],
    ownedBackgrounds: [],
    activeBadge: null,
    activeBackground: null,
  });
  const [activeTab, setActiveTab] = useState("frames");
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);

  useEffect(() => {
    loadMyBadges();
  }, []);

  const loadMyBadges = async () => {
    try {
      setLoading(true);
      const response = await badgeService.getMyBadges(userToken);
      setMyBadges(response);
    } catch (error) {
      console.error("Error loading my badges:", error);
      Alert.alert("Error", "Failed to load your badges");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBadge = async (badgeId) => {
    const isFrame = activeTab === "frames";
    const currentActive = isFrame
      ? myBadges.activeBadge?._id
      : myBadges.activeBackground?._id;

    if (currentActive === badgeId) {
      // Deselect
      Alert.alert(
        "Remove Badge",
        `Remove this ${isFrame ? "frame" : "background"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            onPress: async () => {
              try {
                setSelecting(badgeId);
                if (isFrame) {
                  await badgeService.setActiveBadge(userToken, "none");
                } else {
                  await badgeService.setActiveBackground(userToken, "none");
                }
                loadMyBadges();
              } catch (error) {
                Alert.alert("Error", "Failed to remove badge");
              } finally {
                setSelecting(null);
              }
            },
          },
        ],
      );
    } else {
      // Select
      try {
        setSelecting(badgeId);
        if (isFrame) {
          await badgeService.setActiveBadge(userToken, badgeId);
          Alert.alert("Success", "Profile frame updated!");
        } else {
          await badgeService.setActiveBackground(userToken, badgeId);
          Alert.alert("Success", "Live room background updated!");
        }
        loadMyBadges();
      } catch (error) {
        Alert.alert("Error", "Failed to set badge");
      } finally {
        setSelecting(null);
      }
    }
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
    const badge = item.badge;
    if (!badge) return null;

    const isFrame = activeTab === "frames";
    const isActive = isFrame
      ? myBadges.activeBadge?._id === badge._id
      : myBadges.activeBackground?._id === badge._id;
    const isSelecting = selecting === badge._id;

    return (
      <TouchableOpacity
        style={[
          styles.badgeCard,
          { borderColor: getRarityColor(badge.rarity) },
          isActive && styles.activeBadge,
        ]}
        onPress={() => handleSelectBadge(badge._id)}
        disabled={isSelecting}
      >
        {/* Badge Image */}
        <View style={styles.badgeImageContainer}>
          {isFrame ? (
            <ProfileBadgeFrame
              profileImage={userInfo?.profileImage}
              badgeImage={badge.imageUrl}
              size={120}
            />
          ) : (
            <Image
              source={{ uri: badge.imageUrl }}
              style={styles.badgeImage}
              resizeMode="cover"
            />
          )}

          {isActive && (
            <View style={styles.activeIndicator}>
              <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          )}
        </View>

        {/* Badge Info */}
        <View style={styles.badgeInfo}>
          <Text style={styles.badgeName} numberOfLines={1}>
            {badge.name}
          </Text>

          {/* Rarity Badge */}
          <View
            style={[
              styles.rarityBadge,
              { backgroundColor: getRarityColor(badge.rarity) },
            ]}
          >
            <Text style={styles.rarityText}>{badge.rarity.toUpperCase()}</Text>
          </View>

          {/* Acquired Date */}
          <Text style={styles.acquiredText}>
            Acquired: {new Date(item.acquiredAt).toLocaleDateString()}
          </Text>

          {/* Gifted By */}
          {item.giftedBy && (
            <View style={styles.giftBadge}>
              <Ionicons name="gift" size={12} color="#E91E63" />
              <Text style={styles.giftText}>Admin Gift</Text>
            </View>
          )}
        </View>

        {isSelecting && (
          <View style={styles.selectingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const currentBadges = (
    activeTab === "frames" ? myBadges.ownedBadges : myBadges.ownedBackgrounds
  ).filter((item) => item.badge != null);

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
        <Text style={styles.headerTitle}>My Badges</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate("BadgeShop")}
        >
          <Ionicons name="cart" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Preview Section */}
      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>Current Look</Text>
        <ProfileBadgeFrame
          profileImage={userInfo?.profileImage}
          badgeImage={myBadges.activeBadge?.imageUrl}
          size={120}
        />
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
            Frames ({myBadges.ownedBadges.filter((i) => i.badge != null).length}
            )
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
            Backgrounds (
            {myBadges.ownedBackgrounds.filter((i) => i.badge != null).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Badge List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
        </View>
      ) : currentBadges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No {activeTab} yet</Text>
          <Text style={styles.emptySubtitle}>
            Visit the shop to get your first badge!
          </Text>
          <TouchableOpacity
            style={styles.shopNowButton}
            onPress={() => navigation.navigate("BadgeShop")}
          >
            <Text style={styles.shopNowText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={currentBadges}
          renderItem={renderBadgeItem}
          keyExtractor={(item, index) => `${item.badge?._id}-${index}`}
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
  shopButton: {
    padding: ms(8),
  },
  previewSection: {
    alignItems: "center",
    paddingVertical: ms(20),
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  previewTitle: {
    fontSize: fs(16),
    fontWeight: "bold",
    color: "#000",
    marginBottom: ms(12),
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
    fontSize: fs(12),
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
  activeBadge: {
    borderWidth: 3,
    borderColor: "#4CAF50",
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
    width: "100%",
    height: "100%",
  },
  activeIndicator: {
    position: "absolute",
    top: ms(8),
    right: ms(8),
    alignItems: "center",
  },
  activeText: {
    fontSize: fs(10),
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: ms(2),
  },
  badgeInfo: {
    padding: ms(12),
  },
  badgeName: {
    fontSize: fs(14),
    fontWeight: "bold",
    color: "#000",
    marginBottom: ms(6),
  },
  rarityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: ms(8),
    paddingVertical: ms(2),
    borderRadius: ms(4),
    marginBottom: ms(6),
  },
  rarityText: {
    fontSize: fs(10),
    fontWeight: "bold",
    color: "#fff",
  },
  acquiredText: {
    fontSize: fs(10),
    color: "#999",
    marginBottom: ms(4),
  },
  giftBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE4EC",
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(4),
    alignSelf: "flex-start",
  },
  giftText: {
    fontSize: fs(10),
    color: "#E91E63",
    marginLeft: ms(4),
    fontWeight: "bold",
  },
  selectingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ms(40),
  },
  emptyTitle: {
    fontSize: fs(18),
    fontWeight: "bold",
    color: "#000",
    marginTop: ms(16),
  },
  emptySubtitle: {
    fontSize: fs(14),
    color: "#999",
    textAlign: "center",
    marginTop: ms(8),
  },
  shopNowButton: {
    marginTop: ms(20),
    paddingHorizontal: ms(32),
    paddingVertical: ms(12),
    backgroundColor: "#000",
    borderRadius: ms(24),
  },
  shopNowText: {
    color: "#fff",
    fontSize: fs(16),
    fontWeight: "bold",
  },
});

export default MyBadgesScreen;
