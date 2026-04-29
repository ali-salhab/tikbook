/**
 * Demo Screen - TikTok-Style Comments
 *
 * This is a standalone demo screen you can add to test the comments system.
 *
 * To use:
 * 1. Add this file to mobile/src/screens/
 * 2. Import in your navigator
 * 3. Add route: <Stack.Screen name="CommentsDemo" component={CommentsDemoScreen} />
 * 4. Navigate to it: navigation.navigate('CommentsDemo')
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { ms, fs } from "../utils/responsive";
import { darkUi } from "../theme/brand";
import { LinearGradient } from "expo-linear-gradient";
import CommentSheet from "../components/comments/CommentSheet";
import { mockComments } from "../components/comments/mockComments";

const CommentsDemoScreen = ({ navigation }) => {
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [totalComments] = useState(mockComments.length);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Mock Video Background */}
      <ImageBackground
        source={{ uri: "https://picsum.photos/400/800" }}
        style={styles.background}
        blurRadius={3}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.gradient}
        />
      </ImageBackground>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments Demo</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Mock Video Content */}
      <View style={styles.videoContent}>
        {/* Right Actions (like TikTok) */}
        <View style={styles.actionsContainer}>
          {/* Profile */}
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profilePlaceholder}>
              <Ionicons name="person" size={24} color="#FFF" />
            </View>
            <View style={styles.followBadge}>
              <Ionicons name="add" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={35} color="#FFF" />
            <Text style={styles.actionText}>24.5K</Text>
          </TouchableOpacity>

          {/* Comment - Opens the sheet */}
          <TouchableOpacity
            style={[styles.actionButton, styles.activeAction]}
            onPress={() => setCommentsVisible(true)}
          >
            <Ionicons
              name="chatbubble-ellipses-sharp"
              size={35}
              color="#FF3366"
            />
            <Text style={[styles.actionText, styles.activeText]}>
              {totalComments}
            </Text>
          </TouchableOpacity>

          {/* Bookmark */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={35} color="#FFF" />
            <Text style={styles.actionText}>1.2K</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="arrow-redo-sharp" size={35} color="#FFF" />
            <Text style={styles.actionText}>856</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <Text style={styles.username}>@demo_user</Text>
          <Text style={styles.description}>
            اضغط على أيقونة التعليقات لفتح نافذة التعليقات 👆
          </Text>
          <Text style={styles.description}>
            Tap the comment icon to open the TikTok-style comments sheet! 🎬
          </Text>
        </View>
      </View>

      {/* Call to Action */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => setCommentsVisible(true)}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
          <Text style={styles.ctaText}>فتح التعليقات - Open Comments</Text>
        </TouchableOpacity>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Swipe down to close</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Like/unlike comments</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Reply to comments</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Emoji picker</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>Expand/collapse replies</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>RTL support (Arabic)</Text>
          </View>
        </View>
      </View>

      {/* The Comments Sheet */}
      <CommentSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        videoId="demo_video_123"
        initialComments={mockComments}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkUi.canvas,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: ms(50),
    paddingHorizontal: ms(16),
    paddingBottom: ms(16),
    zIndex: 10,
  },
  backButton: {
    padding: ms(4),
  },
  headerTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    color: "#FFF",
  },
  videoContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: ms(20),
  },
  actionsContainer: {
    position: "absolute",
    right: ms(12),
    bottom: ms(100),
    alignItems: "center",
  },
  profileButton: {
    marginBottom: ms(20),
    alignItems: "center",
  },
  profilePlaceholder: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(25),
    backgroundColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  followBadge: {
    position: "absolute",
    bottom: ms(-8),
    backgroundColor: "#FF3366",
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    alignItems: "center",
    marginBottom: ms(20),
  },
  activeAction: {},
  actionText: {
    color: "#FFF",
    fontSize: fs(12),
    marginTop: ms(4),
    fontWeight: "600",
  },
  activeText: {
    color: "#FF3366",
    fontWeight: "700",
  },
  bottomInfo: {
    paddingHorizontal: ms(16),
    paddingBottom: ms(20),
    width: "75%",
  },
  username: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "700",
    marginBottom: ms(8),
  },
  description: {
    color: "#FFF",
    fontSize: fs(14),
    lineHeight: ms(20),
    marginBottom: ms(4),
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    paddingVertical: ms(20),
    paddingHorizontal: ms(16),
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3366",
    paddingVertical: ms(14),
    paddingHorizontal: ms(24),
    borderRadius: ms(25),
    marginBottom: ms(16),
  },
  ctaText: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "700",
    marginLeft: ms(8),
  },
  featuresContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: ms(12),
    borderRadius: ms(12),
  },
  featuresTitle: {
    color: "#FFF",
    fontSize: fs(14),
    fontWeight: "700",
    marginBottom: ms(8),
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ms(6),
  },
  featureText: {
    color: "#CCC",
    fontSize: fs(12),
    marginLeft: ms(8),
  },
});

export default CommentsDemoScreen;
