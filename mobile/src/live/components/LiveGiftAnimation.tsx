import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
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
                html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><style>*{margin:0;padding:0}html,body{background:transparent;width:100%;height:100%;overflow:hidden}canvas{position:absolute;top:0;left:0}</style></head><body><canvas id="c"></canvas><video id="v" muted loop playsinline webkit-playsinline style="display:none"><source src="${event.gift.webmUrl}" type="video/webm"></video><script>var v=document.getElementById('v'),c=document.getElementById('c'),ctx=c.getContext('2d');var W=window.innerWidth||300,H=window.innerHeight||300;c.width=W;c.height=H;function frame(){ctx.clearRect(0,0,W,H);ctx.drawImage(v,0,0,W,H);requestAnimationFrame(frame)}v.addEventListener('playing',function(){frame()});v.play().catch(function(){setTimeout(function(){v.play()},200)});<\/script></body></html>`,
              }}
              style={styles.webmVideo}
              backgroundColor="#00000000"
              scrollEnabled={false}
              originWhitelist={["*"]}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              androidLayerType="software"
            />
          ) : animationJson ? (
            // Lottie JSON loaded — render animated Lottie
            <LottieView
              source={animationJson as AnimationObject}
              autoPlay
              loop
              style={styles.animation}
              resizeMode="contain"
            />
          ) : (event.gift.animationType === "lottie" || event.gift.lottieUrl) ? (
            // Lottie JSON still loading — show thumbnail while waiting
            <Image
              source={{ uri: event.gift.thumbnailUrl || undefined }}
              style={styles.animation}
              resizeMode="contain"
            />
          ) : (event.gift.thumbnailUrl || event.gift.animationUrl) ? (
            // PNG / image gift
            <Image
              source={{ uri: event.gift.thumbnailUrl || event.gift.animationUrl }}
              style={styles.animation}
              resizeMode="contain"
            />
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
