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

/** خلفية الشاشات — ألوان متناغمة مع الشعار (داكن / فاتح) */
export const screenBackgroundGradient = {
  dark: {
    colors: ["#120818", "#0E0A1A", "#08141C"],
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

/** تسجيل الدخول — عمق داكن مع لمسات من نفس التدرج */
export const authScreenGradient = {
  colors: ["#0C0610", "#100818", "#0A0E1C", "#06141A", "#06080E"],
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
