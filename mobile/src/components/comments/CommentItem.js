import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ReplyItem from "./ReplyItem";

const CommentItem = ({
  comment,
  onLike,
  onReply,
  onToggleReplies,
  onLikeReply,
}) => {
  // Like animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    // Animate heart
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onLike(comment.id);
  };

  // Format time ago
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <View style={styles.container}>
      {/* Main Comment */}
      <View style={styles.commentRow}>
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer}>
          {comment.user.avatar ? (
            <Image
              source={{ uri: comment.user.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#999" />
            </View>
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Username & badges */}
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{comment.user.username}</Text>
            {comment.user.isVerified && (
              <MaterialIcons
                name="verified"
                size={14}
                color="#20D5EC"
                style={styles.badge}
              />
            )}
            {comment.user.isVip && (
              <View style={styles.vipBadge}>
                <MaterialIcons name="diamond" size={12} color="#FFD700" />
              </View>
            )}
          </View>

          {/* Comment text */}
          <Text style={styles.commentText}>{comment.text}</Text>

          {/* Actions row */}
          <View style={styles.actionsRow}>
            <Text style={styles.timeText}>{getTimeAgo(comment.timestamp)}</Text>

            {hasReplies && (
              <>
                <View style={styles.dot} />
                <Text style={styles.replyCountText}>
                  {comment.replies.length}{" "}
                  {comment.replies.length === 1 ? "رد" : "ردود"}
                </Text>
              </>
            )}

            <View style={styles.dot} />

            <TouchableOpacity onPress={onReply} style={styles.replyButton}>
              <Text style={styles.replyText}>رد</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Like button */}
        <View style={styles.likeContainer}>
          <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              {comment.isLiked ? (
                <Ionicons name="heart" size={20} color="#FE2C55" />
              ) : (
                <Ionicons name="heart-outline" size={20} color="#999" />
              )}
            </Animated.View>
          </TouchableOpacity>
          {comment.likesCount > 0 && (
            <Text
              style={[
                styles.likeCount,
                comment.isLiked && styles.likeCountActive,
              ]}
            >
              {comment.likesCount}
            </Text>
          )}
        </View>
      </View>

      {/* View/Hide replies button */}
      {hasReplies && (
        <TouchableOpacity
          style={styles.toggleRepliesButton}
          onPress={onToggleReplies}
        >
          <View style={styles.replyLine} />
          <Text style={styles.toggleRepliesText}>
            {comment.showReplies
              ? "إخفاء الردود"
              : `عرض ${comment.replies.length} ${comment.replies.length === 1 ? "رد" : "ردود"}`}
          </Text>
          <Ionicons
            name={comment.showReplies ? "chevron-up" : "chevron-down"}
            size={14}
            color="#999"
            style={styles.toggleIcon}
          />
        </TouchableOpacity>
      )}

      {/* Replies */}
      {hasReplies && comment.showReplies && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              onLike={() => onLikeReply(reply.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2a2a2a",
  },
  commentRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  badge: {
    marginLeft: 4,
  },
  vipBadge: {
    marginLeft: 4,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commentText: {
    color: "#FFF",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#999",
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#666",
    marginHorizontal: 8,
  },
  replyCountText: {
    color: "#999",
    fontSize: 12,
  },
  replyButton: {
    paddingVertical: 2,
  },
  replyText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "600",
  },
  likeContainer: {
    alignItems: "center",
    marginLeft: 12,
  },
  likeButton: {
    padding: 4,
  },
  likeCount: {
    color: "#999",
    fontSize: 11,
    marginTop: 2,
  },
  likeCountActive: {
    color: "#FE2C55",
    fontWeight: "600",
  },
  toggleRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 68,
    paddingRight: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  replyLine: {
    width: 20,
    height: 1,
    backgroundColor: "#444",
    marginRight: 8,
  },
  toggleRepliesText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
  },
  toggleIcon: {
    marginLeft: 4,
  },
  repliesContainer: {
    marginTop: 4,
  },
});

export default CommentItem;
