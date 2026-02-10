import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  PanResponder,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommentItem from "./CommentItem";
import CommentInput from "./CommentInput";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75; // 75% of screen

const CommentSheet = ({ visible, onClose, videoId, initialComments = [] }) => {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState(initialComments);
  const [replyingTo, setReplyingTo] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Animate sheet in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Pan responder for swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 5 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  // Total comments count (including replies)
  const totalCommentsCount = useMemo(() => {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.replies?.length || 0);
    }, 0);
  }, [comments]);

  // Handle like comment
  const handleLikeComment = useCallback(
    (commentId, isReply = false, parentId = null) => {
      setComments((prevComments) => {
        return prevComments.map((comment) => {
          if (isReply && comment.id === parentId) {
            // Like a reply
            return {
              ...comment,
              replies: comment.replies.map((reply) => {
                if (reply.id === commentId) {
                  return {
                    ...reply,
                    isLiked: !reply.isLiked,
                    likesCount: reply.isLiked
                      ? reply.likesCount - 1
                      : reply.likesCount + 1,
                  };
                }
                return reply;
              }),
            };
          } else if (comment.id === commentId) {
            // Like a comment
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likesCount: comment.isLiked
                ? comment.likesCount - 1
                : comment.likesCount + 1,
            };
          }
          return comment;
        });
      });
    },
    [],
  );

  // Handle toggle replies visibility
  const handleToggleReplies = useCallback((commentId) => {
    setComments((prevComments) => {
      return prevComments.map((comment) => {
        if (comment.id === commentId) {
          return {
            ...comment,
            showReplies: !comment.showReplies,
          };
        }
        return comment;
      });
    });
  }, []);

  // Handle add comment
  const handleAddComment = useCallback(
    (text) => {
      const newComment = {
        id: Date.now().toString(),
        user: {
          id: "current_user",
          username: "you",
          avatar: null,
          isVerified: false,
          isVip: false,
        },
        text,
        timestamp: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        replies: [],
        showReplies: false,
      };

      if (replyingTo) {
        // Add as reply
        setComments((prevComments) => {
          return prevComments.map((comment) => {
            if (comment.id === replyingTo.id) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment],
                showReplies: true, // Auto-expand to show new reply
              };
            }
            return comment;
          });
        });
        setReplyingTo(null);
      } else {
        // Add as new comment
        setComments((prevComments) => [newComment, ...prevComments]);
        // Scroll to top to show new comment
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
      }
    },
    [replyingTo],
  );

  // Handle reply to comment
  const handleReplyToComment = useCallback((comment) => {
    setReplyingTo(comment);
  }, []);

  // Render comment item
  const renderComment = useCallback(
    ({ item }) => {
      return (
        <CommentItem
          comment={item}
          onLike={(commentId) => handleLikeComment(commentId, false)}
          onReply={() => handleReplyToComment(item)}
          onToggleReplies={() => handleToggleReplies(item.id)}
          onLikeReply={(replyId) => handleLikeComment(replyId, true, item.id)}
        />
      );
    },
    [handleLikeComment, handleReplyToComment, handleToggleReplies],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom + keyboardHeight,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{totalCommentsCount} تعليق</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <FlatList
            ref={flatListRef}
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentsContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>لا توجد تعليقات</Text>
                <Text style={styles.emptySubtext}>كن أول من يعلق!</Text>
              </View>
            }
          />

          {/* Input */}
          <CommentInput
            onSend={handleAddComment}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  sheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#555",
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  closeButton: {
    padding: 4,
  },
  commentsContainer: {
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    marginTop: 4,
  },
});

export default CommentSheet;
