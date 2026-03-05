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

// ── Theme palettes ─────────────────────────────────────────────────────────

export const themes = {
  dark: {
    id: "dark",
    bg: "#0A0A0A",
    bg2: "#121212",
    bg3: "#252525",
    card: "#1C1C1C",
    border: "#333333",
    text: "#F0F0F0",
    textSecondary: "#C0C0C0",
    textMuted: "#888888",
    placeholder: "#777777",
    accent: "#FE2C55",
    icon: "#F0F0F0",
    iconMuted: "#AAAAAA",
    tabBar: "#0A0A0A",
    header: "#121212",
    input: "#1C1C1C",
    inputBorder: "#333333",
    buttonBg: "#2A2A2A",
    buttonBorder: "#3A3A3A",
    switch: { false: "#444", true: "#FE2C55" },
  },
  light: {
    id: "light",
    bg: "#F2F2F7",
    bg2: "#FFFFFF",
    bg3: "#E8E8ED",
    card: "#FFFFFF",
    border: "#D1D1D6",
    text: "#1C1C1E",
    textSecondary: "#3A3A3C",
    textMuted: "#6C6C70",
    placeholder: "#8E8E93",
    accent: "#FE2C55",
    icon: "#1C1C1E",
    iconMuted: "#555555",
    tabBar: "#FFFFFF",
    header: "#FFFFFF",
    input: "#E8E8ED",
    inputBorder: "#C7C7CC",
    buttonBg: "#E8E8ED",
    buttonBorder: "#C7C7CC",
    switch: { false: "#C7C7CC", true: "#FE2C55" },
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
