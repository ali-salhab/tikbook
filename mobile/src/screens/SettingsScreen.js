import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { LANGUAGES } from "../i18n";
import { ms, fs } from "../utils/responsive";

const SettingsScreen = ({ navigation }) => {
  const { logout } = React.useContext(AuthContext);
  const { theme, themeId, setThemeId, language, setLanguage, t } = useApp();

  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showLikes, setShowLikes] = useState(true);
  const [showFollowing, setShowFollowing] = useState(true);
  const [commentFilter, setCommentFilter] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [messageRequests, setMessageRequests] = useState(true);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const s = makeStyles(theme);

  const sections = [
    {
      title: t("account"),
      items: [
        {
          icon: "person-outline",
          label: t("accountInfo"),
          onPress: () => navigation.navigate("EditProfile"),
          arrow: true,
        },
        {
          icon: "shield-checkmark-outline",
          label: t("verifyAccount"),
          onPress: () => navigation.navigate("VerificationRequest"),
          arrow: true,
        },
        {
          icon: "key-outline",
          label: t("changePassword"),
          onPress: () => navigation.navigate("ChangePassword"),
          arrow: true,
        },
        {
          icon: "wallet-outline",
          label: t("walletTransactions"),
          onPress: () => navigation.navigate("Wallet"),
          arrow: true,
        },
      ],
    },
    {
      title: t("privacy"),
      items: [
        {
          icon: "lock-closed-outline",
          label: t("privateAccount"),
          toggle: true,
          value: privateAccount,
          onToggle: (v) => setPrivateAccount(v),
        },
        {
          icon: "heart-outline",
          label: t("showLikes"),
          toggle: true,
          value: showLikes,
          onToggle: (v) => setShowLikes(v),
        },
        {
          icon: "people-outline",
          label: t("showFollowing"),
          toggle: true,
          value: showFollowing,
          onToggle: (v) => setShowFollowing(v),
        },
        {
          icon: "chatbubble-ellipses-outline",
          label: t("filterComments"),
          toggle: true,
          value: commentFilter,
          onToggle: (v) => setCommentFilter(v),
        },
        {
          icon: "ban-outline",
          label: t("blockedList"),
          onPress: () => Alert.alert(t("comingSoon"), t("comingSoonMsg")),
          arrow: true,
        },
      ],
    },
    {
      title: t("notifications"),
      items: [
        {
          icon: "notifications-outline",
          label: t("appNotifications"),
          toggle: true,
          value: notifications,
          onToggle: (v) => setNotifications(v),
        },
        {
          icon: "phone-portrait-outline",
          label: t("pushNotifications"),
          toggle: true,
          value: pushNotifications,
          onToggle: (v) => setPushNotifications(v),
        },
        {
          icon: "chatbubble-outline",
          label: t("messageRequests"),
          toggle: true,
          value: messageRequests,
          onToggle: (v) => setMessageRequests(v),
        },
      ],
    },
    {
      title: t("app"),
      items: [
        {
          icon: "language-outline",
          label: t("language"),
          value: LANGUAGES[language]?.label || language,
          onPress: () => setLangModalVisible(true),
          arrow: true,
        },
        {
          icon: themeId === "dark" ? "moon-outline" : "sunny-outline",
          label: t("theme"),
          value: themeId === "dark" ? t("darkTheme") : t("lightTheme"),
          onPress: () => setThemeModalVisible(true),
          arrow: true,
        },
        {
          icon: "information-circle-outline",
          label: t("about"),
          onPress: () => Alert.alert("TikBook", t("version")),
          arrow: true,
        },
        {
          icon: "document-text-outline",
          label: t("privacyPolicy"),
          onPress: () => Alert.alert(t("privacyPolicy"), t("privacyPolicyMsg")),
          arrow: true,
        },
      ],
    },
    {
      title: "",
      items: [
        {
          icon: "log-out-outline",
          label: t("logout"),
          color: "#FF3366",
          onPress: () => {
            Alert.alert(t("logout"), t("logoutConfirm"), [
              { text: t("cancel"), style: "cancel" },
              {
                text: t("logout"),
                style: "destructive",
                onPress: () => logout && logout(),
              },
            ]);
          },
        },
        {
          icon: "trash-outline",
          label: t("deleteAccount"),
          color: "#FF4444",
          onPress: () =>
            Alert.alert(t("deleteAccount"), t("deleteConfirm"), [
              { text: t("cancel"), style: "cancel" },
              {
                text: t("delete"),
                style: "destructive",
                onPress: () => Alert.alert(t("comingSoon"), t("comingSoonMsg")),
              },
            ]),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[s.container]} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("settings")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {sections.map((section, si) => (
          <View key={si} style={s.section}>
            {section.title ? (
              <Text style={s.sectionTitle}>{section.title}</Text>
            ) : null}
            <View style={s.sectionCard}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.settingRow,
                    i < section.items.length - 1 && s.settingRowBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={item.toggle ? 1 : 0.7}
                  disabled={item.toggle}
                >
                  <View style={s.rowLeft}>
                    <View
                      style={[
                        s.iconBg,
                        item.color && { backgroundColor: `${item.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.color || theme.text}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          s.settingLabel,
                          item.color && { color: item.color },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.value && !item.toggle && (
                        <Text style={s.settingValue}>{item.value}</Text>
                      )}
                    </View>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={theme.switch}
                      thumbColor="#FFF"
                    />
                  ) : item.arrow ? (
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={theme.textMuted}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Language Modal ── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setLangModalVisible(false)}
        >
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t("language")}</Text>
            {Object.values(LANGUAGES).map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={s.modalOption}
                onPress={() => {
                  setLanguage(lang.code);
                  setLangModalVisible(false);
                }}
              >
                <Text
                  style={[
                    s.modalOptionText,
                    language === lang.code && s.modalOptionActive,
                  ]}
                >
                  {lang.label}
                </Text>
                {language === lang.code && (
                  <Ionicons name="checkmark" size={20} color="#FF3366" />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Theme Modal ── */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setThemeModalVisible(false)}
        >
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t("theme")}</Text>
            {[
              { id: "dark", icon: "moon-outline", labelKey: "darkTheme" },
              { id: "light", icon: "sunny-outline", labelKey: "lightTheme" },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.modalOption}
                onPress={() => {
                  setThemeId(item.id);
                  setThemeModalVisible(false);
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Ionicons name={item.icon} size={22} color={theme.text} />
                  <Text
                    style={[
                      s.modalOptionText,
                      themeId === item.id && s.modalOptionActive,
                    ]}
                  >
                    {t(item.labelKey)}
                  </Text>
                </View>
                {themeId === item.id && (
                  <Ionicons name="checkmark" size={20} color="#FF3366" />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: ms(16),
      paddingVertical: ms(12),
      backgroundColor: theme.header,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
    },
    backBtn: { padding: ms(4) },
    headerTitle: {
      fontSize: fs(17),
      fontWeight: "700",
      color: theme.text,
    },
    section: {
      marginTop: ms(20),
      paddingHorizontal: ms(16),
    },
    sectionTitle: {
      fontSize: fs(13),
      fontWeight: "600",
      color: theme.textMuted,
      marginBottom: ms(8),
      textAlign: "right",
    },
    sectionCard: {
      backgroundColor: theme.card,
      borderRadius: ms(14),
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
      paddingHorizontal: ms(16),
      paddingVertical: ms(14),
    },
    settingRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: ms(14),
      flex: 1,
    },
    iconBg: {
      width: ms(38),
      height: ms(38),
      borderRadius: ms(10),
      backgroundColor: theme.bg3,
      justifyContent: "center",
      alignItems: "center",
    },
    settingLabel: {
      fontSize: fs(15),
      color: theme.text,
      fontWeight: "500",
      textAlign: "right",
    },
    settingValue: {
      fontSize: fs(12),
      color: theme.textMuted,
      marginTop: ms(2),
      textAlign: "right",
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: ms(20),
      borderTopRightRadius: ms(20),
      paddingHorizontal: ms(20),
      paddingBottom: ms(34),
      paddingTop: ms(12),
    },
    modalHandle: {
      width: ms(40),
      height: ms(4),
      borderRadius: ms(2),
      backgroundColor: theme.border,
      alignSelf: "center",
      marginBottom: ms(16),
    },
    modalTitle: {
      fontSize: fs(17),
      fontWeight: "700",
      color: theme.text,
      textAlign: "center",
      marginBottom: ms(16),
    },
    modalOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: ms(14),
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
    },
    modalOptionText: {
      fontSize: fs(16),
      color: theme.textSecondary,
    },
    modalOptionActive: {
      color: "#FF3366",
      fontWeight: "700",
    },
  });

export default SettingsScreen;
