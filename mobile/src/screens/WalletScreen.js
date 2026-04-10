import React, { useState, useEffect, useContext } from "react";
import GradientBackground from "../components/GradientBackground";
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
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import LottieView from "lottie-react-native";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { ms, fs } from "../utils/responsive";

// Coin Icon — matches live room balance chip style
const CoinIcon = ({ size = 20 }) => (
  <Ionicons name="logo-bitcoin" size={size} color="#FFD700" />
);

const WalletScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userToken, userInfo } = useContext(AuthContext);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [activeTab, setActiveTab] = useState("recharge"); // 'recharge' | 'withdraw'
  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Withdrawal form state
  const [withdrawFullName, setWithdrawFullName] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState([]);

  // Coin packages fetched from backend
  const [coinPackages, setCoinPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/wallet/packages`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setCoinPackages(res.data.packages || []);
    } catch (e) {
      console.error("Error fetching packages:", e);
    } finally {
      setPackagesLoading(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/wallet`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setBalance(res.data.balance ?? 0);
      setEarnings(res.data.earnings ?? 0);
      setLoading(false);
    } catch (e) {
      console.error("Error fetching wallet:", e);
      setLoading(false);
    }
  };

  const fetchMyWithdrawals = async () => {
    // We'll show the status from submission response
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
      "تأكيد الطلب",
      `إنشاء طلب شحن ${amount} عملة عبر Stripe مقابل ج.م. ${price.toFixed(2)}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إنشاء الطلب",
          onPress: () => processPayment(amount),
        },
      ],
    );
  };

  const processPayment = async (amount) => {
    setPaymentLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/wallet/topup/request`,
        {
          amount,
          paymentMethod: "visa",
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      if (!res.data.clientSecret || !res.data.paymentIntentId) {
        setPaymentLoading(false);
        Alert.alert("خطأ", "لم يتم تجهيز شاشة الدفع من Stripe");
        return;
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "TikBook",
        paymentIntentClientSecret: res.data.clientSecret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: userInfo?.username || "TikBook User",
        },
        returnURL: "tikbook://stripe-redirect",
      });

      if (initError) {
        await axios
          .post(
            `${BASE_URL}/wallet/topup/fail`,
            {
              reference: res.data.reference,
              reason: initError.message || "init_failed",
            },
            { headers: { Authorization: `Bearer ${userToken}` } },
          )
          .catch(() => {});
        setPaymentLoading(false);
        Alert.alert("خطأ", initError.message || "تعذر فتح شاشة الدفع");
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        await axios
          .post(
            `${BASE_URL}/wallet/topup/fail`,
            {
              reference: res.data.reference,
              reason:
                presentError.code || presentError.message || "payment_failed",
            },
            { headers: { Authorization: `Bearer ${userToken}` } },
          )
          .catch(() => {});
        setPaymentLoading(false);
        if (presentError.code === "Canceled") {
          Alert.alert("تم الإلغاء", "تم إلغاء عملية الدفع");
          return;
        }
        Alert.alert("خطأ", presentError.message || "فشلت عملية الدفع");
        return;
      }

      const confirmRes = await axios.post(
        `${BASE_URL}/wallet/topup/confirm`,
        {
          reference: res.data.reference,
          paymentIntentId: res.data.paymentIntentId,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      setBalance(confirmRes.data.wallet?.balance ?? balance);
      setPaymentLoading(false);
      setSelectedPackage(null);
      setCustomAmount("");
      Alert.alert("نجاح", "تم شحن الرصيد عبر Stripe بنجاح");
    } catch (e) {
      setPaymentLoading(false);
      const msg = e?.response?.data?.message || "فشلت عملية إنشاء الطلب";
      Alert.alert("خطأ", msg);
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!withdrawFullName.trim()) {
      Alert.alert("تنبيه", "الرجاء إدخال اسمك الكامل");
      return;
    }
    if (!withdrawPhone.trim()) {
      Alert.alert("تنبيه", "الرجاء إدخال رقم الهاتف");
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amt) || amt <= 0) {
      Alert.alert("تنبيه", "الرجاء إدخال مبلغ صحيح");
      return;
    }
    if (amt > earnings) {
      Alert.alert("خطأ", "المبلغ أكبر من أرباحك المتاحة");
      return;
    }
    setWithdrawLoading(true);
    try {
      await axios.post(
        `${BASE_URL}/wallet/withdraw`,
        {
          fullName: withdrawFullName.trim(),
          phoneNumber: withdrawPhone.trim(),
          amount: amt,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      setWithdrawLoading(false);
      setWithdrawFullName("");
      setWithdrawPhone("");
      setWithdrawAmount("");
      Alert.alert(
        "تم الإرسال ✅",
        `طلب سحب ${amt} عملة قيد المراجعة من قبل الأدمن\nسيتم التواصل معك عبر الهاتف: ${withdrawPhone}`,
      );
    } catch (e) {
      setWithdrawLoading(false);
      const msg = e?.response?.data?.message || "حدث خطأ، حاول مرة أخرى";
      Alert.alert("خطأ", msg);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <LottieView source={require("../../assets/lottie-loader.json")} style={{ width: 80, height: 80 }} autoPlay loop />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <GradientBackground />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#F0EEFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الرصيد</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "recharge" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("recharge")}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "recharge" && styles.tabBtnTextActive,
            ]}
          >
            شحن عملات
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            activeTab === "withdraw" && styles.tabBtnActive,
          ]}
          onPress={() => setActiveTab("withdraw")}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === "withdraw" && styles.tabBtnTextActive,
            ]}
          >
            سحب أرباح
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "recharge" ? (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* User Info */}
            <View style={styles.userInfoContainer}>
              <View style={styles.userInfo}>
                {userInfo?.profileImage ? (
                  <Image
                    source={{ uri: userInfo.profileImage }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {(userInfo?.username || "?").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.username}>
                    {userInfo?.username || "User"}
                  </Text>
                  <View style={styles.currentBalanceRow}>
                    <Text style={styles.currentBalanceText}>
                      رصيدك: {balance}
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
              {packagesLoading ? (
                <ActivityIndicator
                  color="#FE2C55"
                  size="large"
                  style={{ width: "100%", marginVertical: ms(20) }}
                />
              ) : coinPackages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    selectedPackage?.id === pkg.id &&
                      styles.selectedPackageCard,
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
                اشحن على الأقل بمقدار 1,000 عملة لمرتين أكثر كي تفتح هدايا مميزة{" "}
                {">"}
              </Text>
            </View>

            <View style={styles.paymentMethodsCard}>
              <Text style={styles.paymentMethodsTitle}>اختر طريقة الدفع</Text>

              <View style={[styles.paymentMethodOption, styles.paymentMethodOptionActive]}>
                <Ionicons name="card-outline" size={24} color="#1A1F71" />
                <Text style={styles.paymentMethodName}>Visa / MasterCard (Stripe)</Text>
              </View>

              <Text style={styles.paymentMethodHint}>
                سيتم فتح Stripe PaymentSheet لإتمام الدفع ببطاقتك، ثم يضاف
                الرصيد مباشرة بعد نجاح العملية.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentLabel}>طريقة الدفع</Text>
              <Text style={styles.paymentLabelValue}>Visa / MasterCard (Stripe)</Text>
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
              style={[
                styles.rechargeButton,
                paymentLoading && styles.disabledRechargeButton,
              ]}
              onPress={handleRecharge}
              disabled={paymentLoading}
            >
              {paymentLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.rechargeButtonText}>ادفع الآن</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* ── Withdraw Tab ── */
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 30) },
          ]}
        >
          {/* Earnings Balance Card */}
          <View style={styles.earningsCard}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={32}
              color="#FE2C55"
            />
            <View style={{ marginRight: 12 }}>
              <Text style={styles.earningsLabel}>أرباحك المتاحة للسحب</Text>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={styles.earningsAmount}>{earnings}</Text>
                <CoinIcon size={18} />
              </View>
            </View>
          </View>

          <Text style={styles.withdrawNote}>
            أدخل بياناتك وسيتواصل معك الأدمن لتحويل رصيدك
          </Text>

          {/* Form */}
          <View style={styles.withdrawForm}>
            <Text style={styles.inputLabel}>الاسم الكامل</Text>
            <TextInput
              style={styles.withdrawInput}
              placeholder="أدخل اسمك الكامل"
              placeholderTextColor="#999"
              value={withdrawFullName}
              onChangeText={setWithdrawFullName}
              textAlign="right"
            />

            <Text style={styles.inputLabel}>رقم الهاتف</Text>
            <TextInput
              style={styles.withdrawInput}
              placeholder="أدخل رقم هاتفك"
              placeholderTextColor="#999"
              value={withdrawPhone}
              onChangeText={setWithdrawPhone}
              keyboardType="phone-pad"
              textAlign="right"
            />

            <Text style={styles.inputLabel}>المبلغ المراد سحبه (عملات)</Text>
            <TextInput
              style={styles.withdrawInput}
              placeholder={`الحد الأقصى: ${earnings}`}
              placeholderTextColor="#999"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              textAlign="right"
            />

            <TouchableOpacity
              style={[
                styles.rechargeButton,
                withdrawLoading && { opacity: 0.6 },
              ]}
              onPress={handleWithdrawSubmit}
              disabled={withdrawLoading}
            >
              {withdrawLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.rechargeButtonText}>إرسال طلب السحب</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.withdrawInfoBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="rgba(160,140,255,0.7)"
            />
            <Text style={styles.withdrawInfoText}>
              سيتم مراجعة طلبك من قبل الإدارة وسيتم التواصل معك على رقم هاتفك
              المسجل خلال 24 – 48 ساعة.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2550",
  },
  headerTitle: {
    fontSize: fs(16),
    fontWeight: "bold",
    color: "#F0EEFF",
  },
  historyText: {
    fontSize: fs(12),
    color: "#333",
  },
  scrollContent: {
    paddingBottom: ms(180),
  },
  userInfoContainer: {
    backgroundColor: "#151228",
    padding: ms(16),
    marginBottom: ms(8),
  },
  userInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(12),
  },
  avatarImage: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
  },
  avatarFallback: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: "#3B2F6B",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#F0EEFF",
    fontSize: fs(16),
    fontWeight: "bold",
  },
  username: {
    fontSize: fs(14),
    fontWeight: "bold",
    color: "#F0EEFF",
    textAlign: "right",
  },
  currentBalanceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(4),
  },
  currentBalanceText: {
    fontSize: fs(12),
    color: "rgba(220,210,255,0.75)",
  },
  promoText: {
    fontSize: fs(12),
    color: "#FE2C55",
    textAlign: "right",
    margin: ms(16),
  },
  gridContainer: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
  },
  packageCard: {
    width: "48%",
    backgroundColor: "#151228",
    borderRadius: ms(8),
    padding: ms(16),
    alignItems: "center",
    marginBottom: ms(12),
    borderWidth: 1,
    borderColor: "#2A2550",
  },
  selectedPackageCard: {
    borderColor: "#FE2C55",
    backgroundColor: "rgba(254,44,85,0.1)",
  },
  coinRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(4),
    marginBottom: ms(8),
  },
  coinAmount: {
    fontSize: fs(18),
    fontWeight: "bold",
    color: "#F0EEFF",
  },
  priceText: {
    fontSize: fs(14),
    color: "rgba(220,210,255,0.75)",
  },
  customAmountCard: {},
  customInput: {
    fontSize: fs(18),
    fontWeight: "bold",
    textAlign: "center",
    minWidth: ms(80),
  },
  giftPromo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#151228",
    margin: ms(16),
    padding: ms(12),
    borderRadius: ms(8),
    gap: ms(12),
    borderWidth: 1,
    borderColor: "#2A2550",
  },
  giftText: {
    flex: 1,
    fontSize: fs(12),
    color: "rgba(220,210,255,0.85)",
    textAlign: "right",
  },
  paymentMethodsCard: {
    backgroundColor: "#151228",
    marginHorizontal: ms(16),
    marginBottom: ms(16),
    borderRadius: ms(12),
    padding: ms(16),
    borderWidth: 1,
    borderColor: "#2A2550",
    gap: ms(10),
  },
  paymentMethodsTitle: {
    fontSize: fs(14),
    fontWeight: "bold",
    color: "#F0EEFF",
    textAlign: "right",
  },
  paymentMethodsRow: {
    flexDirection: "row-reverse",
    gap: ms(10),
  },
  paymentMethodOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2A2550",
    borderRadius: ms(12),
    paddingVertical: ms(12),
    paddingHorizontal: ms(10),
    alignItems: "center",
    justifyContent: "center",
    gap: ms(6),
    backgroundColor: "#1A1630",
  },
  paymentMethodOptionActive: {
    borderColor: "#FE2C55",
    backgroundColor: "rgba(254,44,85,0.12)",
  },
  paymentMethodName: {
    fontSize: fs(11),
    fontWeight: "700",
    color: "#F0EEFF",
    textAlign: "center",
  },
  paymentMethodHint: {
    fontSize: fs(11),
    color: "rgba(220,210,255,0.7)",
    textAlign: "right",
    lineHeight: ms(18),
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0E0B1E",
    padding: ms(16),
    borderTopWidth: 1,
    borderTopColor: "#2A2550",
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
    marginBottom: ms(12),
  },
  paymentLabel: {
    fontSize: fs(14),
    color: "rgba(220,210,255,0.8)",
    marginLeft: ms(8),
  },
  paymentLabelValue: {
    fontSize: fs(13),
    color: "#F0EEFF",
    fontWeight: "700",
  },
  cardIcons: {
    flexDirection: "row-reverse",
    gap: ms(8),
    alignItems: "center",
  },
  paymentIcon: {
    marginHorizontal: ms(4),
    alignItems: "center",
    justifyContent: "center",
  },
  paymentBadge: {
    borderWidth: 1,
    borderColor: "#2A2550",
    borderRadius: ms(4),
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    backgroundColor: "#151228",
  },
  paymentTextSmall: {
    fontSize: fs(10),
    fontWeight: "bold",
  },
  totalText: {
    fontSize: fs(16),
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: ms(12),
  },
  rechargeButton: {
    backgroundColor: "#FE2C55",
    paddingVertical: ms(14),
    borderRadius: ms(4),
    alignItems: "center",
  },
  disabledRechargeButton: {
    opacity: 0.7,
  },
  rechargeButtonText: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "bold",
  },
  // ── Tabs ──
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#2A2550",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: ms(12),
    alignItems: "center",
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#FE2C55",
  },
  tabBtnText: {
    fontSize: fs(14),
    color: "rgba(220,210,255,0.55)",
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#FE2C55",
  },
  // ── Withdraw ──
  earningsCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "#151228",
    margin: ms(16),
    padding: ms(20),
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: "rgba(254,44,85,0.3)",
    gap: ms(12),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  earningsLabel: {
    fontSize: fs(13),
    color: "rgba(220,210,255,0.75)",
    textAlign: "right",
    marginBottom: ms(4),
  },
  earningsAmount: {
    fontSize: fs(28),
    fontWeight: "bold",
    color: "#F0EEFF",
  },
  withdrawNote: {
    fontSize: fs(13),
    color: "rgba(220,210,255,0.75)",
    textAlign: "center",
    marginHorizontal: ms(16),
    marginBottom: ms(16),
  },
  withdrawForm: {
    backgroundColor: "#151228",
    marginHorizontal: ms(16),
    borderRadius: ms(12),
    padding: ms(16),
    gap: ms(4),
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  inputLabel: {
    fontSize: fs(13),
    color: "rgba(220,210,255,0.85)",
    textAlign: "right",
    marginTop: ms(12),
    marginBottom: ms(4),
    fontWeight: "600",
  },
  withdrawInput: {
    borderWidth: 1,
    borderColor: "#2A2550",
    borderRadius: ms(8),
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    fontSize: fs(15),
    backgroundColor: "#1A1630",
    color: "#F0EEFF",
  },
  withdrawInfoBox: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    backgroundColor: "#151228",
    margin: ms(16),
    marginTop: ms(20),
    padding: ms(14),
    borderRadius: ms(10),
    gap: ms(8),
  },
  withdrawInfoText: {
    flex: 1,
    fontSize: fs(12),
    color: "rgba(220,210,255,0.7)",
    textAlign: "right",
    lineHeight: ms(20),
  },
});

export default WalletScreen;
