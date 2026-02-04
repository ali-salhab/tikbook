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

const OTPScreen = ({ route, navigation }) => {
    const { username, email, password } = route.params;
    const { BASE_URL, register } = useContext(AuthContext);
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
            setError("يرجى إدخال الرمز كاملاً");
            return;
        }

        setLoading(true);
        try {
            console.log("🔐 Verifying OTP...", { email, code });
            const res = await axios.post(`${BASE_URL}/auth/verify-otp`, {
                email,
                otp: code,
            });

            if (res.data.verified) {
                console.log("✅ OTP Verified, creating account...");
                // Call register from context to complete sign up and login
                await register(username, email, password, code);
                // Note: register function in AuthContext handles navigation/state update
            }
        } catch (e) {
            console.log("❌ Verification error:", e.response?.data || e.message);
            setError(e.response?.data?.message || "رمز التحقق غير صحيح أو منتهي الصلاحية");
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
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="mail-open-outline" size={50} color="#FE2C55" />
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
                        <Text
                            style={[
                                styles.resendLink,
                                timer > 0 && { color: "#666" },
                            ]}
                        >
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
        padding: 20,
    },
    backButton: {
        marginTop: Constants.statusBarHeight + 10,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -50,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(254, 44, 85, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "rgba(254, 44, 85, 0.3)",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FFF",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        marginBottom: 40,
        lineHeight: 22,
    },
    emailText: {
        color: "#FFF",
        fontWeight: "600",
    },
    otpContainer: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 40,
        direction: "ltr",
    },
    otpInput: {
        width: 45,
        height: 55,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#333",
        backgroundColor: "#1a1a1a",
        color: "#FFF",
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
    },
    otpInputFilled: {
        borderColor: "#FE2C55",
        backgroundColor: "rgba(254, 44, 85, 0.05)",
    },
    verifyButton: {
        width: "100%",
        height: 50,
        backgroundColor: "#FE2C55",
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    disabledButton: {
        opacity: 0.7,
    },
    verifyButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    resendContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    resendText: {
        color: "#666",
        fontSize: 14,
    },
    resendLink: {
        color: "#FE2C55",
        fontSize: 14,
        fontWeight: "bold",
    },
});

export default OTPScreen;
