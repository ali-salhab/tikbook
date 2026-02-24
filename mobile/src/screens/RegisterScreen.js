import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import i18n from "../i18n";
import axios from "axios";

// Enable RTL logic moved to index.js

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "",
    errorCode: "",
    statusCode: null,
    timestamp: "",
    endpoint: "",
    technicalDetails: "",
  });
  const { BASE_URL } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const showError = (title, message, type = "server", extra = {}) => {
    setErrorModal({
      visible: true,
      title,
      message,
      type,
      errorCode: extra.errorCode || "ERROR",
      statusCode: extra.statusCode || null,
      timestamp: new Date().toISOString(),
      endpoint: extra.endpoint || "/auth/send-otp",
      technicalDetails: extra.technicalDetails || message,
    });
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      showError(
        "حقول مطلوبة",
        "يرجى ملء جميع الحقول: الاسم والبريد الإلكتروني وكلمة المرور",
        "validation",
        { errorCode: "VALIDATION_REQUIRED" },
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(
        "بريد إلكتروني غير صحيح",
        "يرجى إدخال عنوان بريد إلكتروني صحيح مثل: example@domain.com",
        "validation",
        { errorCode: "INVALID_EMAIL" },
      );
      return;
    }

    if (password.length < 6) {
      showError(
        "كلمة مرور قصيرة",
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        "validation",
        { errorCode: "PASSWORD_TOO_SHORT" },
      );
      return;
    }

    setLoading(true);
    setShowTechnicalDetails(false);
    try {
      console.log("📤 Sending OTP to:", email);
      const sendRequest = async (base) =>
        axios.post(`${base}/auth/send-otp`, { email }, { timeout: 60000 });

      let response;
      try {
        response = await sendRequest(BASE_URL);
      } catch (primaryErr) {
        console.log(
          "⚠️ Primary OTP request failed, retrying...",
          primaryErr.message,
        );
        response = await sendRequest("https://tikbook-1cdb.onrender.com/api");
      }

      console.log("✅ OTP Sent:", response.data);
      navigation.navigate("OTP", {
        username,
        email,
        password,
        devOtp: response.data.dev_otp,
      });

      if (response.data.dev_otp) {
        setTimeout(() => {
          Alert.alert(
            "⚠️ وضع التطوير",
            `رمز التحقق للاختبار:\n${response.data.dev_otp}\n\nأدخله في الشاشة التالية.`,
          );
        }, 500);
      }
    } catch (error) {
      console.log("❌ OTP Send Failed:", error.message);
      let title = "خطأ في إنشاء الحساب";
      let message =
        error.response?.data?.message ||
        error.message ||
        "فشل إرسال رمز التحقق";
      let type = "server";
      let errorCode = error.code || "UNKNOWN_ERROR";
      const statusCode = error.response?.status || null;

      let technicalDetails = `Error: ${error.message}\n`;
      if (error.code) technicalDetails += `Code: ${error.code}\n`;
      if (statusCode) technicalDetails += `Status: ${statusCode}\n`;
      if (error.response?.data)
        technicalDetails += `Response: ${JSON.stringify(error.response.data, null, 2)}\n`;
      technicalDetails += `Timestamp: ${new Date().toISOString()}`;

      if (
        error.message?.includes("Network") ||
        error.code === "ECONNABORTED" ||
        error.code === "ENOTFOUND" ||
        error.code === "ERR_NETWORK" ||
        error.message?.includes("timeout")
      ) {
        type = "network";
        title = "خطأ في الاتصال بالخادم";
        message =
          "لا يمكن الوصول إلى الخادم. قد يكون الخادم في طور التشغيل (حتى 60 ثانية). جرب مرة أخرى.";
        errorCode = error.code || "ERR_NETWORK";
      } else if (
        statusCode === 409 ||
        message.toLowerCase().includes("exist") ||
        message.includes("مستخدم")
      ) {
        type = "credentials";
        title = "الحساب موجود مسبقاً";
        errorCode = "USER_EXISTS";
      } else if (statusCode >= 500) {
        type = "server";
        title = "خطأ في الخادم";
        message = "حدث خطأ على الخادم. الرجاء المحاولة مجدداً لاحقاً.";
        errorCode = `SERVER_ERROR_${statusCode}`;
      }

      showError(title, message, type, {
        errorCode,
        statusCode,
        endpoint: "/auth/send-otp",
        technicalDetails,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyErrorDetails = async () => {
    const details =
      `خطأ في إنشاء الحساب\n\n` +
      `العنوان: ${errorModal.title}\n` +
      `الرسالة: ${errorModal.message}\n` +
      `النوع: ${errorModal.type}\n` +
      `رمز الخطأ: ${errorModal.errorCode}\n` +
      `${errorModal.statusCode ? `رمز الحالة: ${errorModal.statusCode}\n` : ""}` +
      `الوقت: ${errorModal.timestamp}\n` +
      `نقطة النهاية: ${errorModal.endpoint}\n\n` +
      `التفاصيل التقنية:\n${errorModal.technicalDetails}`;
    await Clipboard.setStringAsync(details);
    Alert.alert("تم النسخ", "تم نسخ تفاصيل الخطأ إلى الحافظة");
  };

  const retryRegister = () => {
    setErrorModal({ ...errorModal, visible: false });
    setTimeout(() => handleRegister(), 300);
  };

  const handleOAuthLogin = (provider) => {
    Alert.alert("قريباً", `سيتم إضافة تسجيل الدخول عبر ${provider} قريباً`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!loading}
        contentContainerStyle={{
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
          paddingHorizontal: 20,
        }}
      >
        <Animated.View style={{ alignItems: "center" }}>
          <View style={styles.logo}>
            <Image
              source={require("../../assets/logo.jpg")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Text style={styles.title}>{i18n.t("signUpForTikBook")}</Text>
        <Text style={styles.subtitle}>{i18n.t("createProfile")}</Text>

        <View style={styles.inputContainer}>
          <Ionicons
            name="person-outline"
            size={20}
            color="#FE2C55"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.t("username")}
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
            editable={!loading}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#FE2C55"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.t("email")}
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#FE2C55"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={i18n.t("password")}
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            disabled={loading}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={loading ? "#666" : "#888"}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!username || !email || !password || loading) &&
              styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={!username || !email || !password || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>{i18n.t("signUp")}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{i18n.t("alreadyHaveAccount")}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            disabled={loading}
          >
            <Text style={[styles.link, loading && styles.linkDisabled]}>
              {i18n.t("logIn")}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.errorOverlay}>
          <View style={styles.errorBox}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: "100%" }}
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor:
                      errorModal.type === "network"
                        ? "rgba(255, 107, 107, 0.1)"
                        : errorModal.type === "credentials"
                          ? "rgba(255, 193, 7, 0.1)"
                          : errorModal.type === "validation"
                            ? "rgba(33, 150, 243, 0.1)"
                            : "rgba(76, 175, 80, 0.1)",
                  },
                ]}
              >
                <Ionicons
                  name={
                    errorModal.type === "network"
                      ? "cloud-offline"
                      : errorModal.type === "credentials"
                        ? "person-circle"
                        : errorModal.type === "validation"
                          ? "alert-circle"
                          : "information-circle"
                  }
                  size={40}
                  color={
                    errorModal.type === "network"
                      ? "#FF6B6B"
                      : errorModal.type === "credentials"
                        ? "#FFC107"
                        : errorModal.type === "validation"
                          ? "#2196F3"
                          : "#4CAF50"
                  }
                />
              </View>

              <Text style={styles.errorTitle}>{errorModal.title}</Text>
              <Text style={styles.errorMessage}>{errorModal.message}</Text>

              <View style={styles.errorCodeContainer}>
                <View style={styles.errorCodeBadge}>
                  <Ionicons name="bug" size={14} color="#FF6B6B" />
                  <Text style={styles.errorCodeText}>
                    {errorModal.errorCode}
                  </Text>
                </View>
                {errorModal.statusCode && (
                  <View style={styles.errorCodeBadge}>
                    <Ionicons
                      name="information-circle"
                      size={14}
                      color="#FF6B6B"
                    />
                    <Text style={styles.errorCodeText}>
                      HTTP {errorModal.statusCode}
                    </Text>
                  </View>
                )}
              </View>

              {errorModal.type === "network" && (
                <View style={styles.helpBox}>
                  <Text style={styles.helpTitle}>اقتراحات:</Text>
                  <Text style={styles.helpText}>
                    • قد يكون الخادم في طور البدء (التجهيز البارد) — أعد
                    المحاولة
                  </Text>
                  <Text style={styles.helpText}>• تحقق من اتصال الإنترنت</Text>
                  <Text style={styles.helpText}>
                    • جرب الاتصال بالواي فاي أو بيانات الهاتف
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.technicalToggle}
                onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
              >
                <Ionicons
                  name={showTechnicalDetails ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#888"
                />
                <Text style={styles.technicalToggleText}>
                  {showTechnicalDetails
                    ? "إخفاء التفاصيل التقنية"
                    : "عرض التفاصيل التقنية"}
                </Text>
              </TouchableOpacity>

              {showTechnicalDetails && (
                <View style={styles.technicalDetailsBox}>
                  <View style={styles.technicalRow}>
                    <Text style={styles.technicalLabel}>الوقت:</Text>
                    <Text style={styles.technicalValue}>
                      {new Date(errorModal.timestamp).toLocaleString("ar-EG")}
                    </Text>
                  </View>
                  <View style={styles.technicalRow}>
                    <Text style={styles.technicalLabel}>نقطة النهاية:</Text>
                    <Text style={styles.technicalValue}>
                      {errorModal.endpoint}
                    </Text>
                  </View>
                  <View style={styles.technicalDivider} />
                  <Text style={styles.technicalDetailsLabel}>
                    التفاصيل الكاملة:
                  </Text>
                  <ScrollView
                    style={styles.technicalDetailsScroll}
                    nestedScrollEnabled
                  >
                    <Text style={styles.technicalDetailsContent}>
                      {errorModal.technicalDetails}
                    </Text>
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={copyErrorDetails}
                  >
                    <Ionicons name="copy-outline" size={16} color="#FE2C55" />
                    <Text style={styles.copyButtonText}>نسخ التفاصيل</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.errorButtonsContainer}>
                {errorModal.type === "network" && (
                  <TouchableOpacity
                    style={[styles.errorButton, styles.retryButton]}
                    onPress={retryRegister}
                  >
                    <Ionicons name="refresh" size={18} color="#FFF" />
                    <Text style={styles.errorButtonText}>إعادة المحاولة</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.errorButton,
                    errorModal.type === "network" && styles.dismissButton,
                  ]}
                  onPress={() =>
                    setErrorModal({ ...errorModal, visible: false })
                  }
                >
                  <Text style={styles.errorButtonText}>
                    {errorModal.type === "network" ? "إغلاق" : "فهمت"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 30,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(254, 44, 85, 0.1)",
    borderWidth: 2,
    borderColor: "#FE2C55",
  },
  logoImage: { width: "100%", height: "100%" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#FFF",
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 50,
    backgroundColor: "#1a1a1a",
    fontSize: 16,
    textAlign: "right",
    color: "#FFF",
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  button: {
    backgroundColor: "#FE2C55",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    shadowColor: "#FE2C55",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "rgba(254, 44, 85, 0.5)",
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  footerText: { fontSize: 14, color: "#999" },
  link: { fontSize: 14, color: "#FE2C55", fontWeight: "700", marginLeft: 5 },
  linkDisabled: { opacity: 0.5 },

  /* Error Modal */
  errorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#333",
    width: "100%",
    maxHeight: "85%",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#CCC",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  errorCodeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  errorCodeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  errorCodeText: { color: "#FF6B6B", fontSize: 12, fontWeight: "600" },
  helpBox: {
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFC107",
    marginBottom: 8,
  },
  helpText: { fontSize: 12, color: "#CCC", marginBottom: 4, lineHeight: 16 },
  technicalToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 10,
    gap: 8,
  },
  technicalToggleText: { color: "#888", fontSize: 13, fontWeight: "600" },
  technicalDetailsBox: {
    backgroundColor: "#0a0a0a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  technicalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  technicalLabel: { color: "#888", fontSize: 12, fontWeight: "600" },
  technicalValue: {
    color: "#CCC",
    fontSize: 12,
    flex: 1,
    textAlign: "left",
    marginLeft: 10,
  },
  technicalDivider: { height: 1, backgroundColor: "#333", marginVertical: 12 },
  technicalDetailsLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  technicalDetailsScroll: { maxHeight: 150 },
  technicalDetailsContent: {
    color: "#999",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 16,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(254, 44, 85, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(254, 44, 85, 0.3)",
  },
  copyButtonText: { color: "#FE2C55", fontSize: 12, fontWeight: "600" },
  errorButtonsContainer: { flexDirection: "row", gap: 10 },
  errorButton: {
    backgroundColor: "#FE2C55",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    shadowColor: "#FE2C55",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButton: { backgroundColor: "#4CAF50", shadowColor: "#4CAF50" },
  dismissButton: { backgroundColor: "#666", shadowColor: "#666" },
  errorButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

export default RegisterScreen;
