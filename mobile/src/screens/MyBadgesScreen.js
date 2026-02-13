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
import { AuthContext } from "../context/AuthContext";
import { badgeService } from "../services/badgeService";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";

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

  const currentBadges =
    activeTab === "frames" ? myBadges.ownedBadges : myBadges.ownedBackgrounds;

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
            Frames ({myBadges.ownedBadges.length})
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
            Backgrounds ({myBadges.ownedBackgrounds.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Badge List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  shopButton: {
    padding: 8,
  },
  previewSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: "#f0f0f0",
  },
  tabText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  activeTabText: {
    color: "#000",
    fontWeight: "bold",
  },
  listContent: {
    padding: 8,
  },
  badgeCard: {
    width: (width - 32) / 2,
    margin: 8,
    borderRadius: 12,
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
    height: 150,
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
    top: 8,
    right: 8,
    alignItems: "center",
  },
  activeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 2,
  },
  badgeInfo: {
    padding: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 6,
  },
  rarityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  acquiredText: {
    fontSize: 10,
    color: "#999",
    marginBottom: 4,
  },
  giftBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE4EC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  giftText: {
    fontSize: 10,
    color: "#E91E63",
    marginLeft: 4,
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
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  shopNowButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "#000",
    borderRadius: 24,
  },
  shopNowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default MyBadgesScreen;
