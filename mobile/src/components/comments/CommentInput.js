import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Popular emojis (like TikTok)
const EMOJIS = [
  "😂",
  "😍",
  "😊",
  "😭",
  "😎",
  "🔥",
  "❤️",
  "👍",
  "🙏",
  "💯",
  "✨",
  "🎉",
];

const CommentInput = ({ onSend, replyingTo, onCancelReply }) => {
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(true);
  const inputRef = useRef(null);
  const replyBannerHeight = useRef(new Animated.Value(0)).current;

  // Show/hide reply banner animation
  useEffect(() => {
    Animated.timing(replyBannerHeight, {
      toValue: replyingTo ? 40 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [replyingTo]);

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText.length > 0) {
      onSend(trimmedText);
      setText("");
      inputRef.current?.blur();
    }
  };

  const handleEmojiPress = (emoji) => {
    setText((prev) => prev + emoji);
  };

  const placeholder = replyingTo
    ? `الرد على @${replyingTo.user.username}`
    : "أضف تعليق...";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Reply banner */}
      {replyingTo && (
        <Animated.View
          style={[
            styles.replyBanner,
            { height: replyBannerHeight, overflow: "hidden" },
          ]}
        >
          <View style={styles.replyBannerContent}>
            <Ionicons name="return-down-forward" size={16} color="#999" />
            <Text style={styles.replyBannerText} numberOfLines={1}>
              الرد على{" "}
              <Text style={styles.replyUsername}>
                @{replyingTo.user.username}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={onCancelReply}
              style={styles.cancelReplyButton}
            >
              <Ionicons name="close" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Emoji row */}
      {showEmojis && (
        <View style={styles.emojiRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiScrollContent}
          >
            {EMOJIS.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleEmojiPress(emoji)}
                style={styles.emojiButton}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputContainer}>
        {/* Avatar placeholder */}
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={20} color="#999" />
        </View>

        {/* Text input */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#666"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
        </View>

        {/* Emoji toggle button */}
        <TouchableOpacity
          onPress={() => setShowEmojis(!showEmojis)}
          style={styles.emojiToggleButton}
        >
          <Ionicons
            name={showEmojis ? "chevron-down" : "happy-outline"}
            size={22}
            color="#999"
          />
        </TouchableOpacity>

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.sendButton,
            text.trim().length > 0 && styles.sendButtonActive,
          ]}
          disabled={text.trim().length === 0}
        >
          <Ionicons
            name="send"
            size={20}
            color={text.trim().length > 0 ? "#FE2C55" : "#666"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  replyBanner: {
    backgroundColor: "#252525",
    borderTopWidth: 0.5,
    borderTopColor: "#333",
  },
  replyBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  replyBannerText: {
    flex: 1,
    color: "#999",
    fontSize: 13,
    marginLeft: 8,
  },
  replyUsername: {
    color: "#FE2C55",
    fontWeight: "600",
  },
  cancelReplyButton: {
    padding: 4,
  },
  emojiRow: {
    backgroundColor: "#1a1a1a",
    borderTopWidth: 0.5,
    borderTopColor: "#333",
    paddingVertical: 8,
  },
  emojiScrollContent: {
    paddingHorizontal: 12,
  },
  emojiButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  emoji: {
    fontSize: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 0.5,
    borderTopColor: "#333",
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginBottom: 4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    color: "#FFF",
    fontSize: 14,
    minHeight: 36,
    maxHeight: 80,
    textAlignVertical: "center",
  },
  emojiToggleButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButtonActive: {
    // Active state styling handled by color change
  },
});

export default CommentInput;
