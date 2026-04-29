/**
 * هوية التطبيق: تدرج قرنفلي → بنفسجي → سماوي (قطري من أعلى اليسار لأسفل اليمين).
 * لتحديث الشعار في كل التطبيق والمتجر: استبدل `assets/adaptive-icon.png` (و`icon.png` عند الحاجة)
 * أو ضع مصدراً عالياً الجودة في `assets/brand-master.png` وشغّل `node createIcons.js`.
 */

/** تدرج العلامة (أزرار، تسجيل، شاشة البداية البارزة) */
export const brandGradient = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  colors: ["#FF2D92", "#A855F7", "#22D3EE"],
  locations: [0, 0.52, 1],
};

/** خلفية الشاشات العامة (داكنة مع نفس درجات اللون بشكل خافت للقراءة) */
export const screenBackgroundGradient = {
  dark: {
    colors: ["#140810", "#100A18", "#081418"],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  light: {
    colors: ["#FDF2F8", "#F3E8FF", "#E0F7FA"],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

/** تسجيل الدخول / التسجيل — نفس المسار اللوني مع عمق أغمق قليلاً */
export const authScreenGradient = {
  colors: ["#0a060c", "#120a14", "#0e0a18", "#081218", "#06080c"],
  locations: [0, 0.25, 0.5, 0.75, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const brandColors = {
  magenta: "#FF2D92",
  violet: "#A855F7",
  cyan: "#22D3EE",
  /** لون التمييز الموحّد (بديل #FF2D92 السابق) */
  accent: "#FF2D92",
};

/** أيقونة التطبيق الموحّدة داخل الواجهات */
export const brandIconSource = require("../../assets/adaptive-icon.png");
