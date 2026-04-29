import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ProfileBadgeFrame from "./ProfileBadgeFrame";
import { ms, fs } from "../utils/responsive";
import { darkUi } from "../theme/brand";

/**
 * زخرفة مرجعية (إطار ذهبي/وردي ذهبي + دائرة المستوى أعلى + شريط VIP أسفل)
 * يستخدم عند المعاينات السريعة (مثل الـ modal من التعليقات).
 */
export default function OrnateProfileFrame({
  avatarUrl,
  badgeUrl,
  profileImageUri,
  level = 0,
  vipLevel = 0,
  innerSize = 92,
  username,
}) {
  const SIZE = typeof innerSize === "number" ? innerSize : ms(innerSize ?? 92);
  const framed = !!badgeUrl;
  /** عرض أكبر قليلاً عند وجود PNG إطار من الإدارة */
  const wrapW = framed ? SIZE + ms(76) : SIZE + ms(36);
  const wrapH = framed ? SIZE + ms(92) : SIZE + ms(72);

  return (
    <View style={[styles.stack, { width: wrapW }]}>
      {/* هالة ذهبية خارجية */}
      <LinearGradient
        colors={["#FDE68A", "#CA8A04", "#A16207", "#78350F", "#92400E", "#EA580C66"]}
        locations={[0, 0.18, 0.38, 0.55, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.ornateShell,
          { width: wrapW, height: wrapH },
        ]}
      >
        <LinearGradient
          colors={[darkUi.elevated, darkUi.surface, darkUi.surfaceMuted]}
          style={[styles.ornateInnerMask, { flex: 1 }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={styles.clipArea}>
            {framed ? (
              <ProfileBadgeFrame
                profileImage={profileImageUri || avatarUrl}
                badgeImage={badgeUrl}
                size={SIZE}
                showSparks={false}
              />
            ) : avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={[styles.avatarImg, { width: SIZE, height: SIZE }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarImg, styles.fallbackBg, { width: SIZE, height: SIZE }]}>
                <Text style={styles.initials}>
                  {(username && String(username).trim()[0]) ? String(username).trim()[0].toUpperCase() : "?"}
                </Text>
              </View>
            )}
          </View>

          {/* دائرة المستوى — أعلى الإطار (مثل الصورة المرجعية) */}
          {level > 0 ? (
            <View style={styles.levelAbs} pointerEvents="none">
              <LinearGradient colors={["#FB923C", "#EA580C", "#C2410C"]} style={styles.levelOrb}>
                <Text style={styles.levelOrbTxt}>{String(level)}</Text>
              </LinearGradient>
            </View>
          ) : null}
        </LinearGradient>

        {/* شريط VIP — ضمن الغلاف الزخرفي السفلي (صافي بلون شبيه بالمراجع الداكن) */}
        {vipLevel > 0 ? (
          <View style={styles.ribbonBand} pointerEvents="none">
            <LinearGradient
              colors={["#1D4ED8", "#2563EB", "#38BDF8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ribbonFill}
            >
              <Text style={styles.ribbonTxt}>{`VIP${vipLevel}`}</Text>
              <View style={styles.ribbonShine} />
            </LinearGradient>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignSelf: "center",
    alignItems: "center",
  },
  ornateShell: {
    borderRadius: ms(999),
    borderTopLeftRadius: ms(132),
    borderTopRightRadius: ms(132),
    borderBottomLeftRadius: ms(28),
    borderBottomRightRadius: ms(28),
    padding: ms(5),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: ms(18),
    elevation: 16,
    overflow: "visible",
    position: "relative",
  },
  ornateInnerMask: {
    flex: 1,
    alignSelf: "stretch",
    position: "relative",
    borderRadius: ms(126),
    borderTopLeftRadius: ms(126),
    borderTopRightRadius: ms(126),
    borderBottomLeftRadius: ms(22),
    borderBottomRightRadius: ms(22),
    paddingVertical: ms(18),
    paddingHorizontal: ms(12),
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
    minHeight: ms(140),
    width: "97%",
    marginHorizontal: ms(2),
    marginVertical: ms(2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251,191,36,0.35)",
  },
  clipArea: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: ms(10),
  },
  avatarImg: {
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: ms(3),
    borderColor: "rgba(255,255,255,0.25)",
  },
  fallbackBg: {
    backgroundColor: "rgba(148,163,253,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFF",
    fontSize: fs(36),
    fontWeight: "800",
  },

  levelAbs: {
    position: "absolute",
    top: ms(-12),
    alignSelf: "center",
    zIndex: 20,
    shadowColor: darkUi.ink,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  levelOrb: {
    minWidth: ms(36),
    height: ms(36),
    paddingHorizontal: ms(10),
    borderRadius: ms(999),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: ms(3),
    borderColor: "#FEF9C7",
    overflow: "hidden",
  },
  levelOrbTxt: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: fs(15),
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  ribbonBand: {
    position: "absolute",
    bottom: ms(-14),
    alignSelf: "center",
    zIndex: 25,
    borderRadius: ms(12),
    overflow: "hidden",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.6,
    shadowRadius: ms(14),
    shadowOffset: { width: 0, height: ms(6) },
    elevation: 12,
    minWidth: ms(132),
    borderWidth: ms(1.5),
    borderColor: "rgba(147,197,253,0.95)",
  },
  ribbonFill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ms(22),
    paddingVertical: ms(8),
    position: "relative",
  },
  ribbonShine: {
    position: "absolute",
    top: 2,
    left: ms(22),
    right: ms(22),
    height: ms(4),
    backgroundColor: "rgba(255,255,255,0.42)",
    borderRadius: ms(999),
    opacity: 0.95,
  },
  ribbonTxt: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: fs(14),
    letterSpacing: 0.8,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
