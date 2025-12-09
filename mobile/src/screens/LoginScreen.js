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
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";

WebBrowser.maybeCompleteAuthSession();

// Enable RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Google OAuth
  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      expoClientId: "YOUR_EXPO_CLIENT_ID",
      iosClientId: "YOUR_IOS_CLIENT_ID",
      androidClientId: "YOUR_ANDROID_CLIENT_ID",
      webClientId: "YOUR_WEB_CLIENT_ID",
    });

  // Facebook OAuth
  const [facebookRequest, facebookResponse, facebookPromptAsync] =
    Facebook.useAuthRequest({
      clientId: "YOUR_FACEBOOK_APP_ID",
    });

  // Temporary test handlers until OAuth is configured
  const isOAuthConfigured = false; // Set to true when you add real credentials

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { authentication } = googleResponse;
      Alert.alert("نجح", "تم تسجيل الدخول عبر Google بنجاح!");
      // Here you would send the token to your backend
      // await login(authentication.accessToken, 'google');
    }
  }, [googleResponse]);

  useEffect(() => {
    if (facebookResponse?.type === "success") {
      const { authentication } = facebookResponse;
      Alert.alert("نجح", "تم تسجيل الدخول عبر Facebook بنجاح!");
      // Here you would send the token to your backend
      // await login(authentication.accessToken, 'facebook');
    }
  }, [facebookResponse]);

  const handleGoogleLogin = async () => {
    if (!isOAuthConfigured) {
      Alert.alert(
        "قريباً",
        "تسجيل الدخول عبر Google سيكون متاحاً قريباً.\n\nللاستخدام الآن:\nEmail: ahmed@tikbook.com\nPassword: 123456"
      );
      return;
    }
    try {
      await googlePromptAsync();
    } catch (error) {
      Alert.alert("خطأ", "فشل تسجيل الدخول عبر Google");
    }
  };

  const handleFacebookLogin = async () => {
    if (!isOAuthConfigured) {
      Alert.alert(
        "قريباً",
        "تسجيل الدخول عبر Facebook سيكون متاحاً قريباً.\n\nللاستخدام الآن:\nEmail: ahmed@tikbook.com\nPassword: 123456"
      );
      return;
    }
    try {
      await facebookPromptAsync();
    } catch (error) {
      Alert.alert("خطأ", "فشل تسجيل الدخول عبر Facebook");
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        <View style={styles.logo}>
          <Ionicons name="logo-tiktok" size={80} color="#FE2C55" />
        </View>
      </Animated.View>
      <Text style={styles.title}>{i18n.t("loginToTikBook")}</Text>
      <Text style={styles.subtitle}>{i18n.t("manageAccount")}</Text>

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
        style={styles.button}
        onPress={() => login(email, password)}
      >
        <Text style={styles.buttonText}>{i18n.t("logIn")}</Text>
      </TouchableOpacity>

      {/* Social Login */}
      <View style={styles.socialContainer}>
        <Text style={styles.socialTitle}>أو سجل الدخول عبر</Text>
        <View style={styles.oauthContainer}>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={handleGoogleLogin}
          >
            <Ionicons name="logo-google" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.oauthButton}
            onPress={handleFacebookLogin}
          >
            <Ionicons name="logo-facebook" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{i18n.t("dontHaveAccount")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>{i18n.t("signUp")}</Text>
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
    marginBottom: 50,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 16,
    position: "relative",
  },
  socialContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  socialTitle: {
    color: "#999",
    fontSize: 14,
    marginBottom: 16,
  },
  oauthContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  oauthButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a1a1a",
    borderWidth: 1.5,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#333",
  },
  dividerText: {
    color: "#999",
    paddingHorizontal: 16,
    fontSize: 14,
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
});

export default LoginScreen;
