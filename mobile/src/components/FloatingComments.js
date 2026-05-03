import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { ms, fs, getWindowDimensions } from "../utils/responsive";
import ProfileBadgeFrame from "./ProfileBadgeFrame";

const { width } = getWindowDimensions();
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
const normalizePinnedUserId = (raw) => {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && raw._id != null) return String(raw._id);
  return String(raw);
};

const CommentRow = React.memo(
  ({ item, isNew, vipLevelStyles, onAvatarPress, onLongPress, onPressBubble, rowStyle }) => {
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
  // When a PNG/Lottie frame image is set it becomes the visual border — suppress the styled border
  const hasBubbleFrame = !!commentFrameLottieUrl;
  /** Same rule as overlay: JSON / Cloudinary ambiguous → Lottie ; else raster (PNG…) */
  const commentFrameUsesLottie =
    hasBubbleFrame &&
    (/\.json($|\?)/i.test(commentFrameLottieUrl) ||
      (commentFrameLottieUrl.includes("/raw/upload/") &&
        !/\.(png|jpe?g|webp|gif)($|\?)/i.test(commentFrameLottieUrl)));
  const isRasterCommentFrame = hasBubbleFrame && !commentFrameUsesLottie;
  const commentFrameBgColor =
    isVip && typeof vipStyleEntry === "object" ? vipStyleEntry?.commentFrameBgColor || null : null;
  const commentBubbleBgColor =
    isVip && typeof vipStyleEntry === "object" ? vipStyleEntry?.commentBubbleBgColor || null : null;
  const vipLevelIconUrl =
    isVip && typeof vipStyleEntry === "object"
      ? vipStyleEntry?.levelIconUrl || vipStyleEntry?.imageUrl || null
      : null;
  const vipBadgeIcons =
    isVip && typeof vipStyleEntry === "object"
      ? [
          ...(Array.isArray(vipStyleEntry?.vipBadgeIcons) ? vipStyleEntry.vipBadgeIcons : []),
          vipStyleEntry?.badgeImageUrl || "",
          vipStyleEntry?.badgeLottieUrl || "",
        ]
          .filter(Boolean)
          .filter((url, idx, arr) => arr.indexOf(url) === idx)
          .filter((url) => url !== vipLevelIconUrl)
      : [];
  const isLottieUrl = (url) =>
    typeof url === "string" &&
    (/\.json($|\?)/i.test(url) ||
      (url.includes("/raw/upload/") && !/\.(png|jpe?g|webp|gif)($|\?)/i.test(url)));
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
  // Personal badge icon shown inline in header — supports PNG/WebP and Lottie JSON
  const isBadgeLottie =
    typeof activeBadgeUrl === "string" &&
    activeBadgeUrl.startsWith("http") &&
    (/\.json($|\?)/i.test(activeBadgeUrl) ||
      (activeBadgeUrl.includes("/raw/upload/") &&
        !/\.(png|jpe?g|webp|gif)($|\?)/i.test(activeBadgeUrl)));
  const badgeIconUrl =
    typeof activeBadgeUrl === "string" && activeBadgeUrl.startsWith("http")
      ? activeBadgeUrl
      : null;

  // Unified inline header (username + admin-uploaded badges/icons) — always
  // rendered ABOVE the comment bubble/frame so admin assets are never hidden.
  const renderInlineHeader = () => {
    if (isSystem) return null;
    return (
      <View style={styles.inlineHeader}>
        <Text
          style={[styles.inlineUsername, isVip && { color: vipColor || "#FFD700" }]}
          numberOfLines={1}
        >
          {item.user?.username || ""}
        </Text>
        {badgeIconUrl ? (
          isBadgeLottie ? (
            <View style={styles.inlineIconClip}>
              <LottieView
                source={{ uri: badgeIconUrl }}
                autoPlay
                loop
                style={styles.badgeIconCover}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.inlineIconClip}>
              <Image
                source={{ uri: badgeIconUrl }}
                style={styles.badgeIconCover}
                resizeMode="contain"
              />
            </View>
          )
        ) : null}
        {userLevel > 0 && levelColor ? (
          <View style={[styles.levelChip, { borderColor: levelColor }]}>
            <Text style={[styles.levelChipText, { color: levelColor }]}>
              {userLevel}
            </Text>
          </View>
        ) : null}
        {isVip && vipLevelIconUrl ? (
          isLottieUrl(vipLevelIconUrl) ? (
            <View style={styles.inlineVipIconClip}>
              <LottieView
                source={{ uri: vipLevelIconUrl }}
                autoPlay
                loop
                style={styles.vipIconCover}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.inlineVipIconClip}>
              <Image
                source={{ uri: vipLevelIconUrl }}
                style={styles.vipIconCover}
                resizeMode="contain"
              />
            </View>
          )
        ) : isVip ? (
          <View
            style={[
              styles.vipChip,
              {
                borderColor: vipColor || "#FFD700",
                borderWidth: 1,
                backgroundColor: "transparent",
              },
            ]}
          >
            <Text style={[styles.vipChipText, { color: vipColor || "#FFD700" }]}>
              VIP{vipLevel}
            </Text>
          </View>
        ) : null}
        {isVip && vipBadgeIcons.length > 0
          ? vipBadgeIcons.slice(0, 2).map((badgeUrl, idx) => (
              <View key={`vip-extra-${idx}`} style={styles.vipBadgeSmallClip}>
                {isLottieUrl(badgeUrl) ? (
                  <LottieView
                    source={{ uri: badgeUrl }}
                    autoPlay
                    loop
                    style={styles.vipBadgeSmallCover}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={{ uri: badgeUrl }}
                    style={styles.vipBadgeSmallCover}
                    resizeMode="contain"
                  />
                )}
              </View>
            ))
          : null}
      </View>
    );
  };

  const canPress =
    !isSystem && !!(item.user?._id || item.user?.id);
  const handleAvatarPress = () => {
    if (canPress && onAvatarPress) onAvatarPress(item);
  };
  const handleLongPress = () => {
    if (canPress && onLongPress) onLongPress(item);
  };

  const bubbleBlock = (
    <>
      {renderInlineHeader()}
      {hasBubbleFrame ? (
        commentFrameUsesLottie ? (
          <View style={styles.bubbleFrameOuter}>
            <View
              style={[
                styles.bubble,
                styles.bubbleWithFrameOverlay,
                {
                  backgroundColor: commentFrameBgColor || "transparent",
                  borderWidth: 0,
                  borderRadius: 0,
                  paddingHorizontal: ms(18),
                  paddingVertical: ms(10),
                  maxWidth: width * 0.68,
                },
              ]}
            >
              {isGift && item.giftUrl ? (
                <View style={styles.giftMsgRow}>
                  <Image
                    source={{ uri: item.giftUrl }}
                    style={styles.giftThumb}
                    resizeMode="cover"
                  />
                  <View style={{ flexShrink: 1 }}>
                    <Text
                      style={[
                        styles.message,
                        commentTextColor ? { color: commentTextColor } : null,
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {messageText}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text
                  style={[
                    styles.message,
                    commentTextColor ? { color: commentTextColor } : null,
                    isSystem && styles.systemMessage,
                  ]}
                  numberOfLines={isSystem ? 3 : 2}
                  ellipsizeMode="tail"
                >
                  {messageText}
                </Text>
              )}
            </View>
            <LottieView
              source={{ uri: commentFrameLottieUrl }}
              autoPlay
              loop
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
              resizeMode="cover"
            />
          </View>
        ) : (
          <ImageBackground
            source={{ uri: commentFrameLottieUrl }}
            style={[
              styles.bubble,
              styles.bubbleWithFrameOverlay,
              styles.bubbleRasterFrameWrap,
              {
                backgroundColor: commentFrameBgColor || "transparent",
                borderWidth: 0,
                borderRadius: 0,
                paddingHorizontal: isRasterCommentFrame ? ms(32) : ms(22),
                paddingVertical: isRasterCommentFrame ? ms(18) : ms(12),
                maxWidth: width * 0.72,
              },
            ]}
            resizeMode="stretch"
            imageStyle={styles.bubbleRasterFrameImage}
          >
            {isGift && item.giftUrl ? (
              <View style={styles.giftMsgRow}>
                <Image
                  source={{ uri: item.giftUrl }}
                  style={styles.giftThumb}
                  resizeMode="cover"
                />
                <View style={{ flexShrink: 1 }}>
                  <Text
                    style={[
                      styles.message,
                      commentTextColor ? { color: commentTextColor } : null,
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {messageText}
                  </Text>
                </View>
              </View>
            ) : (
              <Text
                style={[
                  styles.message,
                  commentTextColor ? { color: commentTextColor } : null,
                  isSystem && styles.systemMessage,
                ]}
                numberOfLines={isSystem ? 3 : 2}
                ellipsizeMode="tail"
              >
                {messageText}
              </Text>
            )}
          </ImageBackground>
        )
      ) : (
        <View
          style={[
            styles.bubble,
            (isVip || isGift) && styles.vipBubble,
            (isVip || isGift) && getVipBubbleShapeStyle(bubbleShape),
            (isVip || isGift) && vipColor
              ? { borderColor: vipColor, borderWidth: vipBorderWidth }
              : null,
            (isVip || isGift)
              ? {
                  backgroundColor:
                    commentBubbleBgColor ||
                    (vipColor ? `${vipColor}22` : "rgba(100,0,180,0.45)"),
                }
              : null,
          ]}
        >
          {isGift && item.giftUrl ? (
            <View style={styles.giftMsgRow}>
              <Image
                source={{ uri: item.giftUrl }}
                style={styles.giftThumb}
                resizeMode="cover"
              />
              <View style={{ flexShrink: 1 }}>
                <Text
                  style={[
                    styles.message,
                    commentTextColor ? { color: commentTextColor } : null,
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {messageText}
                </Text>
              </View>
            </View>
          ) : (
            <Text
              style={[
                styles.message,
                commentTextColor ? { color: commentTextColor } : null,
                isSystem && styles.systemMessage,
              ]}
              numberOfLines={isSystem ? 3 : 3}
              ellipsizeMode="tail"
            >
              {messageText}
            </Text>
          )}
        </View>
      )}
    </>
  );

  return (
    <TouchableWithoutFeedback
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
    <Animated.View style={[
      styles.row,
      rowStyle,
      { opacity, transform: [{ translateY: slideY }] },
    ]}>
      {/* ── Avatar first in JSX → renders on the visual RIGHT in RTL ── */}
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={handleAvatarPress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        disabled={!canPress}
        activeOpacity={0.75}
      >
        {hasActiveBadge ? (
          <ProfileBadgeFrame
            profileImage={!imgError ? imageUri : null}
            badgeImage={resolvedBadgeUrl}
            size={ms(40)}
          />
        ) : imageUri && !imgError ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{initials}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Bubble second in JSX → renders to the LEFT of the avatar in RTL ── */}
      {onPressBubble ? (
        <Pressable
          onPress={onPressBubble}
          style={({ pressed }) => [styles.rightCol, pressed && styles.rightColPressed]}
        >
          {bubbleBlock}
        </Pressable>
      ) : (
        <View style={styles.rightCol}>{bubbleBlock}</View>
      )}
    </Animated.View>
    </TouchableWithoutFeedback>
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
  onAvatarPress,
  onLongPressComment,
  pinnedComment = null,
  canModeratePin = false,
  onUnpinPress,
  onPinnedPress,
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
        onAvatarPress={onAvatarPress}
        onLongPress={onLongPressComment}
      />
    ),
    [latestId, vipLevelStyles, visible.length, onAvatarPress, onLongPressComment],
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

  const pinnedSyntheticItem = useMemo(() => {
    if (!(pinnedComment && (pinnedComment.message || pinnedComment.messageId))) return null;
    const uid = normalizePinnedUserId(pinnedComment.userId);
    const avatar =
      pinnedComment.avatar ||
      pinnedComment.profileImage ||
      pinnedComment.avatarUrl ||
      "";
    const vipLevelPin = Number(pinnedComment.vipLevel) || 0;
    const levelPin = Number(pinnedComment.level) || 0;
    const user = {
      ...(uid ? { _id: uid, id: uid } : {}),
      username: pinnedComment.username || "",
      profileImage: avatar,
      avatar,
      vipLevel: vipLevelPin,
      level: levelPin,
      activeBadge:
        pinnedComment.activeBadge != null
          ? pinnedComment.activeBadge
          : pinnedComment.active_badge ?? null,
    };
    const mid =
      pinnedComment.messageId ||
      pinnedComment.clientMessageId ||
      "";
    return {
      user,
      message: pinnedComment.message || "",
      clientMessageId: mid,
      id: mid,
      _id: mid,
    };
  }, [pinnedComment]);

  const hasPinned = !!(pinnedComment && (pinnedComment.message || pinnedComment.messageId));
  if (visible.length === 0 && !hasPinned) return null;

  return (
    <View
      style={inline
        ? [styles.inlineContainer, bottomPadding > 0 && { paddingBottom: bottomPadding }]
        : [styles.container, { bottom: bottomOffset, top: topOffset }]
      }
      pointerEvents="box-none"
    >
      {hasPinned && pinnedSyntheticItem ? (
        <View style={styles.pinnedRowShell}>
          <View style={styles.pinnedIconWrap}>
            <Ionicons name="pin" size={fs(13)} color="#FFD580" />
          </View>
          <View style={styles.pinnedCommentRowWrap} pointerEvents="box-none">
            <CommentRow
              item={pinnedSyntheticItem}
              isNew={false}
              vipLevelStyles={vipLevelStyles}
              onAvatarPress={onAvatarPress}
              onLongPress={onLongPressComment}
              rowStyle={styles.pinnedCommentRow}
              onPressBubble={
                normalizePinnedUserId(pinnedComment?.userId) && onPinnedPress
                  ? () => onPinnedPress(pinnedComment)
                  : undefined
              }
            />
          </View>
          {canModeratePin ? (
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => onUnpinPress?.()}
              style={[styles.pinnedCloseBtn, styles.pinnedCloseBtnPinnedRow]}
              accessibilityRole="button"
              accessibilityLabel="إلغاء التثبيت"
            >
              <Ionicons name="close" size={fs(14)} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

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
        removeClippedSubviews={!inline}
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
  pinnedRowShell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ms(6),
    backgroundColor: "rgba(124,93,250,0.92)",
    borderRadius: ms(12),
    paddingHorizontal: ms(10),
    paddingVertical: ms(7),
    marginBottom: ms(6),
    marginHorizontal: ms(2),
    borderWidth: 1,
    borderColor: "rgba(255,213,128,0.55)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: "visible",
    maxWidth: "100%",
  },
  pinnedCommentRowWrap: {
    flex: 1,
    minWidth: 0,
    overflow: "visible",
  },
  pinnedCommentRow: {
    marginBottom: 0,
    alignSelf: "stretch",
  },
  pinnedIconWrap: {
    width: ms(22),
    height: ms(22),
    marginTop: ms(10),
    borderRadius: ms(11),
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pinnedCloseBtn: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  pinnedCloseBtnPinnedRow: {
    marginTop: ms(10),
    alignSelf: "flex-start",
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
    alignItems: "center",
    marginBottom: ms(5),
    alignSelf: "flex-start",
    maxWidth: "100%",
    overflow: "visible",
  },
  avatarWrap: {
    marginRight: ms(7),
    flexShrink: 0,
    overflow: "visible",
  },
  rightCol: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: "column",
    overflow: "visible",
  },
  rightColPressed: {
    opacity: 0.9,
  },
  avatar: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: "#ddd",
    borderWidth: 1.5,
    borderColor: "rgba(140,100,255,0.7)",
    flexShrink: 0,
    overflow: "hidden",
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
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: ms(12),
    paddingVertical: ms(7),
    borderRadius: ms(16),
    maxWidth: width * 0.68,
    flexShrink: 1,
    overflow: "hidden",
  },
  /** Decorative PNG/Lottie borders extend outside the bubble rect — don’t clip them */
  bubbleWithFrameOverlay: {
    overflow: "visible",
  },
  bubbleFrameOuter: {
    position: "relative",
    alignSelf: "flex-start",
    overflow: "visible",
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
    paddingHorizontal: ms(6),
    paddingVertical: ms(1),
    borderRadius: ms(5),
    borderWidth: 1,
    marginHorizontal: 0,
    backgroundColor: "transparent",
  },
  levelChipText: {
    fontSize: fs(10),
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
    paddingHorizontal: ms(3),
    paddingVertical: ms(1),
    borderRadius: ms(7),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  vipIcon: {
    width: ms(15),
    height: ms(15),
    borderRadius: ms(3),
    borderWidth: 1,
  },
  vipChipText: {
    color: "#FFF",
    fontSize: fs(11),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  inlineBubbleText: {
    color: "rgba(255,255,255,0.96)",
    fontSize: fs(13),
    lineHeight: fs(18),
    flexShrink: 1,
    flexWrap: "wrap",
  },
  inlineHeader: {
    flexDirection: "row",
    direction: "rtl",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: ms(3),
    marginBottom: ms(2),
    alignSelf: "flex-start",
    maxWidth: width * 0.72,
    zIndex: 20,
    elevation: 20,
    overflow: "visible",
  },


  inlineIconClip: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(5),
    overflow: "hidden",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIconCover: {
    width: "100%",
    height: "100%",
  },
  inlineVipIconClip: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(6),
    overflow: "hidden",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  vipIconCover: {
    width: "100%",
    height: "100%",
  },


  inlineUsername: {
    color: "rgba(200,190,255,0.95)",
    fontSize: fs(12),
    fontWeight: "700",
    flexShrink: 1,
    minWidth: 0,
    maxWidth: width * 0.36,
    marginRight: ms(4),
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  vipBadgeSmallClip: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(6),
    overflow: "hidden",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  vipBadgeSmallCover: {
    width: "100%",
    height: "100%",
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
    borderRadius: ms(6),
    overflow: "hidden",
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
});

export default FloatingComments;

