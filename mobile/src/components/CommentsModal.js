import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";

const CommentsModal = ({ visible, onClose, videoId, initialComments = [] }) => {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").height)
  ).current;

  const quickReactions = ["😂", "😍", "😳", "😂", "😁", "🥰", "😘", "😅"];

  useEffect(() => {
    if (visible) {
      fetchComments();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchComments = async () => {
    if (!videoId) return;

    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/videos/${videoId}/comments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setComments(res.data);
    } catch (error) {
      console.log("Error fetching comments:", error);
      // Use initial comments as fallback
      setComments(initialComments);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !videoId || sending) return;

    setSending(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/videos/${videoId}/comment`,
        { text: commentText.trim() },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      // Add the new comment to the list
      const newComment = {
        _id: Date.now().toString(),
        text: commentText.trim(),
        user: {
          _id: userInfo._id,
          username: userInfo.username,
        },
        createdAt: new Date(),
        likes: [],
      };

      setComments([newComment, ...comments]);
      setCommentText("");
    } catch (error) {
      console.log("Error posting comment:", error);
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    // Toggle like locally for immediate feedback
    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment._id === commentId) {
          const isLiked = comment.likes?.includes(userInfo._id);
          return {
            ...comment,
            likes: isLiked
              ? comment.likes.filter((id) => id !== userInfo._id)
              : [...(comment.likes || []), userInfo._id],
          };
        }
        return comment;
      })
    );

    // TODO: Add API call to like comment on backend
  };

  const formatTime = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);

    if (diffInSeconds < 60) return "الآن";
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} د`;
    if (diffInSeconds < 86400)
      return `منذ ${Math.floor(diffInSeconds / 3600)} س`;
    if (diffInSeconds < 604800)
      return `منذ ${Math.floor(diffInSeconds / 86400)} ي`;
    return `منذ ${Math.floor(diffInSeconds / 604800)} أ`;
  };

  const renderComment = ({ item }) => {
    const isLiked = item.likes?.includes(userInfo?._id);
    const likesCount = item.likes?.length || 0;

    return (
      <View style={styles.commentItem}>
        {/* Left: Actions (Like/Dislike) */}
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLikeComment(item._id)}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? "#FE2C55" : "#888"}
            />
            {likesCount > 0 && (
              <Text style={styles.actionCount}>{likesCount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="thumbs-down-outline" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Middle: Content */}
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>
              {item.user?.username || "مستخدم"}
            </Text>
            <Text style={styles.badgeText}> · الأصدقاء</Text>
          </View>

          <Text style={styles.commentText}>{item.text}</Text>

          <View style={styles.commentFooter}>
            <Text style={styles.footerText}>رد</Text>
            <Text style={styles.footerText}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>

        {/* Right: Avatar */}
        <View style={styles.commentAvatarContainer}>
          <View style={styles.commentAvatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Comments Sheet */}
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="options-outline" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.headerTitle}>{comments.length} تعليقات</Text>

            <View style={styles.headerRight} />
          </View>

          {/* Comments List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FE2C55" />
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item, index) => item._id || index.toString()}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>لا توجد تعليقات بعد</Text>
                  <Text style={styles.emptySubtext}>كن أول من يعلق!</Text>
                </View>
              }
            />
          )}

          {/* Input Section */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View
              style={[
                styles.footerContainer,
                { paddingBottom: Math.max(insets.bottom, 10) },
              ]}
            >
              {/* Quick Reactions */}
              <View style={styles.quickReactionsContainer}>
                <FlatList
                  horizontal
                  data={quickReactions}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.reactionButton}
                      onPress={() => setCommentText((prev) => prev + item)}
                    >
                      <Text style={styles.reactionEmoji}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item, index) => index.toString()}
                />
              </View>

              {/* Input Row */}
              <View style={styles.inputRow}>
                <View style={styles.inputLeftIcons}>
                  <TouchableOpacity style={styles.inputIcon}>
                    <Ionicons name="at" size={24} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputIcon}>
                    <Ionicons name="happy-outline" size={24} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputIcon}>
                    <Ionicons name="image-outline" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="إضافة تعليق..."
                  placeholderTextColor="#999"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  textAlign="right"
                />

                <TouchableOpacity
                  style={styles.inputAvatarContainer}
                  onPress={commentText.trim() ? handleSendComment : null}
                >
                  {commentText.trim() ? (
                    <Ionicons
                      name="arrow-up-circle"
                      size={32}
                      color="#FE2C55"
                    />
                  ) : (
                    <View style={styles.inputAvatar}>
                      <Text style={styles.inputAvatarEmoji}>👤</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: "70%",
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  headerRight: {
    width: 60,
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  commentsList: {
    paddingVertical: 10,
  },
  commentItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-start",
  },
  leftActions: {
    width: 40,
    alignItems: "center",
    paddingTop: 4,
    gap: 15,
  },
  actionButton: {
    alignItems: "center",
    gap: 2,
  },
  actionCount: {
    fontSize: 12,
    color: "#666",
  },
  commentContent: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: "flex-end",
  },
  commentHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textAlign: "right",
  },
  badgeText: {
    fontSize: 13,
    color: "#999",
  },
  commentText: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    marginBottom: 6,
    textAlign: "right",
  },
  commentFooter: {
    flexDirection: "row",
    gap: 15,
    justifyContent: "flex-end",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
  commentAvatarContainer: {
    width: 40,
    alignItems: "center",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 18,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 10,
  },
  footerContainer: {
    borderTopWidth: 0.5,
    borderTopColor: "#eee",
    backgroundColor: "#FFF",
  },
  quickReactionsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  reactionButton: {
    paddingHorizontal: 12,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  inputLeftIcons: {
    flexDirection: "row",
    gap: 15,
  },
  inputIcon: {
    padding: 2,
  },
  input: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#000",
    fontSize: 14,
    maxHeight: 100,
    textAlign: "right",
  },
  inputAvatarContainer: {
    marginLeft: 5,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  inputAvatarEmoji: {
    fontSize: 16,
  },
});

export default CommentsModal;
