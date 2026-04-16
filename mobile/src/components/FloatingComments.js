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
import { ms, fs } from "../utils/responsive";
import ProfileBadgeFrame from "./ProfileBadgeFrame";

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
const CommentRow = React.memo(({ item, isNew, vipLevelStyles }) => {
  const slideY = useRef(new Animated.Value(isNew ? 22 : 0)).current;
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideY,   { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  const isSystem   = item.isSystem && !item.user;  // purely system (no sender)
  const isGift     = item.isSystem && !!item.user;  // gift msg — has a sender
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
  const vipIconUrl =
    isVip && typeof vipStyleEntry === "object" ? vipStyleEntry?.imageUrl || null : null;
  const commentTextColor =
    isVip && typeof vipStyleEntry === "object" && vipStyleEntry?.commentTextColor
      ? vipStyleEntry.commentTextColor
      : isVip && vipColor
        ? vipColor
        : null;

  const levelColor = getLevelColor(userLevel);

  const activeBadgeUrl =
    item.user?.activeBadge?.imageUrl ||
    item.user?.activeBadge?.image ||
    (typeof item.user?.activeBadge === "string" ? item.user.activeBadge : null) ||
    null;
  // VIP profile frame from admin panel — used when user has no personal badge
  const vipProfileFrameUrl =
    isVip && typeof vipStyleEntry === "object"
      ? vipStyleEntry?.profileFrameLottieUrl || vipStyleEntry?.badgeImageUrl || null
      : null;
  const resolvedBadgeUrl =
    (typeof activeBadgeUrl === "string" && activeBadgeUrl.startsWith("http") ? activeBadgeUrl : null) ||
    (typeof vipProfileFrameUrl === "string" && vipProfileFrameUrl.startsWith("http") ? vipProfileFrameUrl : null);
  const hasActiveBadge = !!resolvedBadgeUrl;

  return (
    <Animated.View style={[
      styles.row,
      { opacity, transform: [{ translateY: slideY }] },
    ]}>
      {/* ── Avatar first in JSX → renders on the visual RIGHT in RTL ── */}
      <View style={styles.avatarWrap}>
        {hasActiveBadge ? (
          <ProfileBadgeFrame
            profileImage={!imgError ? imageUri : null}
            badgeImage={resolvedBadgeUrl}
            size={ms(36)}
          />
        ) : imageUri && !imgError ? (
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
      </View>

      {/* ── Bubble second in JSX → renders to the LEFT of the avatar in RTL ── */}
      <View style={styles.rightCol}>
        {isVip ? (
          <View style={styles.headerRow}>
            <Text
              style={[styles.inlineUsername, { color: vipColor || "#FFD700" }]}
              numberOfLines={1}
            >
              {item.user?.username || ""}
            </Text>
            <View style={[styles.vipChip, { backgroundColor: vipColor ? `${vipColor}33` : "rgba(255,215,0,0.2)", borderWidth: 1, borderColor: vipColor || "#FFD700" }]}>
              <Text style={[styles.vipChipText, { color: vipColor || "#FFD700" }]}>VIP {vipLevel}</Text>
            </View>
            {vipIconUrl ? (
              <Image
                source={{ uri: vipIconUrl }}
                style={[styles.vipIcon, { borderColor: vipColor || "#FFD700" }]}
                resizeMode="contain"
              />
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.bubble,
            (isVip || isGift) && styles.vipBubble,
            (isVip || isGift) && getVipBubbleShapeStyle(bubbleShape),
            (isVip || isGift) && vipColor ? { borderColor: vipColor, borderWidth: vipBorderWidth } : null,
            (isVip || isGift) ? { backgroundColor: vipColor ? `${vipColor}22` : "rgba(100,0,180,0.45)" } : null,
          ]}
        >
          {isGift && item.giftUrl ? (
            <View style={styles.giftMsgRow}>
              <Image source={{ uri: item.giftUrl }} style={styles.giftThumb} resizeMode="contain" />
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.message, commentTextColor ? { color: commentTextColor } : null]} numberOfLines={2} ellipsizeMode="tail">
                  {messageText}
                </Text>
              </View>
            </View>
          ) : isSystem ? (
            <Text style={[styles.message, styles.systemMessage]} numberOfLines={3} ellipsizeMode="tail">
              {messageText}
            </Text>
          ) : (
            <Text style={styles.inlineBubbleText} numberOfLines={isVip ? 2 : 3} ellipsizeMode="tail">
              {!isVip && item.user?.username ? (
                <Text style={styles.inlineUsername}>
                  {item.user.username}{" "}
                </Text>
              ) : null}
              <Text style={[styles.message, commentTextColor ? { color: commentTextColor } : null]}>
                {messageText}
              </Text>
            </Text>
          )}

          {commentFrameLottieUrl ? (
            (/\.json($|\?)/i.test(commentFrameLottieUrl) || (commentFrameLottieUrl.includes("/raw/upload/") && !/\.(png|jpe?g|webp|gif)($|\?)/i.test(commentFrameLottieUrl))) ? (
              <LottieView
                source={{ uri: commentFrameLottieUrl }}
                autoPlay
                loop
                style={styles.commentFrame}
                pointerEvents="none"
                resizeMode="cover"
              />
            ) : (
              <Image
                source={{ uri: commentFrameLottieUrl }}
                style={styles.commentFrame}
                resizeMode="stretch"
                pointerEvents="none"
              />
            )
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

// ─── Container ────────────────────────────────────────────────────────────
const FloatingComments = ({
  comments,
  bottomOffset = 90,
  topOffset = 0,
  vipLevelStyles = {},
  inline = false,
  bottomPadding = 0,
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
    ({ item, index }) => (
      <CommentRow
        item={item}
        isNew={(item.clientMessageId || item.id || item._id) === latestId}
        vipLevelStyles={vipLevelStyles}
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
      style={inline
        ? [styles.inlineContainer, bottomPadding > 0 && { paddingBottom: bottomPadding }]
        : [styles.container, { bottom: bottomOffset, top: topOffset }]
      }
      pointerEvents="box-none"
    >
      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={inline ? styles.listContentInline : styles.listContent}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        decelerationRate={0.92}
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
    zIndex: 100,
    elevation: 100,
    backgroundColor: "transparent",
  },
  inlineContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent",
    paddingHorizontal: ms(8),
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 4,
    paddingBottom: ms(6),
  },
  listContentInline: {
    paddingVertical: 4,
    paddingHorizontal: ms(4),
    paddingBottom: ms(8),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: ms(5),
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  avatarWrap: {
    marginRight: ms(7),
    marginTop: ms(2),
    flexShrink: 0,
  },
  rightCol: {
    flexShrink: 1,
    flexDirection: "column",
  },
  avatar: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: "#ddd",
    borderWidth: 1.5,
    borderColor: "rgba(140,100,255,0.7)",
    flexShrink: 0,
  },
  avatarFallback: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: "rgba(100,60,200,0.85)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "700",
  },
  bubble: {
    backgroundColor: "rgba(0,0,0,0.50)",
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderRadius: ms(18),
    maxWidth: width * 0.66,
    flexShrink: 1,
    overflow: "hidden",
  },
  vipBubble: {
    paddingHorizontal: ms(12),
    paddingVertical: ms(7),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: ms(4),
    marginBottom: ms(3),
    flexWrap: "wrap",
  },
  levelChip: {
    paddingHorizontal: ms(4),
    paddingVertical: ms(1),
    borderRadius: ms(6),
    borderWidth: 1,
  },
  levelChipText: {
    fontSize: fs(8),
    fontWeight: "900",
  },
  username: {
    color: "rgba(200,190,255,0.95)",
    fontSize: fs(12),
    fontWeight: "700",
    flexShrink: 1,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  vipChip: {
    paddingHorizontal: ms(5),
    paddingVertical: ms(1.5),
    borderRadius: ms(8),
  },
  vipIcon: {
    width: ms(15),
    height: ms(15),
    borderRadius: ms(3),
    borderWidth: 1,
  },
  vipChipText: {
    color: "#FFF",
    fontSize: fs(9),
    fontWeight: "800",
  },
  inlineBubbleText: {
    color: "rgba(255,255,255,0.96)",
    fontSize: fs(13),
    lineHeight: fs(18),
    flexShrink: 1,
    flexWrap: "wrap",
  },
  inlineUsername: {
    color: "rgba(200,190,255,0.95)",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    color: "rgba(255,255,255,0.96)",
    fontSize: fs(13),
    lineHeight: fs(18),
    flexShrink: 1,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  giftMsgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    flexShrink: 1,
  },
  giftThumb: {
    width: ms(28),
    height: ms(28),
    flexShrink: 0,
  },
  systemMessage: {
    color: "#444338",
    fontSize: fs(12),
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
