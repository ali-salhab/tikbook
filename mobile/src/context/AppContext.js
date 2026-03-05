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
    bg: "#000000",
    bg2: "#111111",
    bg3: "#1a1a1a",
    card: "#111111",
    border: "#1a1a1a",
    text: "#FFFFFF",
    textSecondary: "#AAAAAA",
    textMuted: "#666666",
    placeholder: "#666666",
    accent: "#FE2C55",
    icon: "#FFFFFF",
    iconMuted: "#666666",
    tabBar: "#000000",
    header: "#000000",
    input: "#111111",
    switch: { false: "#333", true: "#FE2C55" },
  },
  light: {
    id: "light",
    bg: "#F5F5F5",
    bg2: "#FFFFFF",
    bg3: "#EEEEEE",
    card: "#FFFFFF",
    border: "#E5E5E5",
    text: "#000000",
    textSecondary: "#444444",
    textMuted: "#888888",
    placeholder: "#AAAAAA",
    accent: "#FE2C55",
    icon: "#000000",
    iconMuted: "#888888",
    tabBar: "#FFFFFF",
    header: "#FFFFFF",
    input: "#EEEEEE",
    switch: { false: "#DDD", true: "#FE2C55" },
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
