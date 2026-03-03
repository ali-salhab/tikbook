import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

/**
 * Classifies an Axios error into a user-friendly Arabic message + icon.
 */
export const classifyError = (e) => {
  if (!e) return { title: "خطأ", message: "حدث خطأ غير متوقع", icon: "alert-circle-outline", color: "#FF6B6B" };

  // No response at all (network down / server unreachable)
  if (e.request && !e.response) {
    return {
      title: "لا يوجد اتصال",
      message: "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مجدداً.",
      icon: "wifi-outline",
      color: "#FF9F43",
    };
  }

  // HTTP status codes
  const status = e.response?.status;
  if (status === 401 || status === 403) {
    return {
      title: "غير مصرح",
      message: "انتهت جلستك. يرجى تسجيل الدخول من جديد.",
      icon: "lock-closed-outline",
      color: "#EE5A24",
    };
  }
  if (status === 404) {
    return {
      title: "غير موجود",
      message: "المحتوى الذي تبحث عنه غير موجود.",
      icon: "search-outline",
      color: "#A29BFE",
    };
  }
  if (status === 429) {
    return {
      title: "طلبات كثيرة",
      message: "أرسلت طلبات كثيرة جداً. انتظر قليلاً وأعد المحاولة.",
      icon: "time-outline",
      color: "#FDCB6E",
    };
  }
  if (status >= 500) {
    return {
      title: "خطأ في الخادم",
      message: "يواجه الخادم مشكلة مؤقتة. سيتم إصلاحها قريباً.",
      icon: "server-outline",
      color: "#FF6B6B",
    };
  }

  // Timeout
  if (e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
    return {
      title: "انتهت المهلة",
      message: "استغرق الطلب وقتاً طويلاً. تحقق من سرعة اتصالك.",
      icon: "hourglass-outline",
      color: "#FDCB6E",
    };
  }

  return {
    title: "خطأ",
    message: e.response?.data?.message || e.message || "حدث خطأ غير متوقع",
    icon: "alert-circle-outline",
    color: "#FF6B6B",
  };
};

const NetworkErrorModal = ({ visible, error, onRetry, onDismiss }) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(1)).current;

  const info = classifyError(error);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon bounce
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(iconBounce, {
          toValue: 1.15,
          tension: 80,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(iconBounce, {
          toValue: 1,
          tension: 80,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      iconBounce.setValue(1);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onDismiss}
        />

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Top accent bar */}
          <View style={[styles.accentBar, { backgroundColor: info.color }]} />

          {/* Icon circle */}
          <Animated.View
            style={[
              styles.iconCircle,
              { backgroundColor: info.color + "20", transform: [{ scale: iconBounce }] },
            ]}
          >
            <Ionicons name={info.icon} size={38} color={info.color} />
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{info.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{info.message}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {onDismiss && (
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={onDismiss}
                activeOpacity={0.75}
              >
                <Text style={styles.dismissText}>تجاهل</Text>
              </TouchableOpacity>
            )}
            {onRetry && (
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: info.color }]}
                onPress={() => {
                  onDismiss?.();
                  onRetry();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    alignItems: "center",
    overflow: "hidden",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  accentBar: {
    width: "100%",
    height: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginBottom: 28,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  message: {
    color: "#AEAEB2",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  divider: {
    width: "85%",
    height: 1,
    backgroundColor: "#2C2C2E",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    width: "100%",
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    color: "#AEAEB2",
    fontSize: 15,
    fontWeight: "600",
  },
  retryBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  retryText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default NetworkErrorModal;
