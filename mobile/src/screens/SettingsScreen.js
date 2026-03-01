import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";

const SettingsScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showLikes, setShowLikes] = useState(true);
  const [showFollowing, setShowFollowing] = useState(true);
  const [commentFilter, setCommentFilter] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageRequests, setMessageRequests] = useState(true);

  const sections = [
    {
      title: "الحساب",
      items: [
        {
          icon: "person-outline",
          label: "معلومات الحساب",
          onPress: () => navigation.navigate("EditProfile"),
          arrow: true,
        },
        {
          icon: "shield-checkmark-outline",
          label: "توثيق الحساب",
          onPress: () => navigation.navigate("VerificationRequest"),
          arrow: true,
        },
        {
          icon: "key-outline",
          label: "تغيير كلمة المرور",
          onPress: () => Alert.alert("قريباً", "سيتم إضافة هذه الميزة قريباً"),
          arrow: true,
        },
        {
          icon: "wallet-outline",
          label: "المحفظة والمعاملات",
          onPress: () => navigation.navigate("Wallet"),
          arrow: true,
        },
      ],
    },
    {
      title: "الخصوصية",
      items: [
        {
          icon: "lock-closed-outline",
          label: "حساب خاص",
          toggle: true,
          value: privateAccount,
          onToggle: (v) => setPrivateAccount(v),
        },
        {
          icon: "heart-outline",
          label: "إظهار عدد الإعجابات",
          toggle: true,
          value: showLikes,
          onToggle: (v) => setShowLikes(v),
        },
        {
          icon: "people-outline",
          label: "إظهار قائمة المتابعة",
          toggle: true,
          value: showFollowing,
          onToggle: (v) => setShowFollowing(v),
        },
        {
          icon: "chatbubble-ellipses-outline",
          label: "فلترة التعليقات",
          toggle: true,
          value: commentFilter,
          onToggle: (v) => setCommentFilter(v),
        },
        {
          icon: "ban-outline",
          label: "قائمة الحظر",
          onPress: () => Alert.alert("قريباً", "سيتم إضافة هذه الميزة قريباً"),
          arrow: true,
        },
      ],
    },
    {
      title: "الإشعارات",
      items: [
        {
          icon: "notifications-outline",
          label: "إشعارات التطبيق",
          toggle: true,
          value: notifications,
          onToggle: (v) => setNotifications(v),
        },
        {
          icon: "phone-portrait-outline",
          label: "إشعارات الدفع",
          toggle: true,
          value: pushNotifications,
          onToggle: (v) => setPushNotifications(v),
        },
        {
          icon: "chatbubble-outline",
          label: "طلبات الرسائل",
          toggle: true,
          value: messageRequests,
          onToggle: (v) => setMessageRequests(v),
        },
      ],
    },
    {
      title: "التطبيق",
      items: [
        {
          icon: "language-outline",
          label: "اللغة",
          value: "العربية",
          onPress: () => Alert.alert("قريباً", "دعم متعدد اللغات قريباً"),
          arrow: true,
        },
        {
          icon: "information-circle-outline",
          label: "حول التطبيق",
          onPress: () =>
            Alert.alert("TikBook", "الإصدار 1.0.0\nجميع الحقوق محفوظة © 2026"),
          arrow: true,
        },
        {
          icon: "document-text-outline",
          label: "سياسة الخصوصية",
          onPress: () => Alert.alert("سياسة الخصوصية", "سيتم فتح صفحة السياسة"),
          arrow: true,
        },
      ],
    },
    {
      title: "",
      items: [
        {
          icon: "log-out-outline",
          label: "تسجيل الخروج",
          color: "#FE2C55",
          onPress: () => {
            Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
              { text: "إلغاء", style: "cancel" },
              {
                text: "خروج",
                style: "destructive",
                onPress: () => logout && logout(),
              },
            ]);
          },
        },
        {
          icon: "trash-outline",
          label: "حذف الحساب",
          color: "#FF4444",
          onPress: () =>
            Alert.alert(
              "حذف الحساب",
              "هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟",
              [
                { text: "إلغاء", style: "cancel" },
                {
                  text: "حذف",
                  style: "destructive",
                  onPress: () => Alert.alert("قريباً", "سيتم تفعيل هذه الميزة"),
                },
              ],
            ),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-forward" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإعدادات والخصوصية</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            {section.title ? (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            ) : null}
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.settingRow,
                    i < section.items.length - 1 && styles.settingRowBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={item.toggle ? 1 : 0.7}
                  disabled={item.toggle}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.iconBg,
                        item.color && { backgroundColor: `${item.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.color || "#333"}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.settingLabel,
                          item.color && { color: item.color },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.value && !item.toggle && (
                        <Text style={styles.settingValue}>{item.value}</Text>
                      )}
                    </View>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: "#ddd", true: "#FE2C55" }}
                      thumbColor={item.value ? "#FFF" : "#FFF"}
                    />
                  ) : item.arrow ? (
                    <Ionicons name="chevron-back" size={20} color="#CCC" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    marginBottom: 8,
    textAlign: "right",
  },
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 15,
    color: "#000",
    fontWeight: "500",
    textAlign: "right",
  },
  settingValue: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
    textAlign: "right",
  },
});

export default SettingsScreen;
