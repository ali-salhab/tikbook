import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  LANG_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "../i18n";
import { brandColors } from "../theme/brand";

// ── Theme palettes (accent / حلقات الصورة من هوية الشعار في brand.js) ────────

export const themes = {
  dark: {
    id: "dark",
    bg: "#100818",
    bg2: "#0E0B1E",
    bg3: "#1A1630",
    card: "#151228",
    border: "#2A2550",
    text: "#F0EEFF",
    textSecondary: "#B8B0D8",
    textMuted: "#7A728A",
    placeholder: "#6A6280",
    accent: brandColors.accent,
    icon: "#F0EEFF",
    iconMuted: "#8880AA",
    tabBar: "#0A0818",
    header: "#0E0B1E",
    input: "#1A1630",
    inputBorder: "#2A2550",
    buttonBg: "#1A1630",
    buttonBorder: "#2A2550",
    switch: { false: "#2A2550", true: brandColors.accent },
    avatarRing: brandColors.violet,
  },
  light: {
    id: "light",
    bg: "#FFF5F9",
    bg2: "#F7F2FF",
    bg3: "#E8ECFF",
    card: "#FFFBFF",
    border: "#DDD0EE",
    text: "#1A1530",
    textSecondary: "#3A3060",
    textMuted: "#7A6898",
    placeholder: "#9A88B8",
    accent: brandColors.accent,
    icon: "#1A1530",
    iconMuted: "#8878A8",
    tabBar: "#F5F0FA",
    header: "#F8F4FF",
    input: "#EEE8FA",
    inputBorder: "#C8BAE8",
    buttonBg: "#EEE8FA",
    buttonBorder: "#C8BAE8",
    switch: { false: "#C8BAE8", true: brandColors.accent },
    avatarRing: brandColors.violet,
  },
};

// ── Context ────────────────────────────────────────────────────────────────

const AppContext = createContext({
  theme: themes.dark,
  themeId: "dark",
  setThemeId: () => {},
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
  isRTL: true,
});

export const AppProvider = ({ children }) => {
  const [themeId, setThemeIdState] = useState("dark");
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  // Load saved preferences and apply RTL immediately on startup
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedLang] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(LANG_STORAGE_KEY),
        ]);
        if (savedTheme && themes[savedTheme]) setThemeIdState(savedTheme);
        if (savedLang && LANGUAGES[savedLang]) {
          setLanguageState(savedLang);
          // Apply saved RTL direction on every startup
          const shouldBeRTL = LANGUAGES[savedLang].isRTL ?? true;
          if (I18nManager.isRTL !== shouldBeRTL) {
            I18nManager.forceRTL(shouldBeRTL);
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const setThemeId = useCallback(async (id) => {
    if (!themes[id]) return;
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
    } catch (e) {}
  }, []);

  const setLanguage = useCallback(async (code) => {
    if (!LANGUAGES[code]) return;
    const newIsRTL = LANGUAGES[code].isRTL ?? false;
    setLanguageState(code);
    try {
      await AsyncStorage.setItem(LANG_STORAGE_KEY, code);
      // Apply RTL/LTR — if direction flipped, reload the app so layouts update
      if (I18nManager.isRTL !== newIsRTL) {
        I18nManager.forceRTL(newIsRTL);
        await Updates.reloadAsync();
      }
    } catch (e) {}
  }, []);

  const t = useCallback(
    (key) => {
      const lang = LANGUAGES[language];
      if (!lang) return key;
      return lang.translations[key] || key;
    },
    [language],
  );

  const isRTL = LANGUAGES[language]?.isRTL ?? true;

  return (
    <AppContext.Provider
      value={{
        theme: themes[themeId],
        themeId,
        setThemeId,
        language,
        setLanguage,
        t,
        isRTL,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

export default AppContext;
