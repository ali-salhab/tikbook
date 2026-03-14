import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";
import type { LiveRoomUser } from "../types";
import { fetchLottieJson, getCachedLottieJson } from "../services/lottieCache";

type Props = {
  user: LiveRoomUser | null;
  /** Optional Lottie URL override — used when the URL comes from VIP level config rather than the user object */
  joinAnimationUrl?: string | null;
  onDone?: () => void;
};

const JoinAnimation = ({ user, joinAnimationUrl, onDone }: Props) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;
  const [animationJson, setAnimationJson] = useState<unknown | null>(null);

  const isVisible = Boolean(user?._id && Number(user?.vipLevel || 0) > 0);

  const joinTitle = useMemo(() => {
    if (!user) return "";
    const vip = Number(user.vipLevel || 0);
    return `${user.username} joined${vip > 0 ? ` (VIP${vip})` : ""}`;
  }, [user]);

  useEffect(() => {
    let mounted = true;

    if (!isVisible) {
      setAnimationJson(null);
      return () => {
        mounted = false;
      };
    }

    const url = joinAnimationUrl || user?.joinAnimationLottieUrl;
    const cached = getCachedLottieJson(url);
    if (cached) {
      setAnimationJson(cached);
    } else if (url) {
      fetchLottieJson(url).then((json) => {
        if (!mounted) return;
        setAnimationJson(json);
      });
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1700),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onDone?.();
    });

    return () => {
      mounted = false;
      opacity.stopAnimation();
      translateY.stopAnimation();
    };
  }, [user?._id]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.label} numberOfLines={1}>
          {joinTitle}
        </Text>
        {animationJson ? (
          <LottieView source={animationJson as object} autoPlay loop style={styles.animation} />
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    zIndex: 65,
  },
  card: {
    borderRadius: 14,
    backgroundColor: "rgba(8, 12, 27, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  label: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "800",
  },
  animation: {
    height: 54,
    width: "100%",
  },
});

export default JoinAnimation;
