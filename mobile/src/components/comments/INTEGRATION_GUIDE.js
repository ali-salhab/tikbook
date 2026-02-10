/**
 * TikTok-Style Comments System - Integration Guide
 *
 * This example shows how to integrate the CommentSheet into your app.
 * The system includes:
 * - CommentSheet: Main bottom sheet modal
 * - CommentItem: Individual comment component
 * - ReplyItem: Individual reply component
 * - CommentInput: Input bar with emoji picker
 *
 * Features:
 * ✅ Bottom sheet modal (60-85% height)
 * ✅ Swipe down to close
 * ✅ Comments count display
 * ✅ Like/unlike with animation
 * ✅ Nested replies with expand/collapse
 * ✅ Reply to comments
 * ✅ Emoji picker
 * ✅ Keyboard handling
 * ✅ RTL support
 * ✅ Optimistic UI updates
 * ✅ FlatList optimized
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CommentSheet from "./comments/CommentSheet";
import { mockComments } from "./comments/mockComments";

const ExampleUsage = () => {
  const [commentsVisible, setCommentsVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Your video or content here */}

      {/* Comment button (like in HomeScreen) */}
      <TouchableOpacity
        style={styles.commentButton}
        onPress={() => setCommentsVisible(true)}
      >
        <Ionicons name="chatbubble-ellipses-sharp" size={35} color="#FFF" />
        <Text style={styles.commentCount}>1.2K</Text>
      </TouchableOpacity>

      {/* Comments Sheet */}
      <CommentSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        videoId="video_123" // Pass your video ID
        initialComments={mockComments} // Replace with real data from API
      />
    </View>
  );
};

/**
 * Integration with Backend API
 *
 * Replace mockComments with real API calls:
 *
 * const [comments, setComments] = useState([]);
 *
 * useEffect(() => {
 *   fetchComments();
 * }, [videoId]);
 *
 * const fetchComments = async () => {
 *   try {
 *     const res = await axios.get(`${BASE_URL}/videos/${videoId}/comments`, {
 *       headers: { Authorization: `Bearer ${userToken}` }
 *     });
 *     setComments(res.data);
 *   } catch (error) {
 *     console.error('Error fetching comments:', error);
 *   }
 * };
 *
 * Then pass comments to CommentSheet:
 * <CommentSheet
 *   visible={commentsVisible}
 *   onClose={() => setCommentsVisible(false)}
 *   videoId={videoId}
 *   initialComments={comments}
 * />
 */

/**
 * Backend API Requirements
 *
 * You'll need these endpoints:
 *
 * 1. GET /api/videos/:id/comments
 *    - Returns array of comments with replies
 *    - Response format matches the data structure in mockComments.js
 *
 * 2. POST /api/videos/:id/comments
 *    - Body: { text: string, parentId?: string }
 *    - parentId is optional (for replies)
 *
 * 3. PUT /api/comments/:id/like
 *    - Toggles like on comment or reply
 *
 * Comment data structure:
 * {
 *   id: string,
 *   user: {
 *     id: string,
 *     username: string,
 *     avatar: string | null,
 *     isVerified: boolean,
 *     isVip: boolean
 *   },
 *   text: string,
 *   timestamp: string (ISO date),
 *   likesCount: number,
 *   isLiked: boolean,
 *   replies: Comment[],
 *   showReplies: boolean (client-side state)
 * }
 */

/**
 * Real-time Updates (Optional)
 *
 * For live comment updates, integrate Socket.IO:
 *
 * useEffect(() => {
 *   if (!socket) return;
 *
 *   socket.on('new_comment', (comment) => {
 *     if (comment.videoId === videoId) {
 *       setComments(prev => [comment, ...prev]);
 *     }
 *   });
 *
 *   socket.on('comment_liked', ({ commentId, likesCount }) => {
 *     setComments(prev => prev.map(c =>
 *       c.id === commentId ? { ...c, likesCount } : c
 *     ));
 *   });
 *
 *   return () => {
 *     socket.off('new_comment');
 *     socket.off('comment_liked');
 *   };
 * }, [videoId]);
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  commentButton: {
    alignItems: "center",
    marginBottom: 15,
  },
  commentCount: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "600",
  },
});

export default ExampleUsage;
