import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";

// Custom Coin Icon Component
const CoinIcon = ({ size = 20 }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: "#FFD700", // Gold
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#DAA520",
    }}
  >
    <Ionicons name="star" size={size * 0.6} color="#FFF" />
  </View>
);

const WalletScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userToken, userInfo } = useContext(AuthContext);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  // Packages from screenshot
  const coinPackages = [
    { id: 1, coins: 30, price: 18.15 },
    { id: 2, coins: 100, price: 60.45 },
    { id: 3, coins: 150, price: 90.65 },
    { id: 4, coins: 300, price: 185.0 },
    { id: 5, coins: 500, price: 305.0 },
    { id: 6, coins: 1000, price: 605.0 },
    { id: 7, coins: 2000, price: 1209.0 },
  ];

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/wallet`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setBalance(res.data.balance);
      setLoading(false);
    } catch (e) {
      console.error("Error fetching wallet:", e);
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setCustomAmount(""); // Clear custom amount if package selected
  };

  const handleCustomAmountChange = (text) => {
    setCustomAmount(text);
    setSelectedPackage(null); // Deselect package if typing custom amount
  };

  const handleRecharge = () => {
    let amount = 0;
    let price = 0;

    if (selectedPackage) {
      amount = selectedPackage.coins;
      price = selectedPackage.price;
    } else if (customAmount) {
      amount = parseInt(customAmount);
      // Calculate price based on a rate, e.g., approx 0.6 EGP per coin based on packages
      price = amount * 0.605;
    } else {
      Alert.alert("تنبيه", "الرجاء اختيار باقة أو إدخال مبلغ");
      return;
    }

    Alert.alert(
      "تأكيد الشراء",
      `شراء ${amount} عملة مقابل ج.م. ${price.toFixed(2)}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد الدفع",
          onPress: () => processPayment(amount),
        },
      ]
    );
  };

  const processPayment = async (amount) => {
    setLoading(true);
    setTimeout(async () => {
      try {
        const res = await axios.post(
          `${BASE_URL}/wallet/topup`,
          {
            amount: amount,
            transactionId: `MOCK-PAY-${Date.now()}`,
          },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        setBalance(res.data.balance);
        setLoading(false);
        Alert.alert("نجاح", "تم شحن الرصيد بنجاح! 🎉");
      } catch (e) {
        setLoading(false);
        Alert.alert("خطأ", "فشلت عملية الشراء");
      }
    }, 1500);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FE2C55" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>احصل على عملات</Text>
        <TouchableOpacity
          onPress={() => Alert.alert("سجل المعاملات", "قريباً")}
        >
          <Text style={styles.historyText}>عرض سجل المعاملات</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {/* Placeholder for avatar if no image */}
              <Ionicons name="person-circle" size={40} color="#ccc" />
            </View>
            <View>
              <Text style={styles.username}>
                {userInfo?.username || "User"}
              </Text>
              <View style={styles.currentBalanceRow}>
                <Text style={styles.currentBalanceText}>
                  رصيد هدايا: $0.00 | LIVE: {balance}
                </Text>
                <CoinIcon size={14} />
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.promoText}>
          الشحن: وفر حوالي 25% مع رسوم خدمة أقل للجهات الخارجية. ⓘ
        </Text>

        {/* Packages Grid */}
        <View style={styles.gridContainer}>
          {coinPackages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.packageCard,
                selectedPackage?.id === pkg.id && styles.selectedPackageCard,
              ]}
              onPress={() => handleSelectPackage(pkg)}
            >
              <View style={styles.coinRow}>
                <Text style={styles.coinAmount}>{pkg.coins}</Text>
                <CoinIcon size={16} />
              </View>
              <Text style={styles.priceText}>ج.م. {pkg.price}</Text>
            </TouchableOpacity>
          ))}

          {/* Custom Amount Box */}
          <TouchableOpacity
            style={[
              styles.packageCard,
              styles.customAmountCard,
              !selectedPackage && customAmount
                ? styles.selectedPackageCard
                : {},
            ]}
            onPress={() => {}}
          >
            <View style={styles.coinRow}>
              <TextInput
                style={styles.customInput}
                placeholder="مبلغ مخصص"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                placeholderTextColor="#999"
              />
              <CoinIcon size={16} />
            </View>
            <Text style={styles.priceText}>
              {customAmount
                ? `ج.م. ${(parseInt(customAmount || 0) * 0.605).toFixed(0)}`
                : "---"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.giftPromo}>
          <Ionicons name="gift" size={24} color="#FE2C55" />
          <Text style={styles.giftText}>
            اشحن على الأقل بمقدار 1,000 عملة لمرتين أكثر كي تفتح هدايا مميزة،
            تنتهي الصلاحية بعد 5 س 39 د. {">"}
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={styles.paymentMethodRow}>
          <Text style={styles.paymentLabel}>طريقة الدفع</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardIcons}
          >
            <View style={styles.paymentIcon}>
              <FontAwesome5 name="cc-visa" size={24} color="#1A1F71" />
            </View>
            <View style={styles.paymentIcon}>
              <FontAwesome5 name="cc-mastercard" size={24} color="#EB001B" />
            </View>
            {/* Vodafone Cash */}
            <View style={styles.paymentIcon}>
              <FontAwesome5 name="mobile-alt" size={18} color="#E60000" />
              <Text style={styles.paymentTextSmall}>Cash</Text>
            </View>
            {/* Fawry */}
            <View style={[styles.paymentIcon, styles.paymentBadge]}>
              <Text style={[styles.paymentTextSmall, { color: "#1155cc" }]}>
                Fawry
              </Text>
            </View>
            {/* Meeza */}
            <View style={[styles.paymentIcon, styles.paymentBadge]}>
              <Text style={[styles.paymentTextSmall, { color: "#555" }]}>
                Meeza
              </Text>
            </View>
          </ScrollView>
        </View>
        <Text style={styles.totalText}>
          الإجمالي: ج.م.{" "}
          {selectedPackage
            ? selectedPackage.price
            : customAmount
            ? (parseInt(customAmount) * 0.605).toFixed(2)
            : "0.00"}
        </Text>
        <TouchableOpacity
          style={styles.rechargeButton}
          onPress={handleRecharge}
        >
          <Text style={styles.rechargeButtonText}>الشحن</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8", // Light gray background like screenshot
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row-reverse", // RTL Header
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  historyText: {
    fontSize: 12,
    color: "#333",
  },
  scrollContent: {
    paddingBottom: 180, // Increased space for larger footer
  },
  userInfoContainer: {
    backgroundColor: "#FFF",
    padding: 16,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  currentBalanceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  currentBalanceText: {
    fontSize: 12,
    color: "#666",
  },
  promoText: {
    fontSize: 12,
    color: "#FE2C55",
    textAlign: "right",
    margin: 16,
  },
  gridContainer: {
    flexDirection: "row-reverse", // RTL Grid
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  packageCard: {
    width: "48%", // 2 columns
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  selectedPackageCard: {
    borderColor: "#FE2C55",
    backgroundColor: "#FFF0F5", // Light pink
  },
  coinRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  coinAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  priceText: {
    fontSize: 14,
    color: "#666",
  },
  customAmountCard: {
    // Special styling for custom amount if needed
  },
  customInput: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    minWidth: 80,
  },
  giftPromo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 16,
    padding: 12,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  giftText: {
    flex: 1,
    fontSize: 12,
    color: "#333",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentMethodRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  cardIcons: {
    flexDirection: "row-reverse",
    gap: 8,
    alignItems: "center",
  },
  paymentIcon: {
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentBadge: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#F9F9F9",
  },
  paymentTextSmall: {
    fontSize: 10,
    fontWeight: "bold",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 12,
  },
  rechargeButton: {
    backgroundColor: "#FE2C55",
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
  },
  rechargeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default WalletScreen;
