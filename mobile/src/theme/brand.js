/**
 * هوية التطبيق: تدرج وردي → بنفسجي → سماوي (مطابق لشعار brand-master).
 * الملف المصدر للأيقونات: `assets/brand-master.png` — لتوليد أحجام المتجر: `npm i sharp && node createIcons.js`
 */

/** تدرج العلامة (أزرار، شاشة البداية، عناصر بارزة) */
export const brandGradient = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  colors: ["#FF3366", "#6633FF", "#33CCFF"],
  locations: [0, 0.5, 1],
};

/** أسطح داكنة دافئة (بنفسجيـ/كُحلي) — بديل عن الأسود الصريح */
export const darkUi = {
  /** جذور الشاشات، سبلاش، لودر ملء الشاشة */
  canvas: "#141022",
  /** خلفية التطبيق الرئيسية */
  surface: "#17142C",
  surfaceMuted: "#151228",
  elevated: "#1E1A38",
  card: "#1C1834",
  /** شريط تبويب وعناوين */
  bar: "#13101F",
  /** أغمق طبقة (فيديو خلف المحتوى، حواف) ليس أسود نقي */
  ink: "#0E0C18",
};

/** خلفية الشاشات — ألوان متناغمة مع الشعار (داكن / فاتح) */
export const screenBackgroundGradient = {
  dark: {
    colors: ["#18122E", "#14101E", "#101828"],
    locations: [0, 0.48, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  light: {
    colors: ["#FFF0F5", "#F3ECFF", "#E8FAFF"],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

/** تسجيل الدخول — عمق داكن بدون أسود خام */
export const authScreenGradient = {
  colors: ["#160F26", "#14101E", "#101C28", "#0F1A26", "#121422"],
  locations: [0, 0.22, 0.45, 0.72, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

/** ألوان مسطّحة للاستيراد في الشاشات */
export const brandColors = {
  magenta: "#FF3366",
  violet: "#6633FF",
  cyan: "#33CCFF",
  accent: "#FF3366",
  /** للتدرجات الثانوية والحدود الشفافة */
  magentaSoft: "rgba(255, 51, 102, 0.22)",
  violetSoft: "rgba(102, 51, 255, 0.2)",
  cyanSoft: "rgba(51, 204, 255, 0.18)",
};

/** شعار الواجهة (نفس ملف المصدر العالي الجودة) */
export const brandIconSource = require("../../assets/brand-master.png");
