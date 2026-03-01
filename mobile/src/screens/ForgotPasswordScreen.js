import React, { useState, useRef, useContext } from "react";
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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const ForgotPasswordScreen = ({ navigation }) => {
  const { BASE_URL } = useContext(AuthContext);

  const [step, setStep] = useState(1); // 1=email, 2=otp+newpass
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert("خطأ", "يرجى إدخال البريد الإلكتروني");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/auth/forgot-password`, {
        email: email.trim(),
      });
      setStep(2);
    } catch (e) {
      Alert.alert("خطأ", e.response?.data?.message || "فشل إرسال رمز التحقق");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input ─────────────────────────────────────────────────────────────
  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleBackspace = (text, index) => {
    if (!text && index > 0) inputs.current[index - 1]?.focus();
  };

  // ── Step 2: verify OTP + reset password ──────────────────────────────────
  const handleResetPassword = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      Alert.alert("خطأ", "يرجى إدخال رمز التحقق كاملاً");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("خطأ", "كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/auth/reset-password`, {
        email: email.trim(),
        otp: code,
        newPassword,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: "Login", params: { passwordReset: true } }],
      });
    } catch (e) {
      Alert.alert("خطأ", e.response?.data?.message || "فشل تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={50} color="#FE2C55" />
          </View>

          <Text style={styles.title}>نسيت كلمة المرور؟</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق"
              : `أدخل الرمز المُرسل إلى\n${email}`}
          </Text>

          {/* ─── Step 1 ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#FE2C55"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="البريد الإلكتروني"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>إرسال رمز التحقق</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ─── Step 2 ─────────────────────────────────────────── */}
          {step === 2 && (
            <>
              {/* OTP boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => (inputs.current[i] = r)}
                    style={[styles.otpBox, digit && styles.otpBoxFilled]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace")
                        handleBackspace(otp[i], i);
                    }}
                  />
                ))}
              </View>

              {/* New password */}
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#FE2C55"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="كلمة المرور الجديدة"
                  placeholderTextColor="#666"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons
                    name={showPass ? "eye-off" : "eye"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm password */}
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#FE2C55"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="تأكيد كلمة المرور"
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPass}
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnText}>تغيير كلمة المرور</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => {
                  setStep(1);
                  setOtp(["", "", "", "", "", ""]);
                }}
              >
                <Text style={styles.resendText}>إعادة الإرسال</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    paddingTop: 10,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 20,
    padding: 4,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(254,44,85,0.1)",
    borderWidth: 1,
    borderColor: "rgba(254,44,85,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 22,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 14,
    marginBottom: 16,
    width: "100%",
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#FFF",
    fontSize: 15,
    textAlign: "right",
  },
  btn: {
    width: "100%",
    height: 52,
    backgroundColor: "#FE2C55",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
    direction: "ltr",
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#1a1a1a",
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  otpBoxFilled: {
    borderColor: "#FE2C55",
    backgroundColor: "rgba(254,44,85,0.06)",
  },
  resendBtn: {
    marginTop: 20,
  },
  resendText: {
    color: "#FE2C55",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ForgotPasswordScreen;
