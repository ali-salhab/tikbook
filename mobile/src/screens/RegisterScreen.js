import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import i18n from "../i18n";
import axios from "axios";
import { ms, fs } from "../utils/responsive";
import BrandMark from "../components/BrandMark";
import { authScreenGradient, brandGradient, brandColors } from "../theme/brand";
import {
  AUTH,
  BUTTON_DISABLED_GRADIENT,
  AuthField,
  authFieldsAndButtonStyles,
  authFooterStyles,
} from "./authShared";

const RegisterScreen = ({ navigation }) => {
  const { theme } = useApp();
  const styles = makeStyles(theme);
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
        devOtp: response.data.dev_otp || null,
      });
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

  return (
    <LinearGradient
      colors={authScreenGradient.colors}
      locations={authScreenGradient.locations}
      start={authScreenGradient.start}
      end={authScreenGradient.end}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!loading}
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100%",
          }}
        >
          <Animated.View style={{ alignItems: "center" }}>
            <View style={styles.logoWrap}>
              <BrandMark size={104} style={styles.logoImage} resizeMode="contain" />
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: AUTH.title }]}>
            {i18n.t("signUpForTikBook")}
          </Text>
          <Text style={[styles.subtitle, { color: AUTH.subtitle }]}>
            {i18n.t("createProfile")}
          </Text>

          <AuthField
            styles={styles}
            theme={theme}
            placeholder={i18n.t("username")}
            value={username}
            onChangeText={setUsername}
            icon="person-outline"
            editable={!loading}
            selectTextOnFocus={!loading}
            autoCapitalize="none"
          />

          <AuthField
            styles={styles}
            theme={theme}
            placeholder={i18n.t("email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            icon="mail-outline"
            editable={!loading}
            selectTextOnFocus={!loading}
          />

          <AuthField
            styles={styles}
            theme={theme}
            placeholder={i18n.t("password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            icon="lock-closed-outline"
            editable={!loading}
            selectTextOnFocus={!loading}
            autoCapitalize="none"
            leftAccessory={
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={fs(20)}
                  color={loading ? "rgba(255,255,255,0.35)" : AUTH.icon}
                />
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            style={styles.buttonTouchable}
            onPress={handleRegister}
            disabled={!username || !email || !password || loading}
            activeOpacity={0.9}
          >
            {!username || !email || !password ? (
              <LinearGradient
                colors={BUTTON_DISABLED_GRADIENT}
                locations={brandGradient.locations}
                start={brandGradient.start}
                end={brandGradient.end}
                style={styles.buttonGradientOuter}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonTextMuted}>{i18n.t("signUp")}</Text>
                </View>
              </LinearGradient>
            ) : loading ? (
              <LinearGradient
                colors={brandGradient.colors}
                locations={brandGradient.locations}
                start={brandGradient.start}
                end={brandGradient.end}
                style={styles.buttonGradientOuter}
              >
                <View style={styles.buttonInner}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={brandGradient.colors}
                locations={brandGradient.locations}
                start={brandGradient.start}
                end={brandGradient.end}
                style={styles.buttonGradientOuter}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonTextGradient}>{i18n.t("signUp")}</Text>
                </View>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: AUTH.footerMuted }]}>
              {i18n.t("alreadyHaveAccount")}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.link,
                  { color: AUTH.link },
                  loading && styles.linkMuted,
                ]}
              >
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
                  {errorModal.statusCode ? (
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
                  ) : null}
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
                      <Ionicons name="copy-outline" size={16} color={AUTH.link} />
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
    </LinearGradient>
  );
};

const makeStyles = (theme) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: "transparent",
      justifyContent: "space-between",
      paddingHorizontal: ms(20),
    },
    ...authFieldsAndButtonStyles(theme),
    ...authFooterStyles(theme),

    errorOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: ms(24),
    },
    errorBox: {
      backgroundColor: theme.card,
      borderRadius: ms(20),
      paddingVertical: ms(30),
      paddingHorizontal: ms(20),
      borderWidth: 1,
      borderColor: theme.border,
      width: "100%",
      maxHeight: "85%",
    },
    iconContainer: {
      width: ms(80),
      height: ms(80),
      borderRadius: ms(40),
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "center",
      marginBottom: ms(20),
    },
    errorTitle: {
      fontSize: fs(18),
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: ms(8),
    },
    errorMessage: {
      fontSize: fs(14),
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: ms(20),
      lineHeight: ms(20),
      paddingHorizontal: ms(10),
    },
    errorCodeContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: ms(10),
      marginBottom: ms(20),
      flexWrap: "wrap",
    },
    errorCodeBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      paddingHorizontal: ms(12),
      paddingVertical: ms(6),
      borderRadius: ms(16),
      gap: ms(6),
      borderWidth: 1,
      borderColor: "rgba(255, 107, 107, 0.3)",
    },
    errorCodeText: { color: "#FF6B6B", fontSize: fs(12), fontWeight: "600" },
    helpBox: {
      backgroundColor: "rgba(255, 193, 7, 0.1)",
      borderLeftWidth: 4,
      borderLeftColor: "#FFC107",
      paddingVertical: ms(12),
      paddingHorizontal: ms(14),
      borderRadius: ms(8),
      marginBottom: ms(24),
    },
    helpTitle: {
      fontSize: fs(13),
      fontWeight: "700",
      color: "#FFC107",
      marginBottom: ms(8),
    },
    helpText: {
      fontSize: fs(12),
      color: "#CCC",
      marginBottom: ms(4),
      lineHeight: ms(16),
    },
    technicalToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: ms(12),
      marginBottom: ms(10),
      gap: ms(8),
    },
    technicalToggleText: {
      color: "#888",
      fontSize: fs(13),
      fontWeight: "600",
    },
    technicalDetailsBox: {
      backgroundColor: theme.bg2,
      borderRadius: ms(12),
      padding: ms(16),
      marginBottom: ms(20),
      borderWidth: 1,
      borderColor: theme.border,
    },
    technicalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: ms(8),
    },
    technicalLabel: {
      color: theme.textMuted,
      fontSize: fs(12),
      fontWeight: "600",
    },
    technicalValue: {
      color: theme.textSecondary,
      fontSize: fs(12),
      flex: 1,
      textAlign: "left",
      marginLeft: ms(10),
    },
    technicalDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: ms(12),
    },
    technicalDetailsLabel: {
      color: theme.textMuted,
      fontSize: fs(12),
      fontWeight: "600",
      marginBottom: ms(8),
    },
    technicalDetailsScroll: { maxHeight: ms(150) },
    technicalDetailsContent: {
      color: "#999",
      fontSize: fs(11),
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
      lineHeight: ms(16),
    },
    copyButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${brandColors.magenta}18`,
      paddingVertical: ms(8),
      paddingHorizontal: ms(12),
      borderRadius: ms(8),
      marginTop: ms(12),
      gap: ms(6),
      borderWidth: 1,
      borderColor: `${brandColors.magenta}44`,
    },
    copyButtonText: {
      color: AUTH.link,
      fontSize: fs(12),
      fontWeight: "600",
    },
    errorButtonsContainer: { flexDirection: "row", gap: ms(10) },
    errorButton: {
      backgroundColor: theme.accent,
      height: ms(52),
      borderRadius: ms(12),
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: ms(8),
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    retryButton: { backgroundColor: "#4CAF50", shadowColor: "#4CAF50" },
    dismissButton: { backgroundColor: "#666", shadowColor: "#666" },
    errorButtonText: { color: "#FFF", fontSize: fs(16), fontWeight: "700" },
  });

export default RegisterScreen;
