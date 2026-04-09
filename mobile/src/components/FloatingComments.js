import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import LottieView from "lottie-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ms, fs } from "../utils/responsive";

const { width } = Dimensions.get("window");
const MAX_COMMENTS = 40;

const getVipBubbleShapeStyle = (bubbleShape) => {
  switch (bubbleShape) {
    case "rounded":
      return { borderRadius: 16, borderTopLeftRadius: 16 };
    case "square":
      return { borderRadius: 8, borderTopLeftRadius: 8 };
    case "pill":
      return { borderRadius: 24, borderTopLeftRadius: 24 };
    case "classic":
    default:
      return { borderRadius: 18, borderTopLeftRadius: 4 };
  }
};

// Level color — spending-based tier colours
const getLevelColor = (level) => {
  if (level >= 11) return "#FFD700"; // gold
  if (level >= 6) return "#C0C0C0";  // silver
  if (level >= 1) return "#CD7F32";  // bronze
  return null;
};

// ─── Single animated comment row ─────────────────────────────────────────
const CommentRow = React.memo(({ item, isNew, vipLevelStyles, distanceFromEnd = 0 }) => {
  const slideY = useRef(new Animated.Value(isNew ? 22 : 0)).current;
  // Wheel effect target opacity — further rows are dimmer
  const targetOpacity = Math.max(0.18, 1 - distanceFromEnd * 0.18);
  const opacity = useRef(new Animated.Value(isNew ? 0 : targetOpacity)).current;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: targetOpacity, duration: 220, useNativeDriver: true }),
        Animated.timing(slideY,   { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  // Wheel effect: rows further from the newest are smaller
  const wheelScale = Math.max(0.72, 1 - distanceFromEnd * 0.055);
  const isSystem   = item.isSystem;
  const imageUri   = item.user?.profileImage || item.user?.avatar;
  const initials   = item.user?.username ? item.user.username.charAt(0).toUpperCase() : "?";
  const messageText = item.message || item.text || item.body || "";
  const vipLevel   = Number(item.user?.vipLevel || 0);
  const userLevel  = Number(item.user?.level    || 0);
  const isVip      = vipLevel > 0;

  const vipStyleEntry  = isVip ? vipLevelStyles?.[vipLevel] : null;
  const vipColor       = isVip
    ? typeof vipStyleEntry === "string" ? vipStyleEntry : vipStyleEntry?.color || "#FFD700"
    : null;
  const borderWidthValue =
    isVip && typeof vipStyleEntry === "object" ? Number(vipStyleEntry?.borderWidth) : 1.4;
  const vipBorderWidth = Number.isFinite(borderWidthValue)
    ? Math.max(0, Math.min(8, borderWidthValue))
    : 1.4;
  const bubbleShape     = isVip && typeof vipStyleEntry === "object" ? vipStyleEntry?.bubbleShape : "classic";
  const commentFrameLottieUrl =
    isVip && typeof vipStyleEntry === "object" ? vipStyleEntry?.commentFrameLottieUrl || null : null;

  const levelColor = getLevelColor(userLevel);

  return (
    <Animated.View style={[
      styles.row,
      {
        opacity,
        transform: [
          { translateY: slideY },
          { scale: wheelScale },
        ],
      },
    ]}>
      {imageUri && !imgError ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.avatar}
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initials}</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isVip && styles.vipBubble,
          isVip && getVipBubbleShapeStyle(bubbleShape),
          isVip && vipColor ? { borderColor: vipColor, borderWidth: vipBorderWidth } : null,
        ]}
      >
        {/* Header row: level badge + username + VIP chip */}
        <View style={styles.headerRow}>
          {/* Spending-level badge */}
          {userLevel > 0 && (
            <View style={[styles.levelChip, { backgroundColor: levelColor + "30", borderColor: levelColor }]}>
              <Text style={[styles.levelChipText, { color: levelColor }]}>Lv{userLevel}</Text>
            </View>
          )}

          {item.user?.username ? (
            <Text style={[styles.username, isVip && vipColor ? { color: vipColor } : null]}>
              {item.user.username}
            </Text>
          ) : null}

          {isVip && (
            <View style={[styles.vipChip, vipColor ? { backgroundColor: vipColor } : null]}>
              <Text style={styles.vipChipText}>VIP{vipLevel}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.message, isSystem && styles.systemMessage]}>
          {messageText}
        </Text>

        {commentFrameLottieUrl ? (
          <LottieView
            source={{ uri: commentFrameLottieUrl }}
            autoPlay
            loop
            style={styles.commentFrame}
            pointerEvents="none"
            resizeMode="cover"
          />
        ) : null}
      </View>
    </Animated.View>
  );
});

