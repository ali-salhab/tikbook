import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLive } from "../context/LiveContext";

const { width, height } = Dimensions.get("window");

const FloatingLivePlayer = ({ navigationRef }) => {
  const {
    isMinimized,
    restore,
    releaseEngine,
    channelName,
    viewerCount,
    isBroadcaster,
  } = useLive();

  const position = useRef(
    new Animated.ValueXY({ x: width - 140, y: height - 310 }),
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        position.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: () => {
        position.flattenOffset();
      },
    }),
  ).current;

  if (!isMinimized || !channelName) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: position.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={releaseEngine}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="close" size={12} color="#FFF" />
      </TouchableOpacity>

      {/* Main card */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          restore();
          navigationRef?.current?.navigate("Live", {
            restore: true,
            isBroadcaster,
            channelId: channelName,
          });
        }}
      >
        {/* Video placeholder with animated pulse */}
        <View style={styles.preview}>
          <Ionicons name="radio" size={32} color="#FF3366" />
          <View style={styles.pulseRing} />
        </View>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View style={styles.viewersRow}>
            <Ionicons name="people" size={10} color="#ccc" />
            <Text style={styles.viewersText}>{viewerCount}</Text>
          </View>
        </View>

        {/* Tap hint */}
        <Text style={styles.tapHint}>اضغط للعودة</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 120,
    zIndex: 9999,
    elevation: 20,
  },
  closeBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#000",
    zIndex: 10001,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#FF3366",
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  preview: {
    height: 90,
    backgroundColor: "#0d0d0d",
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(254,44,85,0.3)",
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(254,44,85,0.15)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FF3366",
  },
  liveText: {
    color: "#FF3366",
    fontSize: 9,
    fontWeight: "900",
  },
  viewersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewersText: {
    color: "#ccc",
    fontSize: 10,
  },
  tapHint: {
    color: "#555",
    fontSize: 9,
    textAlign: "center",
    paddingBottom: 6,
  },
});

export default FloatingLivePlayer;
