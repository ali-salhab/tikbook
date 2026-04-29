import React, { useState, useEffect, useContext, useCallback } from "react";
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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { CardField, useConfirmPayment } from "@stripe/stripe-react-native";
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
  const { confirmPayment } = useConfirmPayment();
  const [cardComplete, setCardComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("recharge"); // 'recharge' | 'withdraw'
  const [balance, setBalance] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [earningsUsd, setEarningsUsd] = useState(0);
  const [usdPerCoin, setUsdPerCoin] = useState(0.01);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Withdrawal form state
  const [withdrawFullName, setWithdrawFullName] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(""); // USD amount entered
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState([]);

  // Coin packages fetched from backend
  const [coinPackages, setCoinPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    fetchWalletData();
    fetchPackages();
    fetchMyWithdrawals();
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
      setEarningsUsd(res.data.earningsUsd ?? 0);
      if (res.data.usdPerCoin) setUsdPerCoin(res.data.usdPerCoin);
      setLoading(false);
    } catch (e) {
      console.error("Error fetching wallet:", e);
      setLoading(false);
    }
  };

  const fetchMyWithdrawals = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/wallet/withdrawals/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setMyWithdrawals(res.data?.requests || []);
      if (res.data?.usdPerCoin) setUsdPerCoin(res.data.usdPerCoin);
    } catch (e) {
      console.log("Error fetching withdrawals:", e?.message);
    }
  };

  const handleRefreshWallet = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchWalletData(), fetchMyWithdrawals(), fetchPackages()]);
    } catch (_) {}
    setRefreshing(false);
  }, [userToken]);

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setCustomAmount(""); // Clear custom amount if package selected
  };

  const handleCustomAmountChange = (text) => {
    setCustomAmount(text);
    setSelectedPackage(null); // Deselect package if typing custom amount
  };

  const handleRecharge = () => {
    if (!selectedPackage && !customAmount) {
      Alert.alert("تنبيه", "الرجاء اختيار باقة أو إدخال مبلغ");
      return;
    }
    if (!cardComplete) {
      Alert.alert("تنبيه", "الرجاء إدخال بيانات البطاقة كاملة");
      return;
    }
    const amount = selectedPackage
      ? selectedPackage.coins
      : parseInt(customAmount || "0");
    processPayment(amount);
  };

  const processPayment = async (amount) => {
    setPaymentLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/wallet/topup/request`,
        { amount, paymentMethod: "visa" },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      if (!res.data.clientSecret || !res.data.paymentIntentId) {
        setPaymentLoading(false);
        Alert.alert("خطأ", "لم يتم تجهيز الدفع من Stripe");
        return;
      }

      const { error, paymentIntent } = await confirmPayment(res.data.clientSecret, {
        paymentMethodType: "Card",
        paymentMethodData: {
          billingDetails: { name: userInfo?.username || "TikBook User" },
        },
      });

      if (error) {
        await axios
          .post(
            `${BASE_URL}/wallet/topup/fail`,
            { reference: res.data.reference, reason: error.code || error.message || "payment_failed" },
            { headers: { Authorization: `Bearer ${userToken}` } },
          )
          .catch(() => {});
        setPaymentLoading(false);
        Alert.alert("خطأ", error.message || "فشلت عملية الدفع");
        return;
      }

      const confirmRes = await axios.post(
        `${BASE_URL}/wallet/topup/confirm`,
        { reference: res.data.reference, paymentIntentId: res.data.paymentIntentId },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      setBalance(confirmRes.data.wallet?.balance ?? balance);
      setPaymentLoading(false);
      setSelectedPackage(null);
      setCustomAmount("");
      setCardComplete(false);
      Alert.alert("نجاح ✅", "تم شحن رصيدك بنجاح");
    } catch (e) {
      setPaymentLoading(false);
      const msg = e?.response?.data?.message || "فشلت عملية الدفع";
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
    const amtUsd = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amtUsd) || amtUsd <= 0) {
      Alert.alert("تنبيه", "الرجاء إدخال مبلغ صحيح بالدولار");
      return;
    }
    if (amtUsd > earningsUsd) {
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
          amountUsd: amtUsd,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      setWithdrawLoading(false);
      setWithdrawFullName("");
      setWithdrawPhone("");
      setWithdrawAmount("");
      await fetchMyWithdrawals();
      await fetchWalletData();
      Alert.alert(
        "تم الإرسال ✅",
        `طلب سحب بقيمة $${amtUsd.toFixed(2)} قيد المراجعة من قبل الأدمن\nسيتم التواصل معك عبر الهاتف: ${withdrawPhone}`,
        [
          {
            text: "تتبع الطلب",
            onPress: () => navigation.navigate("WithdrawalsTracking"),
          },
          { text: "حسناً" },
        ],
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
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
                  color="#FF2D92"
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
              <Ionicons name="gift" size={24} color="#FF2D92" />
              <Text style={styles.giftText}>
                اشحن على الأقل بمقدار 1,000 عملة لمرتين أكثر كي تفتح هدايا مميزة{" "}
                {">"}
              </Text>
            </View>

              <View style={styles.paymentMethodsCard}>
              <View style={styles.paymentCardHeader}>
                <Ionicons name="card-outline" size={18} color="#A78BFA" />
                <Text style={styles.paymentMethodsTitle}>بيانات البطاقة</Text>
              </View>
              {/* Force LTR so card fields show: number | expiry | CVC */}
              <View style={{ direction: "ltr", alignSelf: "stretch" }}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{ number: "4242 4242 4242 4242" }}
                  cardStyle={{
                    backgroundColor: "#1A1630",
                    textColor: "#F0EEFF",
                    placeholderColor: "#7A7099",
                    borderColor: "#3D3570",
                    borderWidth: 1,
                    borderRadius: 10,
                    fontSize: 16,
                  }}
                  style={{ width: "100%", height: ms(54), marginVertical: ms(4) }}
                  onCardChange={(details) => setCardComplete(details.complete)}
                />
              </View>
              {cardComplete && (
                <View style={styles.cardReadyRow}>
                  <Ionicons name="checkmark-circle" size={15} color="#00BB55" />
                  <Text style={styles.cardReadyText}>البطاقة جاهزة</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
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
        </KeyboardAvoidingView>
      ) : (
        /* ── Withdraw Tab ── */
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 30) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefreshWallet}
              tintColor="#FF2D92"
              colors={["#FF2D92"]}
            />
          }
        >
          {/* Earnings Balance Card — USD */}
          <View style={styles.earningsCard}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={32}
              color="#FF2D92"
            />
            <View style={{ marginRight: 12, flex: 1 }}>
              <Text style={styles.earningsLabel}>أرباحك المتاحة للسحب</Text>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={styles.earningsAmount}>
                  ${Number(earningsUsd || 0).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.earningsSubLabel}>
                ({earnings} {earnings === 1 ? "عملة" : "عملة"} • سعر التحويل: 1
                عملة = ${Number(usdPerCoin || 0).toFixed(4)})
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.trackingLinkBtn}
            onPress={() => navigation.navigate("WithdrawalsTracking")}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt-outline" size={18} color="#FFF" />
            <Text style={styles.trackingLinkText}>تتبع طلبات السحب</Text>
            {myWithdrawals.length > 0 && (
              <View style={styles.trackingBadge}>
                <Text style={styles.trackingBadgeText}>
                  {myWithdrawals.length}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-back" size={18} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.withdrawNote}>
            أدخل بياناتك وسيتواصل معك الأدمن لتحويل رصيدك (المعاملات بالدولار
            الأمريكي)
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

            <Text style={styles.inputLabel}>المبلغ المراد سحبه (USD)</Text>
            <View style={styles.usdInputWrapper}>
              <Text style={styles.usdPrefix}>$</Text>
              <TextInput
                style={[styles.withdrawInput, styles.usdInput]}
                placeholder={`الحد الأقصى: $${Number(earningsUsd || 0).toFixed(2)}`}
                placeholderTextColor="#999"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="decimal-pad"
                textAlign="right"
              />
            </View>
            {!!withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
              <Text style={styles.equivalentText}>
                ≈{" "}
                {usdPerCoin > 0
                  ? Math.round(parseFloat(withdrawAmount) / usdPerCoin)
                  : 0}{" "}
                عملة
              </Text>
            )}

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
    paddingBottom: ms(24),
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
    color: "#FF2D92",
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
    borderColor: "#FF2D92",
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
  paymentCardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(6),
  },
  cardReadyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: ms(5),
    marginTop: ms(2),
  },
  cardReadyText: {
    color: "#00BB55",
    fontSize: fs(12),
    fontWeight: "600",
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
    borderColor: "#FF2D92",
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
    color: "#F0EEFF",
    textAlign: "right",
    marginBottom: ms(12),
  },
  rechargeButton: {
    backgroundColor: "#FF2D92",
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
    borderBottomColor: "#FF2D92",
  },
  tabBtnText: {
    fontSize: fs(14),
    color: "rgba(220,210,255,0.55)",
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: "#FF2D92",
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
  earningsSubLabel: {
    fontSize: fs(11),
    color: "rgba(220,210,255,0.5)",
    textAlign: "right",
    marginTop: ms(4),
  },
  trackingLinkBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "rgba(124,93,250,0.18)",
    borderWidth: 1,
    borderColor: "rgba(160,140,255,0.45)",
    marginHorizontal: ms(16),
    marginBottom: ms(12),
    paddingHorizontal: ms(14),
    paddingVertical: ms(11),
    borderRadius: ms(10),
    gap: ms(8),
  },
  trackingLinkText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: fs(14),
    flex: 1,
    textAlign: "right",
  },
  trackingBadge: {
    backgroundColor: "#FF2D92",
    minWidth: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    paddingHorizontal: ms(6),
    alignItems: "center",
    justifyContent: "center",
  },
  trackingBadgeText: {
    color: "#FFF",
    fontSize: fs(11),
    fontWeight: "700",
  },
  usdInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  usdPrefix: {
    position: "absolute",
    left: ms(12),
    top: 0,
    bottom: 0,
    textAlignVertical: "center",
    color: "#FF2D92",
    fontWeight: "700",
    fontSize: fs(16),
    zIndex: 2,
    lineHeight: ms(40),
  },
  usdInput: {
    flex: 1,
    paddingLeft: ms(28),
  },
  equivalentText: {
    fontSize: fs(11),
    color: "rgba(220,210,255,0.6)",
    textAlign: "left",
    marginTop: ms(4),
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