// ─── Container ────────────────────────────────────────────────────────────
const FloatingComments = ({
  comments,
  bottomOffset = 90,
  topOffset = 0,
  topFadeHeight = ms(120),
  vipLevelStyles = {},
}) => {
  const listRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const userScrolledRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Show last MAX_COMMENTS only
  const visible = comments.slice(-MAX_COMMENTS);
  const latestId =
    visible.length > 0
      ? visible[visible.length - 1].clientMessageId ||
        visible[visible.length - 1].id ||
        visible[visible.length - 1]._id
      : null;

  const renderItem = useCallback(
    ({ item, index }) => (
      <CommentRow
        item={item}
        isNew={(item.clientMessageId || item.id || item._id) === latestId}
        vipLevelStyles={vipLevelStyles}
        distanceFromEnd={visible.length - 1 - index}
      />
    ),
    [latestId, vipLevelStyles, visible.length],
  );

  const keyExtractor = useCallback(
    (item, index) =>
      String(item.clientMessageId || item.id || item._id || item.timestamp || index),
    [],
  );

  // Auto-scroll to newest ONLY when user hasn't manually scrolled up
  useEffect(() => {
    if (!userScrolledRef.current && visible.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [visible.length]);

  const handleScrollBegin = () => {
    userScrolledRef.current = true;
    setUserScrolled(true);
  };

  const handleScrollEnd = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isAtBottom) {
      userScrolledRef.current = false;
      setUserScrolled(false);
    }
  };

  const scrollToBottom = () => {
    userScrolledRef.current = false;
    setUserScrolled(false);
    listRef.current?.scrollToEnd({ animated: true });
  };

  if (visible.length === 0) return null;

  return (
    <View
      style={[styles.container, { bottom: bottomOffset, top: topOffset }]}
      pointerEvents="box-none"
    >
      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        decelerationRate={0.92}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
      />

      {/* Top fade-out gradient so comments dissolve as they enter the seat area above */}
      <LinearGradient
        colors={["rgba(0,0,12,0.88)", "rgba(0,0,12,0.0)"]}
        style={[styles.topFade, { height: topFadeHeight }]}
        pointerEvents="none"
      />

      {userScrolled && (
        <View style={styles.newMsgPill} pointerEvents="box-none">
          <Text style={styles.newMsgText} onPress={scrollToBottom}>
            ↓ رسائل جديدة
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: ms(10),
    width: width * 0.75,
    zIndex: 50,
    elevation: 3,
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: "none",
    zIndex: 2,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 4,
    paddingBottom: ms(6),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: ms(8),
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  avatar: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    marginRight: ms(6),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    flexShrink: 0,
  },
  avatarFallback: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    marginRight: ms(6),
    backgroundColor: "rgba(120,80,200,0.65)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: fs(13),
    fontWeight: "700",
  },
  bubble: {
    backgroundColor: "rgba(0,0,0,0.62)",
    paddingHorizontal: ms(12),
    paddingVertical: ms(7),
    borderRadius: ms(18),
    borderTopLeftRadius: ms(4),
    maxWidth: "88%",
  },
  vipBubble: {
    backgroundColor: "rgba(8,8,20,0.82)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: ms(5),
    marginBottom: ms(2),
    flexWrap: "wrap",
  },
  levelChip: {
    paddingHorizontal: ms(5),
    paddingVertical: ms(1),
    borderRadius: ms(8),
    borderWidth: 1,
  },
  levelChipText: {
    fontSize: fs(9),
    fontWeight: "900",
  },
  username: {
    color: "rgba(190,185,255,0.95)",
    fontSize: fs(13),
    fontWeight: "700",
  },
  vipChip: {
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    borderRadius: ms(10),
  },
  vipChipText: {
    color: "#FFF",
    fontSize: fs(10),
    fontWeight: "800",
  },
  message: {
    color: "#FFF",
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  systemMessage: {
    color: "#FFD700",
    fontSize: fs(14),
    fontStyle: "italic",
  },
  newMsgPill: {
    alignSelf: "flex-start",
    marginTop: ms(4),
    marginLeft: ms(4),
  },
  newMsgText: {
    backgroundColor: "rgba(0,191,255,0.85)",
    color: "#FFF",
    fontSize: fs(13),
    fontWeight: "700",
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(20),
    overflow: "hidden",
  },
  commentFrame: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    pointerEvents: "none",
  },
});

export default FloatingComments;
