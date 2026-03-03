import React, { useRef, useEffect, useCallback } from "react";
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
const MAX_COMMENTS = 20;

// ─── Single animated comment row ─────────────────────────────────────────
const CommentRow = React.memo(({ item, isNew }) => {
  const slideY = useRef(new Animated.Value(isNew ? 22 : 0)).current;
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;

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

  return (
    <Animated.View
      style={[styles.row, { opacity, transform: [{ translateY: slideY }] }]}
    >
      {item.user?.profileImage || item.user?.avatar ? (
        <Image
          source={{ uri: item.user.profileImage || item.user.avatar }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarFallback} />
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
    [latestId]
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
    backgroundColor: "rgba(255,255,255,0.15)",
    flexShrink: 0,
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
