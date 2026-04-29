/**
 * حقول ومكوّنات مشتركة بين شاشات تسجيل الدخول والتسجيل — ألوان شعار TikBook.
 */
import React from "react";
import { View, Text, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ms, fs } from "../utils/responsive";
import { brandGradient, brandColors } from "../theme/brand";

export const AUTH = {
  link: "#FF6AA8",
  icon: brandColors.cyan,
  placeholder: "rgba(228, 220, 240, 0.92)",
  subtitle: "rgba(198, 190, 230, 0.95)",
  footerMuted: "rgba(164, 156, 200, 0.98)",
  title: "#FFFFFF",
};

export const BUTTON_DISABLED_GRADIENT = [
  "rgba(255, 51, 102, 0.55)",
  "rgba(102, 51, 255, 0.52)",
  "rgba(51, 204, 255, 0.52)",
];

export function AuthField({
  styles,
  theme,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  icon,
  editable,
  selectTextOnFocus,
  leftAccessory,
  autoCapitalize,
}) {
  const capitalize =
    autoCapitalize !== undefined
      ? autoCapitalize
      : keyboardType === "email-address"
        ? "none"
        : undefined;

  return (
    <View style={styles.inputContainer}>
      <LinearGradient
        colors={brandGradient.colors}
        locations={brandGradient.locations}
        start={brandGradient.start}
        end={brandGradient.end}
        style={styles.inputGradientOuter}
      >
        <View style={styles.inputInner}>
          {leftAccessory ? <View style={styles.inputAccessoryLeft}>{leftAccessory}</View> : null}
          <TextInput
            style={[
              styles.inputField,
              leftAccessory ? styles.inputFieldWithAccessory : null,
            ]}
            placeholder={placeholder}
            placeholderTextColor={AUTH.placeholder}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType || "default"}
            secureTextEntry={secureTextEntry}
            autoCapitalize={capitalize}
            editable={editable}
            selectTextOnFocus={selectTextOnFocus}
            textAlign="right"
            color={theme.text}
          />
          <View style={styles.inputIcon} pointerEvents="none">
            <Ionicons name={icon} size={fs(20)} color={AUTH.icon} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/** شعار + حقول + زر (بدون تذييل) — يُضاف بينه وبين التذييل حقول «نسيت كلمة المرور» على شاشة الدخول */
export function authFieldsAndButtonStyles(theme) {
  return {
    logoWrap: {
      marginBottom: ms(28),
      alignItems: "center",
      justifyContent: "center",
    },
    logoImage: {
      width: ms(104),
      height: ms(104),
    },
    title: {
      fontSize: fs(28),
      fontWeight: "bold",
      marginBottom: ms(8),
      textAlign: "center",
      color: theme.text,
      paddingHorizontal: ms(20),
    },
    subtitle: {
      fontSize: fs(14),
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: ms(40),
      paddingHorizontal: ms(20),
      lineHeight: ms(20),
    },
    inputContainer: {
      width: "100%",
      marginBottom: ms(16),
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      overflow: "visible",
    },
    inputGradientOuter: {
      borderRadius: ms(15),
      padding: ms(2),
      width: "100%",
    },
    inputInner: {
      position: "relative",
      minHeight: ms(48),
      width: "100%",
      borderRadius: ms(13),
      backgroundColor: "transparent",
      justifyContent: "center",
      overflow: "visible",
    },
    inputAccessoryLeft: {
      position: "absolute",
      left: ms(12),
      top: 0,
      bottom: 0,
      justifyContent: "center",
      zIndex: 3,
      width: ms(34),
      alignItems: "center",
    },
    inputField: {
      width: "100%",
      flex: 1,
      minHeight: ms(48),
      borderWidth: 0,
      borderRadius: ms(12),
      paddingRight: ms(44),
      paddingLeft: ms(44),
      backgroundColor: "transparent",
      fontSize: fs(16),
      textAlign: "right",
    },
    inputFieldWithAccessory: {
      paddingLeft: ms(50),
    },
    inputIcon: {
      position: "absolute",
      right: ms(10),
      width: ms(34),
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    eyeIcon: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    buttonTouchable: {
      width: "100%",
      marginTop: ms(28),
      borderRadius: ms(26),
      overflow: "visible",
      shadowColor: brandColors.magenta,
      shadowOpacity: 0.28,
      shadowRadius: ms(12),
      shadowOffset: { width: 0, height: ms(4) },
      elevation: 6,
    },
    buttonGradientOuter: {
      borderRadius: ms(26),
      padding: ms(2),
      width: "100%",
    },
    buttonInner: {
      height: ms(48),
      borderRadius: ms(24),
      backgroundColor: "transparent",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    buttonTextGradient: {
      color: "#FFFFFF",
      fontSize: fs(16),
      fontWeight: "800",
      letterSpacing: 0.6,
      textShadowColor: "rgba(255, 51, 102, 0.55)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    buttonTextMuted: {
      color: "rgba(255, 255, 255, 0.88)",
      fontSize: fs(16),
      fontWeight: "800",
      letterSpacing: 0.55,
      textShadowColor: "rgba(0,0,0,0.2)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
  };
}

export function authFooterStyles(theme) {
  return {
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: ms(50),
      marginBottom: ms(30),
      paddingHorizontal: ms(20),
    },
    footerText: {
      fontSize: fs(14),
      color: theme.textSecondary,
    },
    link: {
      fontSize: fs(14),
      fontWeight: "800",
      marginLeft: ms(5),
    },
    linkMuted: {
      opacity: 0.45,
    },
  };
}

/** مجموعة واحدة بدون مساحات نسيان تسجيل الدخول (للاستخدام مع شاشة التسجيل) */
export function authCoreStyles(theme) {
  return {
    ...authFieldsAndButtonStyles(theme),
    ...authFooterStyles(theme),
  };
}
