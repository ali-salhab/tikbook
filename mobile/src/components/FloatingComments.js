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

// ─── Single animated comment row ─────────────────────────────────────────
const CommentRow = React.memo(({ item, isNew }) => {
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
      <View style={styles.bubble}>
        {item.user?.username ? (
          <Text style={styles.username}>{item.user.username}</Text>
        ) : null}
        <Text style={[styles.message, isSystem && styles.systemMessage]}>
          {item.message}
        </Text>
      </View>
    </Animated.View>
  );
});

// ─── Container ────────────────────────────────────────────────────────────
const FloatingComments = ({ comments, bottomOffset = 90 }) => {
  const listRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const userScrolledRef = useRef(false);

  // Show last MAX_COMMENTS only
  const visible = comments.slice(-MAX_COMMENTS);
  const latestId = visible.length > 0 ? visible[visible.length - 1].id : null;

  const renderItem = useCallback(
    ({ item }) => <CommentRow item={item} isNew={item.id === latestId} />,
    [latestId],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

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
    // box-none: container itself doesn't intercept taps, but children (FlatList) can scroll
    <View
      style={[styles.container, { bottom: bottomOffset }]}
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
        scrollEventThrottle={32}
        // Allow scroll but not regular taps to pass through
        pointerEvents="box-none"
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
    width: width * 0.68,
    maxHeight: 320,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 4,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 7,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    flexShrink: 0,
  },
  avatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
    backgroundColor: "rgba(120,80,200,0.6)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  bubble: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    maxWidth: "86%",
  },
  username: {
    color: "rgba(180,180,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 1,
  },
  message: {
    color: "#FFF",
    fontSize: 13,
    lineHeight: 17,
  },
  systemMessage: {
    color: "#FFD700",
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
});

export default FloatingComments;

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
      <View style={styles.bubble}>
        {item.user?.username ? (
          <Text style={styles.username}>{item.user.username}</Text>
        ) : null}
        <Text style={[styles.message, isSystem && styles.systemMessage]}>
          {item.message}
        </Text>
      </View>
    </Animated.View>
  );
});

// ─── Container ─────────────────────────────────────────────────────────────────────────────────
const FloatingComments = ({ comments }) => {
  const listRef = useRef(null);

  // Show last MAX_COMMENTS only
  const visible = comments.slice(-MAX_COMMENTS);
  const latestId = visible.length > 0 ? visible[visible.length - 1].id : null;

  const renderItem = useCallback(
    ({ item }) => <CommentRow item={item} isNew={item.id === latestId} />,
    [latestId],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  // Scroll to newest comment
  useEffect(() => {
    if (visible.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [visible.length]);

  return (
    <View style={styles.container} pointerEvents="none">
      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    left: 10,
    width: width * 0.66,
    maxHeight: 260,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    flexShrink: 0,
  },
  avatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
    backgroundColor: "rgba(120,80,200,0.6)",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  bubble: {
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    maxWidth: "86%",
  },
  username: {
    color: "rgba(180,180,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 1,
  },
  message: {
    color: "#FFF",
    fontSize: 13,
    lineHeight: 17,
  },
  systemMessage: {
    color: "#FFD700",
    fontSize: 12,
    fontStyle: "italic",
  },
});

export default FloatingComments;
