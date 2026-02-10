import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const ReplyItem = ({ reply, onLike }) => {
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

    onLike();
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

  return (
    <View style={styles.container}>
      {/* Reply connector line */}
      <View style={styles.connectorLine} />

      {/* Reply row */}
      <View style={styles.replyRow}>
        {/* Avatar (smaller) */}
        <TouchableOpacity style={styles.avatarContainer}>
          {reply.user.avatar ? (
            <Image source={{ uri: reply.user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={16} color="#999" />
            </View>
          )}
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          {/* Username & badges */}
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{reply.user.username}</Text>
            {reply.user.isVerified && (
              <MaterialIcons
                name="verified"
                size={12}
                color="#20D5EC"
                style={styles.badge}
              />
            )}
            {reply.user.isVip && (
              <View style={styles.vipBadge}>
                <MaterialIcons name="diamond" size={10} color="#FFD700" />
              </View>
            )}
          </View>

          {/* Reply text */}
          <Text style={styles.replyText}>{reply.text}</Text>

          {/* Time */}
          <Text style={styles.timeText}>{getTimeAgo(reply.timestamp)}</Text>
        </View>

        {/* Like button */}
        <View style={styles.likeContainer}>
          <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              {reply.isLiked ? (
                <Ionicons name="heart" size={18} color="#FE2C55" />
              ) : (
                <Ionicons name="heart-outline" size={18} color="#999" />
              )}
            </Animated.View>
          </TouchableOpacity>
          {reply.likesCount > 0 && (
            <Text
              style={[
                styles.likeCount,
                reply.isLiked && styles.likeCountActive,
              ]}
            >
              {reply.likesCount}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingLeft: 68,
    paddingRight: 16,
  },
  connectorLine: {
    width: 20,
    height: 1,
    backgroundColor: "#444",
    position: "absolute",
    left: 48,
    top: 28,
  },
  replyRow: {
    flex: 1,
    flexDirection: "row",
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginBottom: 3,
  },
  username: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  badge: {
    marginLeft: 3,
  },
  vipBadge: {
    marginLeft: 3,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  replyText: {
    color: "#FFF",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  timeText: {
    color: "#999",
    fontSize: 11,
  },
  likeContainer: {
    alignItems: "center",
    marginLeft: 10,
  },
  likeButton: {
    padding: 4,
  },
  likeCount: {
    color: "#999",
    fontSize: 10,
    marginTop: 2,
  },
  likeCountActive: {
    color: "#FE2C55",
    fontWeight: "600",
  },
});

export default ReplyItem;
