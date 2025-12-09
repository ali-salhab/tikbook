import React, { useContext, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  I18nManager,
  Alert,
  Image,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n";
import axios from "axios";

// Enable RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { BASE_URL } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("خطأ", "يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    if (password.length < 6) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        username,
        email,
        password,
      });

      Alert.alert("نجح", "تم إنشاء الحساب بنجاح!", [
        { text: "تسجيل الدخول", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error) {
      Alert.alert("خطأ", error.response?.data?.message || "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    Alert.alert("قريباً", `سيتم إضافة تسجيل الدخول عبر ${provider} قريباً`);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        <View style={styles.logo}>
          <Ionicons name="logo-tiktok" size={80} color="#FE2C55" />
        </View>
      </Animated.View>
      <Text style={styles.title}>{i18n.t("signUpForTikBook")}</Text>
      <Text style={styles.subtitle}>{i18n.t("createProfile")}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={i18n.t("username")}
          placeholderTextColor="#888"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={i18n.t("email")}
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={i18n.t("password")}
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="#888"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "جاري الإنشاء..." : i18n.t("signUp")}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{i18n.t("alreadyHaveAccount")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>{i18n.t("logIn")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#000",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  otpIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FE2C55",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#FFF",
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 16,
    position: "relative",
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 50,
    backgroundColor: "#1a1a1a",
    fontSize: 16,
    textAlign: "right",
    color: "#FFF",
  },
  eyeIcon: {
    position: "absolute",
    left: 15,
    top: 14,
  },
  button: {
    backgroundColor: "#FE2C55",
    height: 52,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#FE2C55",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    fontSize: 15,
    color: "#999",
  },
  link: {
    fontSize: 15,
    color: "#FE2C55",
    fontWeight: "bold",
    marginLeft: 5,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  resendText: {
    fontSize: 15,
    color: "#999",
  },
  resendLink: {
    fontSize: 15,
    color: "#FE2C55",
    fontWeight: "bold",
  },
});

export default RegisterScreen;
