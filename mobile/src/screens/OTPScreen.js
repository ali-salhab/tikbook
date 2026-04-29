import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import ErrorModal from "../components/ErrorModal";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Constants from "expo-constants";
import { wp, ms, fs } from "../utils/responsive";

const OTPScreen = ({ route, navigation }) => {
  const { username, email, password, devOtp } = route.params;
  const { BASE_URL } = useContext(AuthContext);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState(null);
  const inputs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-fill OTP when backend returns it in dev/test mode (no email sent)
  useEffect(() => {
    if (devOtp) {
      const digits = String(devOtp).padStart(6, "0").slice(0, 6).split("");
      setOtp(digits);
    }
  }, [devOtp]);

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleBackspace = (text, index) => {
    if (!text && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      Alert.alert("خطأ", "يرجى إدخال الرمز كاملاً");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify OTP
      const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, {
        email,
        otp: code,
      });

      if (verifyRes.data.verified) {
        // 2. Create the account
        await axios.post(`${BASE_URL}/auth/register`, {
          username,
          email,
          password,
        });

        // 3. Navigate to Login with success flag
        navigation.reset({
          index: 0,
          routes: [{ name: "Login", params: { registered: true } }],
        });
      }
    } catch (e) {
      const msg =
        e.response?.data?.message || "رمز التحقق غير صحيح أو منتهي الصلاحية";
      Alert.alert("خطأ في التحقق", msg);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (timer > 0) return;

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/auth/send-otp`, { email });
      setTimer(60);
      Alert.alert("نجح", "تم إرسال رمز جديد");
    } catch (e) {
      Alert.alert("خطأ", "فشل إرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: "#000" }]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-open-outline" size={50} color="#FF3366" />
        </View>

        <Text style={styles.title}>التحقق من البريد</Text>
        <Text style={styles.subtitle}>
          تم إرسال رمز مكون من 6 أرقام إلى{"\n"}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace") {
                  handleBackspace(otp[index], index);
                }
              }}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.disabledButton]}
          onPress={verifyOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyButtonText}>تحقق</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>لم يصلك الرمز؟ </Text>
          <TouchableOpacity onPress={resendOtp} disabled={timer > 0}>
            <Text style={[styles.resendLink, timer > 0 && { color: "#666" }]}>
              {timer > 0 ? `إعادة الإرسال (${timer}s)` : "إعادة الإرسال"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: ms(20),
  },
  backButton: {
    marginTop: Constants.statusBarHeight + ms(10),
    width: ms(40),
    height: ms(40),
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -ms(50),
  },
  iconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    backgroundColor: "rgba(255, 45, 146, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ms(20),
    borderWidth: 1,
    borderColor: "rgba(255, 45, 146, 0.3)",
  },
  title: {
    fontSize: fs(24),
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: ms(10),
  },
  subtitle: {
    fontSize: fs(14),
    color: "#999",
    textAlign: "center",
    marginBottom: ms(40),
    lineHeight: ms(22),
  },
  emailText: {
    color: "#FFF",
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    gap: ms(10),
    marginBottom: ms(40),
    direction: "ltr",
  },
  otpInput: {
    width: ms(45),
    height: ms(55),
    borderRadius: ms(8),
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1a1a1a",
    color: "#FFF",
    fontSize: fs(24),
    fontWeight: "bold",
    textAlign: "center",
  },
  otpInputFilled: {
    borderColor: "#FF3366",
    backgroundColor: "rgba(255, 45, 146, 0.05)",
  },
  verifyButton: {
    width: "100%",
    height: ms(50),
    backgroundColor: "#FF3366",
    borderRadius: ms(8),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ms(20),
  },
  disabledButton: {
    opacity: 0.7,
  },
  verifyButtonText: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "bold",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendText: {
    color: "#666",
    fontSize: fs(14),
  },
  resendLink: {
    color: "#FF3366",
    fontSize: fs(14),
    fontWeight: "bold",
  },
});

export default OTPScreen;
