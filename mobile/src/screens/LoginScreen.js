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
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import i18n from "../i18n";

// Enable RTL
// Enable RTL logic moved to index.js

const LoginScreen = ({ navigation }) => {
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
        title = "خطأ في الاتصال بالشبكة";
        message =
          "لا يمكن الوصول إلى الخادم. تحقق من اتصال الإنترنت الخاص بك والمحاولة مجدداً.";
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
          onPress={() => {
            setErrorModal({
              visible: true,
              title: "قيد الإعداد",
              message: "ميزة استعادة كلمة المرور قيد الإعداد حالياً.",
              type: "info",
            });
          }}
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
                    • تحقق من اتصال الإنترنت الخاص بك
                  </Text>
                  <Text style={styles.helpText}>
                    • حاول إعادة تشغيل الوي فاي أو البيانات الخلوية
                  </Text>
                  <Text style={styles.helpText}>• تأكد من أن الخادم متاح</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  logoImage: {
    width: "100%",
    height: "100%",
  },
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
    marginBottom: 40,
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
    marginTop: 28,
    shadowColor: "#FE2C55",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    backgroundColor: "rgba(254, 44, 85, 0.5)",
    opacity: 0.7,
  },
  forgotButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 10,
  },
  forgotText: {
    color: "#FE2C55",
    fontSize: 14,
    fontWeight: "600",
  },
  forgotTextDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 50,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#999",
  },
  link: {
    fontSize: 14,
    color: "#FE2C55",
    fontWeight: "700",
    marginLeft: 5,
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
  helpText: {
    fontSize: 12,
    color: "#CCC",
    marginBottom: 4,
    lineHeight: 16,
  },
  errorCodeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
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
  errorCodeText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "600",
  },
  technicalToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 10,
    gap: 8,
  },
  technicalToggleText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
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
  technicalLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
  },
  technicalValue: {
    color: "#CCC",
    fontSize: 12,
    flex: 1,
    textAlign: "left",
    marginLeft: 10,
  },
  technicalDivider: {
    height: 1,
    backgroundColor: "#333",
    marginVertical: 12,
  },
  technicalDetailsLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  technicalDetailsScroll: {
    maxHeight: 150,
  },
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
  copyButtonText: {
    color: "#FE2C55",
    fontSize: 12,
    fontWeight: "600",
  },
  errorButtonsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  errorButton: {
    backgroundColor: "#FE2C55",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FE2C55",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    flex: 1,
    flexDirection: "row",
    gap: 8,
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
    fontSize: 16,
    fontWeight: "700",
  },
});

export default LoginScreen;
