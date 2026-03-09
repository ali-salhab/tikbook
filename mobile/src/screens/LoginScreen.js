import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import i18n from "../i18n";
import { wp, ms, fs } from "../utils/responsive";

const LoginScreen = ({ navigation, route }) => {
  const { theme } = useApp();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "", // "network" | "credentials" | "server"
    errorCode: "",
    statusCode: null,
    timestamp: "",
    endpoint: "",
    technicalDetails: "",
  });
  const { login } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Show success message after registration
  useEffect(() => {
    if (route?.params?.registered) {
      Alert.alert(
        "✅ تم إنشاء الحساب",
        "تم التحقق من بريدك بنجاح! يمكنك الآن تسجيل الدخول.",
        [{ text: "حسناً" }],
      );
    }
    if (route?.params?.passwordReset) {
      Alert.alert(
        "✅ تم تغيير كلمة المرور",
        "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
        [{ text: "حسناً" }],
      );
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorModal({
        visible: true,
        title: "حقول المدخلات",
        message: "الرجاء إدخال البريد الإلكتروني وكلمة المرور",
        type: "validation",
        errorCode: "VALIDATION_ERROR",
        statusCode: null,
        timestamp: new Date().toISOString(),
        endpoint: "",
        technicalDetails: "Required fields: email, password",
      });
      return;
    }

    setLoading(true);
    setShowTechnicalDetails(false);
    try {
      await login(email, password);
      // Success - navigation handled by AuthContext
    } catch (err) {
      console.error("Login error:", err);

      // Categorize error type
      let errorType = "server";
      let title = "خطأ في تسجيل الدخول";
      let message = err.message;
      let errorCode = err.code || "UNKNOWN_ERROR";
      let statusCode = err.response?.status || null;
      let endpoint = "/auth/login";

      // Build technical details
      let technicalDetails = `Error: ${err.message}\n`;
      if (err.code) technicalDetails += `Code: ${err.code}\n`;
      if (err.response?.status)
        technicalDetails += `Status: ${err.response.status}\n`;
      if (err.response?.data) {
        technicalDetails += `Response: ${JSON.stringify(err.response.data, null, 2)}\n`;
      }
      technicalDetails += `Timestamp: ${new Date().toISOString()}`;

      // Network errors
      if (
        err.message?.includes("Network") ||
        err.code === "ECONNABORTED" ||
        err.code === "ENOTFOUND" ||
        err.code === "ERR_NETWORK" ||
        err.message?.includes("timeout") ||
        err.message?.includes("fetch")
      ) {
        errorType = "network";
        title = "خطأ في الاتصال بالخادم";
        message =
          "لا يمكن الوصول إلى الخادم. قد يكون الخادم في طور التشغيل (حتى 60 ثانية). جرب مرة أخرى.";
        errorCode = err.code || "ERR_NETWORK";
      }
      // Credentials errors
      else if (
        err.message?.includes("البريد الإلكتروني") ||
        err.message?.includes("كلمة المرور") ||
        err.message?.includes("not found") ||
        err.status === 401 ||
        err.response?.status === 401
      ) {
        errorType = "credentials";
        title = "بيانات دخول غير صحيحة";
        message =
          err.message ||
          "البريد الإلكتروني أو كلمة المرور غير صحيحة. الرجاء المحاولة مجدداً.";
        errorCode = "AUTH_FAILED";
      }
      // Server errors
      else if (err.response?.status >= 500) {
        errorType = "server";
        title = "خطأ في الخادم";
        message = "حدث خطأ على الخادم. الرجاء المحاولة مجدداً لاحقاً.";
        errorCode = `SERVER_ERROR_${err.response.status}`;
      }

      setErrorModal({
        visible: true,
        title,
        message,
        type: errorType,
        errorCode,
        statusCode,
        timestamp: new Date().toISOString(),
        endpoint,
        technicalDetails,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyErrorDetails = async () => {
    const details =
      `خطأ في تسجيل الدخول\n\n` +
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

  const retryLogin = () => {
    setErrorModal({ ...errorModal, visible: false });
    setTimeout(() => {
      handleLogin();
    }, 300);
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

        <Text style={styles.title}>{i18n.t("loginToTikBook")}</Text>
        <Text style={styles.subtitle}>{i18n.t("manageAccount")}</Text>

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
            selectTextOnFocus={!loading}
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
            selectTextOnFocus={!loading}
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
            (!email || !password || loading) && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={!email || !password || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>{i18n.t("logIn")}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={loading}
        >
          <Text
            style={[styles.forgotText, loading && styles.forgotTextDisabled]}
          >
            نسيت كلمة المرور؟
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{i18n.t("dontHaveAccount")}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
          >
            <Text style={[styles.link, loading && styles.linkDisabled]}>
              {i18n.t("signUp")}
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
              {/* Error Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor:
                      errorModal.type === "network"
                        ? "rgba(255, 107, 107, 0.1)"
                        : errorModal.type === "credentials"
                          ? "rgba(255, 193, 7, 0.1)"
                          : "rgba(76, 175, 80, 0.1)",
                  },
                ]}
              >
                <Ionicons
                  name={
                    errorModal.type === "network"
                      ? "cloud-offline"
                      : errorModal.type === "credentials"
                        ? "alert-circle"
                        : "information-circle"
                  }
                  size={40}
                  color={
                    errorModal.type === "network"
                      ? "#FF6B6B"
                      : errorModal.type === "credentials"
                        ? "#FFC107"
                        : "#4CAF50"
                  }
                />
              </View>

              <Text style={styles.errorTitle}>{errorModal.title}</Text>
              <Text style={styles.errorMessage}>{errorModal.message}</Text>

              {/* Error Code Badge */}
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

              {/* Network Error Help */}
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

              {/* Technical Details Toggle */}
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

              {/* Technical Details */}
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

              {/* Action Buttons */}
              <View style={styles.errorButtonsContainer}>
                {errorModal.type === "network" && (
                  <TouchableOpacity
                    style={[styles.errorButton, styles.retryButton]}
                    onPress={retryLogin}
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

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      justifyContent: "space-between",
      paddingHorizontal: ms(20),
    },
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: ms(110),
      height: ms(110),
      marginBottom: ms(30),
      borderRadius: ms(55),
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      backgroundColor: "rgba(254, 44, 85, 0.1)",
      borderWidth: 2,
      borderColor: "#FE2C55",
    },
    logoImage: {
      width: "100%",
      height: "100%",
    },
    title: {
      fontSize: fs(28),
      fontWeight: "bold",
      marginBottom: ms(8),
      textAlign: "center",
      color: theme.text,
      paddingHorizontal: ms(20),
    },
    subtitle: {
      fontSize: fs(14),
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: ms(40),
      paddingHorizontal: ms(20),
      lineHeight: ms(20),
    },
    inputContainer: {
      width: "100%",
      marginBottom: ms(16),
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
    },
    inputIcon: {
      position: "absolute",
      left: ms(12),
      zIndex: 1,
    },
    input: {
      flex: 1,
      height: ms(52),
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: ms(12),
      paddingHorizontal: ms(50),
      backgroundColor: theme.input,
      fontSize: fs(16),
      textAlign: "right",
      color: theme.text,
    },
    eyeIcon: {
      position: "absolute",
      right: ms(15),
      paddingVertical: ms(10),
      paddingHorizontal: ms(8),
    },
    button: {
      backgroundColor: "#FE2C55",
      height: ms(52),
      borderRadius: ms(12),
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      marginTop: ms(28),
      shadowColor: "#FE2C55",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
    },
    buttonText: {
      color: "#FFF",
      fontSize: fs(16),
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    buttonDisabled: {
      backgroundColor: "rgba(254, 44, 85, 0.5)",
      opacity: 0.7,
    },
    forgotButton: {
      marginTop: ms(16),
      alignItems: "center",
      paddingVertical: ms(10),
    },
    forgotText: {
      color: "#FE2C55",
      fontSize: fs(14),
      fontWeight: "600",
    },
    forgotTextDisabled: {
      opacity: 0.5,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: ms(50),
      marginBottom: ms(30),
      paddingHorizontal: ms(20),
    },
    footerText: {
      fontSize: fs(14),
      color: theme.textSecondary,
    },
    link: {
      fontSize: fs(14),
      color: "#FE2C55",
      fontWeight: "700",
      marginLeft: ms(5),
    },
    linkDisabled: {
      opacity: 0.5,
    },

    /* Error Modal */
    errorOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
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
    errorCodeContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: ms(10),
      marginBottom: ms(20),
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
    errorCodeText: {
      color: "#FF6B6B",
      fontSize: fs(12),
      fontWeight: "600",
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
    technicalDetailsScroll: {
      maxHeight: ms(150),
    },
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
      backgroundColor: "rgba(254, 44, 85, 0.1)",
      paddingVertical: ms(8),
      paddingHorizontal: ms(12),
      borderRadius: ms(8),
      marginTop: ms(12),
      gap: ms(6),
      borderWidth: 1,
      borderColor: "rgba(254, 44, 85, 0.3)",
    },
    copyButtonText: {
      color: "#FE2C55",
      fontSize: fs(12),
      fontWeight: "600",
    },
    errorButtonsContainer: {
      flexDirection: "row",
      gap: ms(10),
    },
    errorButton: {
      backgroundColor: "#FE2C55",
      height: ms(52),
      borderRadius: ms(12),
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#FE2C55",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
      flex: 1,
      flexDirection: "row",
      gap: ms(8),
    },
    retryButton: {
      backgroundColor: "#4CAF50",
      shadowColor: "#4CAF50",
    },
    dismissButton: {
      backgroundColor: "#666",
      shadowColor: "#666",
    },
    errorButtonText: {
      color: "#FFF",
      fontSize: fs(16),
      fontWeight: "700",
    },
  });

export default LoginScreen;
