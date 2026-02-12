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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n";

// Enable RTL
// Enable RTL logic moved to index.js

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "", // "network" | "credentials" | "server"
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
      });
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Success - navigation handled by AuthContext
    } catch (err) {
      console.error("Login error:", err);

      // Categorize error type
      let errorType = "server";
      let title = "خطأ في تسجيل الدخول";
      let message = err.message;

      // Network errors
      if (
        err.message?.includes("Network") ||
        err.code === "ECONNABORTED" ||
        err.code === "ENOTFOUND" ||
        err.message?.includes("timeout") ||
        err.message?.includes("fetch")
      ) {
        errorType = "network";
        title = "خطأ في الاتصال بالشبكة";
        message =
          "لا يمكن الوصول إلى الخادم. تحقق من اتصال الإنترنت الخاص بك والمحاولة مجدداً.";
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
      }
      // Server errors
      else if (err.response?.status >= 500) {
        errorType = "server";
        title = "خطأ في الخادم";
        message = "حدث خطأ على الخادم. الرجاء المحاولة مجدداً لاحقاً.";
      }

      setErrorModal({
        visible: true,
        title,
        message,
        type: errorType,
      });
    } finally {
      setLoading(false);
    }
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

      {/* Simple Loading Overlay - Spinner Only */}
      {loading && (
        <View style={styles.simpleLoadingOverlay}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      )}

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.errorOverlay}>
          <View style={styles.errorBox}>
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

            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => setErrorModal({ ...errorModal, visible: false })}
            >
              <Text style={styles.errorButtonText}>فهمت</Text>
            </TouchableOpacity>
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

  /* Simple Loading Overlay */
  simpleLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  /* Error Modal */
  errorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  errorBox: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#333",
    borderBottomWidth: 0,
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
  },
  errorButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default LoginScreen;
