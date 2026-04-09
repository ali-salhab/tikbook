import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import giftService from "../services/giftService";

const { width } = Dimensions.get("window");

const GiftPanel = ({
  visible,
  onClose,
  onSendGift,
  receiverId,
  userBalance,
  onRecharge,
}) => {
  const insets = useSafeAreaInsets();
  const [gifts, setGifts] = useState([]);
  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const categories = [
    { id: "all", name: "الكل", nameEn: "All" },
    { id: "basic", name: "أساسي", nameEn: "Basic" },
    { id: "premium", name: "مميز", nameEn: "Premium" },
    { id: "vip", name: "VIP", nameEn: "VIP" },
    { id: "special", name: "خاص", nameEn: "Special" },
  ];

  useEffect(() => {
    if (visible) {
      loadGifts();
    }
  }, [visible]);

  const loadGifts = async () => {
    try {
      setLoading(true);
      const response = await giftService.getGifts();
      if (response.success) {
        setGifts(response.gifts);
      }
    } catch (error) {
      console.error("Error loading gifts:", error);
      Alert.alert("خطأ", "فشل في تحميل الهدايا");
    } finally {
      setLoading(false);
    }
  };

  const filteredGifts = gifts.filter((gift) =>
    selectedCategory === "all" ? true : gift.category === selectedCategory,
  );

  const handleSendGift = async () => {
    if (!selectedGift) {
      Alert.alert("تنبيه", "الرجاء اختيار هدية");
      return;
    }

    const totalCost = selectedGift.price * quantity;

    if (userBalance < totalCost) {
      // The user might be confused by the alert. Let's make it clearer or just log.
      // But the screenshot shows "Insufficient balance...".
      // The issue is likely the 400 error from backend too.
      // We already allowed self-gifting on backend.
      Alert.alert(
        "رصيد غير كافٍ (Insufficient Balance)",
        `تحتاج ${totalCost} عملة. رصيدك الحالي: ${userBalance}`,
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "شحن الرصيد",
            onPress: () => {
              onClose();
              if (onRecharge) onRecharge();
            },
          },
        ],
      );
      return;
    }

    try {
      setIsSending(true);
      await onSendGift({
        gift: selectedGift,
        quantity,
        totalCost,
      });
      // Reset only on success
      setSelectedGift(null);
      setQuantity(1);
    } catch (error) {
      console.log("Gift Panel Send Error", error);
      // Alert is handled in parent
    } finally {
      setIsSending(false);
    }
  };

  const renderGiftItem = ({ item }) => {
    const isSelected = selectedGift?._id === item._id;
    const canAfford = userBalance >= item.price;
    const isVideo = item.animationType === "video" || item.animationType === "webm_alpha";
    const imgUri =
      (item.thumbnailUrl && item.thumbnailUrl.startsWith("http") ? item.thumbnailUrl : null) ||
      (item.pngUrl && item.pngUrl.startsWith("http") ? item.pngUrl : null) ||
      (item.animationUrl && item.animationUrl.startsWith("http") && item.animationType !== "lottie" ? item.animationUrl : null);

    return (
      <TouchableOpacity
        style={[
          styles.giftItem,
          isSelected && styles.selectedGift,
          !canAfford && styles.disabledGift,
        ]}
        onPress={() => setSelectedGift(isSelected ? null : item)}
        activeOpacity={0.75}
      >
        {/* Thumbnail */}
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            style={styles.giftImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.giftPlaceholder}>
            <Ionicons name="gift" size={28} color="#DDD" />
          </View>
        )}

        {/* Video badge */}
        {isVideo && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play-circle" size={16} color="#FFF" />
          </View>
        )}

        {/* Full-screen badge */}
        {item.fullScreen && (
          <View style={styles.fullscreenBadge}>
            <Ionicons name="expand" size={9} color="#FFF" />
          </View>
        )}

        {/* Name */}
        <Text style={styles.giftName} numberOfLines={1}>
          {item.nameAr || item.name}
        </Text>

        {/* Price */}
        <View style={styles.priceRow}>
          <Ionicons name="logo-bitcoin" size={10} color="#FFD700" />
          <Text style={styles.giftPrice}>{item.price}</Text>
        </View>

        {/* VIP badge */}
        {item.category === "vip" && (
          <View style={styles.vipBadge}>
            <Text style={styles.vipText}>VIP</Text>
          </View>
        )}

        {/* Lock overlay */}
        {!canAfford && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>إرسال هدية</Text>
            <TouchableOpacity
              onPress={onRecharge}
              style={styles.balanceContainer}
            >
              <Ionicons name="logo-bitcoin" size={16} color="#FFD700" />
              <Text style={styles.balanceText}>{userBalance}</Text>
              <Ionicons name="add-circle" size={16} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    selectedCategory === item.id && styles.selectedCategory,
                  ]}
                  onPress={() => setSelectedCategory(item.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === item.id &&
                        styles.selectedCategoryText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Gifts Grid */}
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FE2C55" />
              </View>
            ) : (
              <FlatList
                data={filteredGifts}
                keyExtractor={(item) => item._id}
                numColumns={4}
                renderItem={renderGiftItem}
                contentContainerStyle={styles.giftsGrid}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              />
            )}
          </View>

          {/* Selected Gift Actions */}
          {selectedGift && (
            <View style={styles.actionsContainer}>
              {/* Quantity Selector */}
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#000" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>x{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(quantity + 1)}
                >
                  <Ionicons name="add" size={20} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Send Button */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  isSending && styles.sendButtonDisabled,
                ]}
                onPress={handleSendGift}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>إرسال</Text>
                )}
                <View style={styles.totalCostBadge}>
                  <Ionicons name="logo-bitcoin" size={14} color="#fff" />
                  <Text style={styles.totalCostText}>
                    {selectedGift.price * quantity}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF8DC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  categoriesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#f5f5f5",
  },
  selectedCategory: {
    backgroundColor: "#FE2C55",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedCategoryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  giftsGrid: {
    padding: 10,
  },
  giftItem: {
    width: (width - 44) / 4,
    margin: 3,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  selectedGift: {
    borderColor: "#FE2C55",
    backgroundColor: "rgba(254,44,85,0.12)",
  },
  disabledGift: {
    opacity: 0.5,
  },
  giftImage: {
    width: (width - 44) / 4 - 12,
    height: (width - 44) / 4 - 12,
    backgroundColor: "transparent",
  },
  giftPlaceholder: {
    width: (width - 44) / 4 - 12,
    height: (width - 44) / 4 - 12,
    justifyContent: "center",
    alignItems: "center",
  },
  giftEmoji: {
    fontSize: 32,
  },
  giftName: {
    fontSize: 11,
    color: "#EEE",
    marginTop: 4,
    textAlign: "center",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  giftPrice: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFD700",
  },
  vipBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#9C27B0",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
  videoIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -10 }, { translateY: -10 }],
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 15,
    padding: 2,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16, // Added padding bottom to prevent overlap with system keys
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 25,
    paddingHorizontal: 12,
    gap: 12,
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    minWidth: 30,
    textAlign: "center",
  },
  sendButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FE2C55",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  sendButtonDisabled: {
    backgroundColor: "#c4637a",
    opacity: 0.8,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  totalCostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalCostText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default GiftPanel;
