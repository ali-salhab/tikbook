import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import LottieView, { type AnimationObject } from "lottie-react-native";
import { WebView } from "react-native-webview";
import type { GiftEventPayload } from "../types";
import { fetchLottieJson, getCachedLottieJson } from "../services/lottieCache";

type Props = {
  event: GiftEventPayload;
  stackIndex: number;
  onComplete: (id: string) => void;
};

const DURATION_MS = 2300;

const LiveGiftAnimation = ({ event, stackIndex, onComplete }: Props) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const [animationJson, setAnimationJson] = useState<unknown | null>(() =>
    getCachedLottieJson(event.gift.lottieUrl || event.gift.animationUrl),
  );

  const title = useMemo(() => {
    const senderName = event.sender?.username || "Someone";
    const qty = event.quantity > 1 ? ` x${event.quantity}` : "";
    return `${senderName} sent ${event.gift.name}${qty}`;
  }, [event]);

  useEffect(() => {
    let mounted = true;

    const url = event.gift.lottieUrl || event.gift.animationUrl;
    if (url) {
      fetchLottieJson(url).then((json) => {
        if (!mounted) return;
        setAnimationJson(json);
      });
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(DURATION_MS - 520),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: 240,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete(event.id);
    });

    return () => {
      mounted = false;
      opacity.stopAnimation();
      translateY.stopAnimation();
      scale.stopAnimation();
    };
  }, [event.id]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
          top: 40 + stackIndex * 96,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.animationWrap}>
          {event.gift.webmUrl ? (
            <WebView
              source={{
                html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:transparent;width:100%;height:100%;overflow:hidden}video{width:100%;height:100%;object-fit:contain;background:transparent}</style></head><body><video autoplay loop muted playsinline><source src="${event.gift.webmUrl}" type="video/webm"></video></body></html>`,
              }}
              style={styles.webmVideo}
              backgroundColor="transparent"
              scrollEnabled={false}
              originWhitelist={["*"]}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
            />
          ) : animationJson ? (
            <LottieView source={animationJson as AnimationObject} autoPlay loop style={styles.animation} />
          ) : (
            <Text style={styles.fallback}>{event.gift.name}</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 60,
  },
  card: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(6, 10, 22, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  title: {
    color: "#F3F4F6",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  animationWrap: {
    height: 70,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  animation: {
    width: "100%",
    height: "100%",
  },
  webmVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  fallback: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default LiveGiftAnimation;
