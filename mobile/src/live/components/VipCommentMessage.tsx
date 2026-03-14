import React, { memo, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";
import { fetchLottieJson, getCachedLottieJson } from "../services/lottieCache";

type Props = {
  avatar?: string;
  username: string;
  message: string;
  vipLevel?: number;
  frameAnimationUrl?: string;
  shouldAnimateFrame?: boolean;
};

const vipColorMap: Record<number, string> = {
  1: "#A56B2A",
  2: "#A7AFBD",
  3: "#D9A930",
  5: "#D64F4F",
  7: "#5A5EF1",
  10: "#FF7C1A",
};

const VipCommentMessage = ({
  avatar,
  username,
  message,
  vipLevel = 0,
  frameAnimationUrl,
  shouldAnimateFrame = true,
}: Props) => {
  const [frameJson, setFrameJson] = useState<unknown | null>(() =>
    getCachedLottieJson(frameAnimationUrl),
  );

  useEffect(() => {
    let mounted = true;

    if (!frameAnimationUrl || vipLevel <= 0 || !shouldAnimateFrame) {
      setFrameJson(null);
      return () => {
        mounted = false;
      };
    }

    fetchLottieJson(frameAnimationUrl).then((json) => {
      if (!mounted) return;
      setFrameJson(json);
    });

    return () => {
      mounted = false;
    };
  }, [frameAnimationUrl, vipLevel, shouldAnimateFrame]);

  const usernameColor = useMemo(() => {
    return vipColorMap[vipLevel] || "#F5F6FB";
  }, [vipLevel]);

  return (
    <View style={styles.row}>
      <Image
        source={{
          uri:
            avatar ||
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=60",
        }}
        style={styles.avatar}
      />

      <View style={styles.bubbleWrap}>
        {Boolean(frameJson && shouldAnimateFrame) && (
          <View pointerEvents="none" style={styles.frameLayer}>
            <LottieView
              source={frameJson as object}
              autoPlay
              loop
              resizeMode="stretch"
              style={styles.frame}
            />
          </View>
        )}

        <View style={styles.bubble}>
          <View style={styles.headerLine}>
            <Text style={[styles.username, { color: usernameColor }]} numberOfLines={1}>
              {username}
            </Text>
            {vipLevel > 0 && <Text style={styles.vipChip}>{`VIP${vipLevel}`}</Text>}
          </View>

          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
  },
  bubbleWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  frameLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  frame: {
    width: "100%",
    height: "100%",
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(12, 18, 34, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    zIndex: 2,
  },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  username: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  vipChip: {
    color: "#111827",
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#F9D66E",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  message: {
    color: "#FAFAFA",
    fontSize: 13,
    lineHeight: 17,
  },
});

const isEqual = (prev: Props, next: Props) => {
  return (
    prev.avatar === next.avatar &&
    prev.username === next.username &&
    prev.message === next.message &&
    prev.vipLevel === next.vipLevel &&
    prev.frameAnimationUrl === next.frameAnimationUrl &&
    prev.shouldAnimateFrame === next.shouldAnimateFrame
  );
};

export default memo(VipCommentMessage, isEqual);
