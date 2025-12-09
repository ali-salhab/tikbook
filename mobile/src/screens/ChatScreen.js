import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  I18nManager,
  Keyboard,
  Alert,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import io from "socket.io-client";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n";
import { BASE_URL } from "../config/api";

// Enable RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const ChatScreen = ({ route, navigation }) => {
  const { userId, username } = route?.params || {
    userId: null,
    username: null,
  };
  const { userToken, userInfo } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(60);
  const socket = useRef(null);
  const flatListRef = useRef(null);

  const EMOJI_PICKER_HEIGHT = 260;
  const insets = useSafeAreaInsets();
  const EMOJI_PICKER_BOTTOM = Math.max(insets.bottom || 0, 8);

  useEffect(() => {
    if (!userId) return;

    // Update socket URL to use BASE_URL
    const socketUrl = BASE_URL.replace("/api", "");
    socket.current = io(socketUrl);
    socket.current.emit("join", userInfo._id);

    socket.current.on("receiveMessage", (message) => {
      if (message.sender === userId || message.receiver === userId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/messages/${userId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setMessages(res.data);
      } catch (e) {
        console.log(e);
      }
    };

    fetchMessages();
  }, [userId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    if (!userId) {
      Alert.alert("خطأ", "لا يمكن إرسال رسالة بدون تحديد مستخدم.");
      return;
    }

    try {
      const res = await axios.post(
        `${BASE_URL}/messages`,
        { receiverId: userId, text: text.trim() },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setMessages((prev) => [...prev, res.data]);
      socket.current.emit("sendMessage", res.data);
      setText("");
      Keyboard.dismiss();
      // ensure list scrolls to show the new message
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        80
      );
    } catch (e) {
      console.log("Error sending message:", e);
      alert(e.response?.data?.message || e.message || "فشل إرسال الرسالة");
    }
  };

  const toggleEmojiPicker = () => {
    if (!showEmojiPicker) {
      Keyboard.dismiss();
      // small delay to allow keyboard to dismiss and keyboardHeight to update
      setTimeout(() => setShowEmojiPicker(true), 120);
    } else {
      setShowEmojiPicker(false);
    }
  };

  const addEmoji = (emoji) => {
    setText((t) => t + emoji);
  };

  // Keyboard listeners: keep track of keyboard height so input stays visible
  useEffect(() => {
    const showEvent =
      Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
    const hideEvent =
      Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";

    const onShow = (e) => {
      setIsKeyboardVisible(true);
      const h = e.endCoordinates ? e.endCoordinates.height : 260;
      setKeyboardHeight(h);
      setShowEmojiPicker(false);
      // scroll messages up when keyboard appears
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        80
      );
    };

    const onHide = () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === userInfo._id ? styles.myMessage : styles.theirMessage,
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  // If no userId, show inbox list
  if (!userId) {
    const dummyConversations = [
      {
        id: "1",
        username: "أحمد_الفنان",
        lastMessage: "مرحباً! كيف حالك؟ 👋",
        time: "ساعتين",
        unread: 2,
        avatar: "🎨",
      },
      {
        id: "2",
        username: "سارة_المسافرة",
        lastMessage: "شاهد فيديوي الجديد! 🎬",
        time: "5 ساعات",
        unread: 0,
        avatar: "✈️",
      },
      {
        id: "3",
        username: "محمد_الرياضي",
        lastMessage: "شكراً على المتابعة! 🙏",
        time: "يوم واحد",
        unread: 1,
        avatar: "⚽",
      },
      {
        id: "4",
        username: "نور_المصورة",
        lastMessage: "صورة رائعة! 📸",
        time: "يومين",
        unread: 0,
        avatar: "📷",
      },
      {
        id: "5",
        username: "خالد_المرح",
        lastMessage: "هههههه 😂",
        time: "3 أيام",
        unread: 0,
        avatar: "😄",
      },
      {
        id: "6",
        username: "ليلى_الطباخة",
        lastMessage: "جرب هذه الوصفة! 🍰",
        time: "أسبوع",
        unread: 0,
        avatar: "👩‍🍳",
      },
    ];

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{i18n.t("inbox")}</Text>
          <TouchableOpacity>
            <Ionicons name="create-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Text style={styles.activeTabText}>{i18n.t("all")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>{i18n.t("unread")}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={dummyConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => {
                // Navigate to chat with this user (using dummy data for now)
                navigation.setParams({
                  userId: item.id,
                  username: item.username,
                });
              }}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{item.avatar}</Text>
              </View>
              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationUsername}>
                    {item.username}
                  </Text>
                  <Text style={styles.conversationTime}>{item.time}</Text>
                </View>
                <View style={styles.conversationFooter}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // Chat view
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={{ flex: 1 }}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle}>{username}</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={[
            styles.messagesList,
            {
              paddingBottom:
                inputHeight +
                Math.max(
                  keyboardHeight,
                  showEmojiPicker ? EMOJI_PICKER_HEIGHT : 0
                ) +
                insets.bottom +
                20,
            },
          ]}
          inverted={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      </View>

      {/* Input container anchored to bottom. onLayout captures its height */}
      <View
        style={[
          styles.inputContainer,
          styles.inputContainerAbsolute,
          {
            bottom:
              keyboardHeight > 0
                ? keyboardHeight
                : showEmojiPicker
                ? EMOJI_PICKER_HEIGHT
                : insets.bottom,
            paddingBottom: insets.bottom ? insets.bottom + 8 : 12,
          },
        ]}
        onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity
          style={styles.emojiButton}
          onPress={toggleEmojiPicker}
        >
          <Ionicons name="happy-outline" size={24} color="#888" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={i18n.t("addComment")}
          placeholderTextColor="#888"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          onFocus={() => {
            setShowEmojiPicker(false);
            // ensure messages scroll to bottom when focusing input
            setTimeout(
              () => flatListRef.current?.scrollToEnd({ animated: true }),
              50
            );
          }}
        />
        <TouchableOpacity onPress={sendMessage} disabled={!text.trim()}>
          <Ionicons
            name="send"
            size={24}
            color={text.trim() ? "#FE2C55" : "#888"}
          />
        </TouchableOpacity>
      </View>
      {/* Emoji Picker anchored above bottom (behaves like YouTube) */}
      {showEmojiPicker && (
        <>
          <TouchableOpacity
            activeOpacity={1}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: EMOJI_PICKER_HEIGHT + EMOJI_PICKER_BOTTOM,
              zIndex: 15,
            }}
            onPress={() => setShowEmojiPicker(false)}
          />
          <View
            style={[
              styles.emojiPickerContainer,
              { height: EMOJI_PICKER_HEIGHT, bottom: EMOJI_PICKER_BOTTOM },
            ]}
          >
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>الرموز التعبيرية</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.emojiGrid}>
              <View style={styles.emojiRow}>
                {[
                  "😀",
                  "😂",
                  "😍",
                  "🥰",
                  "😘",
                  "😋",
                  "😜",
                  "🤓",
                  "😎",
                  "🤩",
                  "🥳",
                  "😏",
                  "😒",
                  "🙄",
                  "🤔",
                  "🤨",
                  "😐",
                  "😑",
                  "😶",
                  "🙄",
                  "😌",
                  "😔",
                  "😪",
                  "😴",
                  "🥵",
                  "🥶",
                  "😢",
                  "😭",
                  "😱",
                  "😨",
                  "😰",
                  "😡",
                  "❤️",
                  "🧡",
                  "💛",
                  "💚",
                  "💙",
                  "💜",
                  "🤎",
                  "💔",
                  "👍",
                  "👎",
                  "👏",
                  "🙌",
                  "🤲",
                  "🙏",
                  "✌️",
                  "🤞",
                  "👊",
                  "✊",
                  "🤛",
                  "🤜",
                  "🤚",
                  "👌",
                  "🤏",
                  "👈",
                  "🎉",
                  "🎊",
                  "🎁",
                  "🎈",
                  "🎂",
                  "🍰",
                  "🥳",
                  "⭐",
                  "🔥",
                  "⚡",
                  "✨",
                  "💫",
                  "💥",
                  "💨",
                  "💦",
                  "💧",
                ].map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiItem}
                    onPress={() => {
                      addEmoji(emoji);
                    }}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FFF",
  },
  tabText: {
    color: "#888",
    fontSize: 16,
  },
  activeTabText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    marginRight: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1F1F1F",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  conversationInfo: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
    paddingBottom: 12,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  conversationUsername: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  conversationTime: {
    color: "#888",
    fontSize: 13,
  },
  conversationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    color: "#888",
    fontSize: 14,
    flex: 1,
    textAlign: "right",
  },
  unreadBadge: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  unreadText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  chatHeaderTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FE2C55",
  },
  theirMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#1F1F1F",
  },
  messageText: {
    color: "#FFF",
    fontSize: 15,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "android" ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: "#1F1F1F",
    backgroundColor: "#000",
  },

  // anchor input to bottom so 'bottom' style works
  inputContainerAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 30,
  },
  emojiButton: {
    marginRight: 8,
    padding: 4,
  },
  input: {
    flex: 1,
    backgroundColor: "#1F1F1F",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8,
    color: "#FFF",
    fontSize: 15,
    marginRight: 8,
    textAlign: "right",
    maxHeight: 100,
    minHeight: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  emojiPickerContainer: {
    backgroundColor: "#1F1F1F",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
    paddingBottom: 20,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  emojiPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2F2F2F",
  },
  emojiPickerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  emojiGrid: {
    padding: 10,
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  emojiItem: {
    width: "12.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  emojiText: {
    fontSize: 28,
  },
});

export default ChatScreen;
