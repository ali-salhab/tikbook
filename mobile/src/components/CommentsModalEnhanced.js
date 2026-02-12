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
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";

const CommentsModal = ({ visible, onClose, videoId, initialComments = [] }) => {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").height),
  ).current;
  const flatListRef = useRef(null);

  const quickReactions = ["😂", "😍", "🔥", "👍", "❤️", "😭", "🙏", "✨"];

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
      // Reset state when closing
      setReplyingTo(null);
      setSelectedImage(null);
      setCommentText("");
    }
  }, [visible]);

  const fetchComments = async () => {
    if (!videoId) return;

    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/videos/${videoId}/comments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      // Organize comments into threads (main comments + replies)
      const mainComments = res.data.filter((c) => !c.parentComment);
      const organized = mainComments.map((mainComment) => ({
        ...mainComment,
        replies: res.data.filter(
          (c) => c.parentComment?.toString() === mainComment._id.toString(),
        ),
      }));

      setComments(organized);
    } catch (error) {
      console.log("Error fetching comments:", error);
      setComments(initialComments);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("خطأ", "نحتاج إلى إذن للوصول إلى معرض الصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSendComment = async () => {
    if ((!commentText.trim() && !selectedImage) || !videoId || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("text", commentText.trim() || " ");

      if (replyingTo) {
        formData.append("parentComment", replyingTo._id);
      }

      if (selectedImage) {
        const filename = selectedImage.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append("image", {
          uri: selectedImage,
          name: filename,
          type,
        });
      }

      const res = await axios.post(
        `${BASE_URL}/videos/${videoId}/comment`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      // Refresh comments to show new comment with proper organization
      await fetchComments();

      // Reset input state
      setCommentText("");
      setSelectedImage(null);
      setReplyingTo(null);

      // Scroll to top to show new comment
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error) {
      console.log("Error posting comment:", error);
      Alert.alert("خطأ", "فشل إرسال التعليق. حاول مرة أخرى.");
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
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
          // Check replies
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map((reply) => {
                if (reply._id === commentId) {
                  const isLiked = reply.likes?.includes(userInfo._id);
                  return {
                    ...reply,
                    likes: isLiked
                      ? reply.likes.filter((id) => id !== userInfo._id)
                      : [...(reply.likes || []), userInfo._id],
                  };
                }
                return reply;
              }),
            };
          }
          return comment;
        }),
      );

      // Send request to backend
      await axios.put(
        `${BASE_URL}/videos/${videoId}/comments/${commentId}/like`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
    } catch (error) {
      console.log("Error liking comment:", error);
      // Revert on error
      fetchComments();
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert("حذف التعليق", "هل أنت متأكد من حذف هذا التعليق؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(
              `${BASE_URL}/videos/${videoId}/comments/${commentId}`,
              { headers: { Authorization: `Bearer ${userToken}` } },
            );
            fetchComments();
          } catch (error) {
            console.log("Error deleting comment:", error);
            Alert.alert("خطأ", "فشل حذف التعليق");
          }
        },
      },
    ]);
  };

  const handleReplyToComment = (comment) => {
    setReplyingTo(comment);
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
    return commentDate.toLocaleDateString("ar-EG");
  };

  const renderComment = ({ item, isReply = false }) => {
    const isLiked = item.likes?.includes(userInfo?._id);
    const likesCount = item.likes?.length || 0;
    const isOwner = item.user?._id === userInfo?._id;

    return (
      <View style={[styles.commentItem, isReply && styles.replyItem]}>
        {/* Avatar */}
        <View style={styles.commentAvatarContainer}>
          {item.user?.profileImage ? (
            <Image
              source={{ uri: item.user.profileImage }}
              style={styles.commentAvatar}
            />
          ) : (
            <View style={[styles.commentAvatar, styles.avatarFallback]}>
              <Ionicons name="person" size={16} color="#999" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>
              {item.user?.username || "مستخدم"}
            </Text>
            <Text style={styles.commentTime}>
              {" "}
              · {formatTime(item.createdAt)}
            </Text>
          </View>

          <Text style={styles.commentText}>{item.text}</Text>

          {/* Comment Image */}
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.commentImage} />
          )}

          {/* Actions */}
          <View style={styles.commentActions}>
            {!isReply && (
              <TouchableOpacity onPress={() => handleReplyToComment(item)}>
                <Text style={styles.replyButton}>رد</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => handleLikeComment(item._id)}>
              <View style={styles.likeButton}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={14}
                  color={isLiked ? "#FE2C55" : "#666"}
                />
                {likesCount > 0 && (
                  <Text
                    style={[styles.likeCount, isLiked && styles.likedCount]}
                  >
                    {likesCount}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity onPress={() => handleDeleteComment(item._id)}>
                <Ionicons name="trash-outline" size={14} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderCommentWithReplies = ({ item }) => (
    <View>
      {renderComment({ item, isReply: false })}
      {item.replies?.map((reply) => (
        <View key={reply._id}>
          {renderComment({ item: reply, isReply: true })}
        </View>
      ))}
    </View>
  );

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0,
  );

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
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{totalComments} تعليقات</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Comments List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FE2C55" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              renderItem={renderCommentWithReplies}
              keyExtractor={(item) => item._id}
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
              {/* Reply Banner */}
              {replyingTo && (
                <View style={styles.replyBanner}>
                  <Ionicons name="return-down-forward" size={16} color="#666" />
                  <Text style={styles.replyBannerText}>
                    الرد على @{replyingTo.user?.username}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Selected Image Preview */}
              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.imagePreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FE2C55" />
                  </TouchableOpacity>
                </View>
              )}

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
                  <TouchableOpacity
                    style={styles.inputIcon}
                    onPress={pickImage}
                  >
                    <Ionicons name="image-outline" size={22} color="#000" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={
                    replyingTo
                      ? `الرد على @${replyingTo.user?.username}`
                      : "أضف تعليق..."
                  }
                  placeholderTextColor="#999"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  textAlign="right"
                />

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (commentText.trim() || selectedImage) &&
                      styles.sendButtonActive,
                  ]}
                  onPress={handleSendComment}
                  disabled={(!commentText.trim() && !selectedImage) || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFF" />
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "75%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  commentsList: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  commentItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyItem: {
    paddingLeft: 56,
    backgroundColor: "#F8F8F8",
  },
  commentAvatarContainer: {
    marginLeft: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0E0E0",
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  commentTime: {
    fontSize: 12,
    color: "#999",
  },
  commentText: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    textAlign: "right",
  },
  commentImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 8,
    resizeMode: "cover",
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  replyButton: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    color: "#666",
  },
  likedCount: {
    color: "#FE2C55",
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E0E0E0",
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginBottom: 8,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    textAlign: "right",
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  quickReactionsContainer: {
    marginBottom: 8,
  },
  reactionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputLeftIcons: {
    flexDirection: "row",
    gap: 8,
  },
  inputIcon: {
    padding: 4,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    fontSize: 14,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: {
    backgroundColor: "#FE2C55",
  },
});

export default CommentsModal;
