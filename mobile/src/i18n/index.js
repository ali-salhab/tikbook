import { ar } from "./ar";
import { en } from "./en";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const LANGUAGES = {
  ar: { label: "العربية", code: "ar", translations: ar, isRTL: true },
  en: { label: "English", code: "en", translations: en, isRTL: false },
};

export const DEFAULT_LANGUAGE = "ar";

/**
 * Translate a key using the given language code.
 * Falls back to key name if not found.
 */
export const t = (key, langCode = DEFAULT_LANGUAGE) => {
  const lang = LANGUAGES[langCode];
  if (!lang) return key;
  return lang.translations[key] || key;
};

export const LANG_STORAGE_KEY = "@tikbook_language";
export const THEME_STORAGE_KEY = "@tikbook_theme";

export default { t, LANGUAGES, DEFAULT_LANGUAGE };
