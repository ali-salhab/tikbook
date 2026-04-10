import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import GradientBackground from "../components/GradientBackground";
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
  Image,
  ActivityIndicator,
  Modal,
  Share,
  Dimensions,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import io from "socket.io-client";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n";
import { BASE_URL } from "../config/api";
import GiftPanel from "../components/GiftPanel";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { ms, fs } from "../utils/responsive";
import { useApp } from "../context/AppContext";

// Enable RTL
// Enable RTL logic moved to index.js

const ChatScreen = ({ route, navigation }) => {
  const { userId, username, profileImage } = route?.params || {
    userId: null,
    username: null,
    profileImage: null,
  };
  const { userToken, userInfo } = useContext(AuthContext);
  const { theme } = useApp();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(60);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSaving, setImageSaving] = useState(false);
  const socket = useRef(null);
  const flatListRef = useRef(null);

  const EMOJI_PICKER_HEIGHT = 260;
  const insets = useSafeAreaInsets();
  const EMOJI_PICKER_BOTTOM = Math.max(insets.bottom || 0, 8);

  // Fetch wallet balance for gift panel
  const fetchBalance = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/wallet`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setUserBalance(res.data?.balance ?? 0);
    } catch (_) {}
  }, [userToken]);

  useEffect(() => {
    if (!userId) return;
    const fetchFollowStatus = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setIsFollowing(res.data?.followers?.includes(userInfo._id) ?? false);
      } catch (_) {}
    };
    fetchBalance();
    fetchFollowStatus();
  }, [userId]);

  // Re-fetch balance whenever the screen comes back into focus (e.g. after Wallet topup)
  useFocusEffect(
    useCallback(() => {
      if (userId) fetchBalance();
    }, [fetchBalance, userId]),
  );

  // GiftPanel passes a single object: { gift, quantity, totalCost }
  const handleSendGift = async ({ gift, quantity, totalCost }) => {
    setShowGiftPanel(false);
    try {
      await axios.post(
        `${BASE_URL}/wallet/gift`,
        {
          receiverId: userId,
          amount: totalCost ?? gift.price * quantity,
          giftName: gift.name,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      // Refresh balance
      await fetchBalance();
      // Send a gift message in chat
      const res2 = await axios.post(
        `${BASE_URL}/messages`,
        {
          receiverId: userId,
          text: `🎁 أرسلت هدية: ${gift.nameAr || gift.name}`,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      setMessages((prev) => [...prev, res2.data]);
      socket.current?.emit("sendMessage", res2.data);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        80,
      );
    } catch (e) {
      Alert.alert("خطأ", e?.response?.data?.message || "فشل إرسال الهدية");
    }
  };

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
    if (!text.trim() || isSending) return;
    if (!userId) {
      Alert.alert("خطأ", "لا يمكن إرسال رسالة بدون تحديد مستخدم.");
      return;
    }

    const msgText = text.trim();
    setText(""); // clear immediately to prevent double-tap resends
    setIsSending(true);

    try {
      const res = await axios.post(
        `${BASE_URL}/messages`,
        { receiverId: userId, text: msgText },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      setMessages((prev) => [...prev, res.data]);
      socket.current?.emit("sendMessage", res.data);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        80,
      );
    } catch (e) {
      console.log("Error sending message:", e);
      setText(msgText); // restore on failure
      alert(e.response?.data?.message || e.message || "فشل إرسال الرسالة");
    } finally {
      setIsSending(false);
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

  const handleToggleFollow = async () => {
    if (!userId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.put(
          `${BASE_URL}/users/${userId}/unfollow`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
        setIsFollowing(false);
      } else {
        await axios.put(
          `${BASE_URL}/users/${userId}/follow`,
          {},
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
        setIsFollowing(true);
      }
    } catch (e) {
      Alert.alert(
        "خطأ",
        e?.response?.data?.message || "فشل تغيير حالة المتابعة",
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("خطأ", "نحتاج إذن الوصول للصور");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        const tempId = `temp-img-${Date.now()}`;

        // Optimistic preview so the image appears immediately
        const tempMsg = {
          _id: tempId,
          sender: userInfo._id,
          receiver: userId,
          text: "",
          imageUrl: imageUri,
          read: false,
          createdAt: new Date().toISOString(),
          _pending: true,
        };
        setMessages((prev) => [...prev, tempMsg]);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          80,
        );

        setIsSending(true);
        try {
          const formData = new FormData();
          formData.append("receiverId", userId);
          formData.append("text", "");
          formData.append("image", {
            uri: imageUri,
            type: "image/jpeg",
            name: "photo.jpg",
          });

          const res = await axios.post(`${BASE_URL}/messages`, formData, {
            headers: {
              Authorization: `Bearer ${userToken}`,
              "Content-Type": "multipart/form-data",
            },
          });
          // Replace temp message with the saved one (has Cloudinary URL)
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId ? res.data : m)),
          );
          socket.current?.emit("sendMessage", res.data);
        } catch (e) {
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
          Alert.alert("خطأ", "فشل إرسال الصورة");
        } finally {
          setIsSending(false);
        }
      }
    } catch (e) {
      Alert.alert("خطأ", "فشل فتح الصورة");
    }
  };

  const handleCallPress = () => {
    Alert.alert("اتصال صوتي", `جاري الاتصال بـ ${username}`, [
      { text: "إلغاء", style: "cancel" },
    ]);
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
        80,
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

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const handleShareImage = async (imageUrl) => {
    try {
      await Share.share({ url: imageUrl, message: imageUrl });
    } catch (e) {
      Alert.alert("خطأ", "تعذّر مشاركة الصورة");
    }
  };

  const handleSaveImage = async (imageUrl) => {
    try {
      setImageSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("الإذن مرفوض", "يرجى السماح بالوصول إلى مكتبة الصور");
        return;
      }
      const filename = imageUrl.split("/").pop().split("?")[0] || "image.jpg";
      const localUri = FileSystem.cacheDirectory + filename;
      const download = await FileSystem.downloadAsync(imageUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Alert.alert("تم", "تم حفظ الصورة في المعرض ✓");
    } catch (e) {
      Alert.alert("خطأ", "تعذّر حفظ الصورة");
    } finally {
      setImageSaving(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.sender === userInfo._id;
    const timeLabel = formatMsgTime(item.createdAt);
    const isPureImageMsg =
      item.imageUrl && (!item.text || item.text === "🖼️ صورة");

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isOwn && (
          <View style={styles.messageAvatarWrap}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.messageAvatar}
              />
            ) : (
              <View
                style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}
              >
                <Ionicons name="person" size={12} color="#CCC" />
              </View>
            )}
          </View>
        )}
        <View style={styles.messageBubbleWrapper}>
          <View
            style={[
              item.imageUrl && isPureImageMsg
                ? styles.imageBubble
                : styles.messageBubble,
              item.imageUrl && isPureImageMsg
                ? null
                : isOwn
                  ? styles.myBubble
                  : styles.theirBubble,
            ]}
          >
            {item.imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedImage(item.imageUrl);
                  setImageViewerVisible(true);
                }}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : null}
            {!isPureImageMsg && item.text ? (
              <Text style={styles.messageText}>{item.text}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.msgMeta,
              isOwn ? styles.msgMetaRight : styles.msgMetaLeft,
            ]}
          >
            <Text style={styles.msgTime}>{timeLabel}</Text>
            {isOwn && !item._pending && (
              <Ionicons
                name={item.read ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.read ? "#4FC3F7" : "#AAA"}
                style={{ marginLeft: 2 }}
              />
            )}
            {isOwn && item._pending && (
              <ActivityIndicator
                size={10}
                color="#AAA"
                style={{ marginLeft: 2 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // If no userId, go back
  if (!userId) {
    navigation.goBack();
    return null;
  }

  // Chat view
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <GradientBackground />
      <View style={{ flex: 1 }}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-back" size={26} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatHeaderUser}
            onPress={() => navigation.navigate("UserProfile", { userId })}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={[styles.chatHeaderAvatar, { borderColor: theme.avatarRing }]}
              />
            ) : (
              <View style={styles.chatHeaderAvatarPlaceholder}>
                <Ionicons name="person" size={20} color="#CCC" />
              </View>
            )}
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderTitle}>{username}</Text>
              <Text style={styles.chatHeaderOnline}>نشط</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.chatHeaderActions}>
            <TouchableOpacity
              style={[styles.followChip, isFollowing && styles.followingChip]}
              onPress={handleToggleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.followChipText}>
                  {isFollowing ? "متابَع" : "متابعة"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleCallPress}
            >
              <Ionicons name="call-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
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
                  showEmojiPicker ? EMOJI_PICKER_HEIGHT : 0,
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
        <TouchableOpacity style={styles.emojiButton} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={24} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.emojiButton}
          onPress={() => {
            Keyboard.dismiss();
            setShowEmojiPicker(false);
            setShowGiftPanel(true);
          }}
        >
          <Ionicons name="gift-outline" size={24} color="#FE2C55" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="اكتب رسالة..."
          placeholderTextColor="#888"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          onFocus={() => {
            setShowEmojiPicker(false);
            setShowGiftPanel(false);
            setTimeout(
              () => flatListRef.current?.scrollToEnd({ animated: true }),
              50,
            );
          }}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size={22} color="#FE2C55" />
          ) : (
            <Ionicons
              name="send"
              size={24}
              color={text.trim() ? "#FE2C55" : "#888"}
            />
          )}
        </TouchableOpacity>
      </View>
      {/* Emoji Picker anchored above bottom (behaves like YouTube) */}
      {/* Gift Panel */}
      <GiftPanel
        visible={showGiftPanel}
        onClose={() => setShowGiftPanel(false)}
        onSendGift={handleSendGift}
        receiverId={userId}
        userBalance={userBalance}
        onRecharge={() => {
          setShowGiftPanel(false);
          navigation.navigate("Wallet");
        }}
      />

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

      {/* Full-screen Image Viewer */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerOverlay}>
          <StatusBar hidden />
          {/* Close */}
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setImageViewerVisible(false)}
          >
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>

          {/* Image */}
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}

          {/* Action buttons */}
          <View style={styles.imageViewerActions}>
            <TouchableOpacity
              style={styles.imageViewerBtn}
              onPress={() => handleShareImage(selectedImage)}
            >
              <Ionicons name="share-social-outline" size={26} color="#FFF" />
              <Text style={styles.imageViewerBtnText}>مشاركة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imageViewerBtn}
              onPress={() => handleSaveImage(selectedImage)}
              disabled={imageSaving}
            >
              {imageSaving ? (
                <ActivityIndicator size={26} color="#FFF" />
              ) : (
                <Ionicons name="download-outline" size={26} color="#FFF" />
              )}
              <Text style={styles.imageViewerBtnText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(16),
    paddingVertical: ms(16),
  },
  headerTitle: {
    color: "#FFF",
    fontSize: fs(20),
    fontWeight: "bold",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: ms(16),
    marginBottom: ms(8),
  },
  tab: {
    paddingVertical: ms(8),
    paddingHorizontal: ms(16),
    marginRight: ms(8),
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FFF",
  },
  tabText: {
    color: "#888",
    fontSize: fs(16),
  },
  activeTabText: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "600",
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
  },
  avatar: {
    marginRight: ms(12),
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: "#151228",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEmoji: {
    fontSize: fs(28),
  },
  conversationInfo: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2550",
    paddingBottom: ms(12),
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: ms(4),
  },
  conversationUsername: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "600",
  },
  conversationTime: {
    color: "#888",
    fontSize: fs(13),
  },
  conversationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    color: "#888",
    fontSize: fs(14),
    flex: 1,
    textAlign: "right",
  },
  unreadBadge: {
    backgroundColor: "#FE2C55",
    borderRadius: ms(10),
    paddingHorizontal: ms(6),
    paddingVertical: ms(2),
    minWidth: ms(20),
    alignItems: "center",
  },
  unreadText: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "bold",
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: "#2A2550",
    backgroundColor: "#0E0B1E",
  },
  headerBtn: {
    padding: ms(6),
  },
  chatHeaderUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
    flex: 1,
    marginHorizontal: ms(8),
  },
  chatHeaderInfo: {
    flexDirection: "column",
  },
  chatHeaderOnline: {
    color: "#4CAF50",
    fontSize: fs(11),
    marginTop: ms(1),
  },
  chatHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
  },
  followChip: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: ms(12),
    paddingVertical: ms(5),
    borderRadius: ms(14),
  },
  followingChip: {
    backgroundColor: "#151228",
    borderWidth: 1,
    borderColor: "#2A2550",
  },
  followChipText: {
    color: "#FFF",
    fontSize: fs(12),
    fontWeight: "700",
  },
  chatHeaderAvatar: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    borderWidth: 1.5,
  },
  chatHeaderAvatarPlaceholder: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: "#1A1630",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2A2550",
  },
  chatHeaderTitle: {
    color: "#FFF",
    fontSize: fs(15),
    fontWeight: "700",
  },
  messagesList: {
    padding: ms(12),
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: ms(10),
  },
  myMessage: {
    justifyContent: "flex-start",
    flexDirection: "row-reverse",
  },
  theirMessage: {
    justifyContent: "flex-start",
  },
  messageAvatarWrap: {
    marginRight: ms(6),
    marginBottom: ms(2),
  },
  messageAvatar: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
  },
  messageAvatarPlaceholder: {
    backgroundColor: "#1A1630",
    justifyContent: "center",
    alignItems: "center",
  },
  messageBubbleWrapper: {
    maxWidth: "72%",
    flexShrink: 1,
  },
  messageBubble: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderRadius: ms(18),
  },
  imageBubble: {
    padding: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderRadius: ms(14),
  },
  messageImage: {
    width: ms(200),
    height: ms(200),
    borderRadius: ms(14),
  },
  myBubble: {
    backgroundColor: "#FE2C55",
    borderBottomRightRadius: ms(4),
  },
  theirBubble: {
    backgroundColor: "#151228",
    borderBottomLeftRadius: ms(4),
  },
  messageText: {
    color: "#FFF",
    fontSize: fs(15),
    textAlign: "right",
  },
  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ms(3),
    gap: ms(3),
  },
  msgMetaRight: {
    justifyContent: "flex-end",
  },
  msgMetaLeft: {
    justifyContent: "flex-start",
  },
  msgTime: {
    color: "#888",
    fontSize: fs(11),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    paddingBottom: Platform.OS === "android" ? ms(16) : ms(12),
    borderTopWidth: 1,
    borderTopColor: "#2A2550",
    backgroundColor: "transparent",
  },

  // anchor input to bottom so 'bottom' style works
  inputContainerAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 30,
  },
  emojiButton: {
    marginRight: ms(8),
    padding: ms(4),
  },
  input: {
    flex: 1,
    backgroundColor: "#1A1630",
    borderRadius: ms(20),
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    paddingTop: ms(8),
    color: "#FFF",
    fontSize: fs(15),
    marginRight: ms(8),
    textAlign: "right",
    maxHeight: ms(100),
    minHeight: ms(36),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  emojiPickerContainer: {
    backgroundColor: "#151228",
    borderTopLeftRadius: ms(20),
    borderTopRightRadius: ms(20),
    maxHeight: "50%",
    paddingBottom: ms(20),
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
    padding: ms(16),
    borderBottomWidth: 1,
    borderBottomColor: "#2F2F2F",
  },
  emojiPickerTitle: {
    color: "#FFF",
    fontSize: fs(18),
    fontWeight: "bold",
  },
  emojiGrid: {
    padding: ms(10),
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
    padding: ms(8),
  },
  emojiText: {
    fontSize: fs(28),
  },
  // --- Image Viewer ---
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerClose: {
    position: "absolute",
    top: ms(50),
    right: ms(16),
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: ms(20),
    padding: ms(6),
  },
  imageViewerImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.7,
  },
  imageViewerActions: {
    position: "absolute",
    bottom: ms(50),
    flexDirection: "row",
    gap: ms(32),
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewerBtn: {
    alignItems: "center",
    gap: ms(4),
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: ms(16),
    paddingHorizontal: ms(24),
    paddingVertical: ms(12),
  },
  imageViewerBtnText: {
    color: "#FFF",
    fontSize: fs(13),
    fontWeight: "600",
  },
});

export default ChatScreen;
