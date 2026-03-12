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

const { width } = Dimensions.get("window");
const MAX_COMMENTS = 40;

const getVipBubbleShapeStyle = (bubbleShape) => {
  switch (bubbleShape) {
    case "rounded":
      return {
        borderRadius: 16,
        borderTopLeftRadius: 16,
      };
    case "square":
      return {
        borderRadius: 8,
        borderTopLeftRadius: 8,
      };
    case "pill":
      return {
        borderRadius: 24,
        borderTopLeftRadius: 24,
      };
    case "classic":
    default:
      return {
        borderRadius: 18,
        borderTopLeftRadius: 4,
      };
  }
};

// ─── Single animated comment row ─────────────────────────────────────────
const CommentRow = React.memo(({ item, isNew, vipLevelStyles }) => {
  const slideY = useRef(new Animated.Value(isNew ? 22 : 0)).current;
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const isSystem = item.isSystem;
  const imageUri = item.user?.profileImage || item.user?.avatar;
  const initials = item.user?.username
    ? item.user.username.charAt(0).toUpperCase()
    : "?";
  const messageText = item.message || item.text || item.body || "";
  const vipLevel = Number(item.user?.vipLevel || 0);
  const isVip = vipLevel > 0;
  const vipStyleEntry = isVip ? vipLevelStyles?.[vipLevel] : null;
  const vipColor = isVip
    ? typeof vipStyleEntry === "string"
      ? vipStyleEntry
      : vipStyleEntry?.color || "#FFD700"
    : null;
  const borderWidthValue =
    isVip && typeof vipStyleEntry === "object"
      ? Number(vipStyleEntry?.borderWidth)
      : 1.4;
  const vipBorderWidth = Number.isFinite(borderWidthValue)
    ? Math.max(0, Math.min(8, borderWidthValue))
    : 1.4;
  const bubbleShape =
    isVip && typeof vipStyleEntry === "object"
      ? vipStyleEntry?.bubbleShape
      : "classic";
  const vipBubbleShapeStyle = getVipBubbleShapeStyle(bubbleShape);

  return (
    <Animated.View
      style={[styles.row, { opacity, transform: [{ translateY: slideY }] }]}
    >
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
          isVip && vipBubbleShapeStyle,
          isVip && vipColor
            ? {
                borderColor: vipColor,
                borderWidth: vipBorderWidth,
              }
            : null,
        ]}
      >
        {item.user?.username ? (
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.username,
                isVip && vipColor ? { color: vipColor } : null,
              ]}
            >
              {item.user.username}
            </Text>
            {isVip && (
              <View
                style={[
                  styles.vipChip,
                  vipColor ? { backgroundColor: vipColor } : null,
                ]}
              >
                <Text style={styles.vipChipText}>VIP{vipLevel}</Text>
              </View>
            )}
          </View>
        ) : null}
        <Text style={[styles.message, isSystem && styles.systemMessage]}>
          {messageText}
        </Text>
      </View>
    </Animated.View>
  );
});

// ─── Container ────────────────────────────────────────────────────────────
const FloatingComments = ({
  comments,
  bottomOffset = 90,
  maxHeight = 400,
  vipLevelStyles = {},
}) => {
  const listRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const userScrolledRef = useRef(false);

  // Show last MAX_COMMENTS only
  const visible = comments.slice(-MAX_COMMENTS);
  const latestId =
    visible.length > 0
      ? visible[visible.length - 1].clientMessageId ||
        visible[visible.length - 1].id ||
        visible[visible.length - 1]._id
      : null;

  const renderItem = useCallback(
    ({ item }) => (
      <CommentRow
        item={item}
        isNew={(item.clientMessageId || item.id || item._id) === latestId}
        vipLevelStyles={vipLevelStyles}
      />
    ),
    [latestId, vipLevelStyles],
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

  // When new message arrives and user is manually scrolled, show "↓ رسائل جديدة" hint
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
    // box-none: outer container passes taps through to content behind it
    <View
      style={[styles.container, { bottom: bottomOffset, maxHeight }]}
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
      />

      {/* "↓" scroll-to-bottom pill when user has scrolled up */}
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
    left: 10,
    width: width * 0.78,
    zIndex: 220,
    elevation: 10,
    // maxHeight is now passed as prop — no static value here
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    flexShrink: 0,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: "rgba(120,80,200,0.6)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bubble: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    maxWidth: "86%",
  },
  vipBubble: {
    backgroundColor: "rgba(8,8,20,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 2,
  },
  username: {
    color: "rgba(180,180,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
  },
  vipChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  vipChipText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  message: {
    color: "#FFF",
    fontSize: 16,
    lineHeight: 21,
  },
  systemMessage: {
    color: "#FFD700",
    fontSize: 15,
    fontStyle: "italic",
  },
  newMsgPill: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginLeft: 4,
  },
  newMsgText: {
    backgroundColor: "rgba(0,191,255,0.85)",
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
});

export default FloatingComments;
