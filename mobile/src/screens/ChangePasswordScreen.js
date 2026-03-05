import React, { useState, useRef, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useApp } from "../context/AppContext";

// ─── 3 steps: 1 = send OTP, 2 = verify OTP, 3 = new password ───────────────
const STEP_SEND  = 1;
const STEP_OTP   = 2;
const STEP_RESET = 3;

const ChangePasswordScreen = ({ navigation }) => {
  const { userToken, userInfo, BASE_URL } = useContext(AuthContext);
  const { theme } = useApp();
  const s = makeStyles(theme);

  const email = userInfo?.email || "";

  const [step, setStep]           = useState(STEP_SEND);
  const [loading, setLoading]     = useState(false);
  const [devOtp, setDevOtp]       = useState(null); // test mode OTP

  // OTP step
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [timer, setTimer]         = useState(60);
  const inputs                    = useRef([]);

  // Reset step
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  // Countdown timer while on OTP step
  useEffect(() => {
    if (step !== STEP_OTP) return;
    setTimer(60);
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const sendOtp = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
      if (res.data?.dev_otp) setDevOtp(res.data.dev_otp);
      setStep(STEP_OTP);
    } catch (e) {
      Alert.alert("خطأ", e.response?.data?.message || "فشل إرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleOtpChange = (text, index) => {
    const next = [...otp];
    next[index] = text;
    setOtp(next);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleBackspace = (text, index) => {
    if (!text && index > 0) inputs.current[index - 1]?.focus();
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      Alert.alert("خطأ", "يرجى إدخال الرمز كاملاً");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/auth/verify-otp`, {
        email,
        otp: code,
      });
      if (res.data?.verified) {
        setStep(STEP_RESET);
      }
    } catch (e) {
      Alert.alert("خطأ", e.response?.data?.message || "رمز التحقق غير صحيح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
      if (res.data?.dev_otp) setDevOtp(res.data.dev_otp);
      setOtp(["", "", "", "", "", ""]);
      setTimer(60);
    } catch (e) {
      Alert.alert("خطأ", "فشل إرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset password ────────────────────────────────────────────────
  const resetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("خطأ", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("خطأ", "كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      const code = otp.join("");
      await axios.post(`${BASE_URL}/auth/reset-password`, {
        email,
        otp: code,
        newPassword,
      });
      Alert.alert("تم بنجاح", "تم تغيير كلمة المرور بنجاح", [
        { text: "حسناً", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("خطأ", e.response?.data?.message || "فشل تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>تغيير كلمة المرور</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── STEP 1: Send OTP ─────────────────────────────────────────────── */}
          {step === STEP_SEND && (
            <View style={s.centerContent}>
              <View style={s.iconCircle}>
                <Ionicons name="lock-closed-outline" size={44} color="#FE2C55" />
              </View>

              <Text style={s.title}>تغيير كلمة المرور</Text>
              <Text style={s.subtitle}>
                سنرسل رمز تحقق إلى بريدك{"\n"}
                <Text style={s.emailHighlight}>{email}</Text>
              </Text>

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={sendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={18} color="#FFF" />
                    <Text style={s.btnText}>إرسال رمز التحقق</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Verify OTP ───────────────────────────────────────────── */}
          {step === STEP_OTP && (
            <View style={s.centerContent}>
              <View style={s.iconCircle}>
                <Ionicons name="mail-open-outline" size={44} color="#FE2C55" />
              </View>

              <Text style={s.title}>أدخل رمز التحقق</Text>
              <Text style={s.subtitle}>
                تم إرسال رمز مكون من 6 أرقام إلى{"\n"}
                <Text style={s.emailHighlight}>{email}</Text>
              </Text>

              {/* Dev mode OTP hint */}
              {devOtp && (
                <View style={s.devBox}>
                  <Ionicons name="bug-outline" size={14} color="#FFC107" />
                  <Text style={s.devText}>Test OTP: {devOtp}</Text>
                </View>
              )}

              {/* OTP inputs */}
              <View style={s.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => (inputs.current[i] = r)}
                    style={[s.otpBox, digit ? s.otpBoxFilled : null]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace") handleBackspace(otp[i], i);
                    }}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={verifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={s.btnText}>تحقق</Text>
                )}
              </TouchableOpacity>

              <View style={s.resendRow}>
                <Text style={s.resendLabel}>لم يصلك الرمز؟ </Text>
                <TouchableOpacity onPress={resendOtp} disabled={timer > 0 || loading}>
                  <Text style={[s.resendLink, (timer > 0 || loading) && s.resendDisabled]}>
                    {timer > 0 ? `إعادة الإرسال (${timer}s)` : "إعادة الإرسال"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── STEP 3: New password ─────────────────────────────────────────── */}
          {step === STEP_RESET && (
            <View style={s.centerContent}>
              <View style={s.iconCircle}>
                <Ionicons name="key-outline" size={44} color="#FE2C55" />
              </View>

              <Text style={s.title}>كلمة المرور الجديدة</Text>
              <Text style={s.subtitle}>أدخل كلمة المرور الجديدة</Text>

              {/* New password */}
              <View style={s.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.iconMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.input}
                  placeholder="كلمة المرور الجديدة"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNew(!showNew)}
                  style={s.eyeBtn}
                >
                  <Ionicons
                    name={showNew ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.iconMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm password */}
              <View style={s.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.iconMuted}
                  style={s.inputIcon}
                />
                <TextInput
                  style={s.input}
                  placeholder="تأكيد كلمة المرور"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={s.eyeBtn}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.iconMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <View style={s.matchRow}>
                  <Ionicons
                    name={
                      newPassword === confirmPassword
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={16}
                    color={newPassword === confirmPassword ? "#25D366" : "#FF4444"}
                  />
                  <Text
                    style={[
                      s.matchText,
                      { color: newPassword === confirmPassword ? "#25D366" : "#FF4444" },
                    ]}
                  >
                    {newPassword === confirmPassword
                      ? "كلمتا المرور متطابقتان"
                      : "كلمتا المرور غير متطابقتين"}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={resetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={18} color="#FFF" />
                    <Text style={s.btnText}>حفظ كلمة المرور</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step progress dots */}
          <View style={s.dotsRow}>
            {[STEP_SEND, STEP_OTP, STEP_RESET].map((n) => (
              <View
                key={n}
                style={[s.dot, step >= n ? s.dotActive : s.dotInactive]}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.text,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    centerContent: {
      alignItems: "center",
      paddingTop: 40,
    },
    iconCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: "rgba(254,44,85,0.10)",
      borderWidth: 1,
      borderColor: "rgba(254,44,85,0.25)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 10,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 36,
    },
    emailHighlight: {
      color: theme.text,
      fontWeight: "600",
    },
    devBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255,193,7,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.4)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 20,
    },
    devText: {
      color: "#FFC107",
      fontSize: 13,
      fontWeight: "600",
    },
    otpRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 36,
      direction: "ltr",
    },
    otpBox: {
      width: 46,
      height: 56,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.input,
      color: theme.text,
      fontSize: 24,
      fontWeight: "700",
      textAlign: "center",
    },
    otpBoxFilled: {
      borderColor: "#FE2C55",
      backgroundColor: "rgba(254,44,85,0.06)",
    },
    btn: {
      width: "100%",
      height: 52,
      backgroundColor: "#FE2C55",
      borderRadius: 12,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      shadowColor: "#FE2C55",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 5,
    },
    btnDisabled: { opacity: 0.65 },
    btnText: {
      color: "#FFF",
      fontSize: 16,
      fontWeight: "700",
    },
    resendRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
    },
    resendLabel: { color: theme.textMuted, fontSize: 14 },
    resendLink: { color: "#FE2C55", fontSize: 14, fontWeight: "700" },
    resendDisabled: { color: theme.textMuted },
    inputWrap: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.input,
      marginBottom: 16,
      paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 8 },
    input: {
      flex: 1,
      height: 52,
      fontSize: 15,
      color: theme.text,
      textAlign: "right",
    },
    eyeBtn: { padding: 6 },
    matchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginBottom: 20,
      marginTop: -6,
    },
    matchText: { fontSize: 13 },
    dotsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginTop: 40,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotActive: { backgroundColor: "#FE2C55" },
    dotInactive: { backgroundColor: theme.border },
  });

export default ChangePasswordScreen;
