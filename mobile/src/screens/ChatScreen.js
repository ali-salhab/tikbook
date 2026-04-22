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
  // Real presence: { isOnline, lastSeen } for the opened user.
  const [presence, setPresence] = useState({ isOnline: false, lastSeen: null });
  const [nowTick, setNowTick] = useState(Date.now()); // re-render "last seen" label every minute
  const socket = useRef(null);
  const flatListRef = useRef(null);

  // Reliable auto-scroll: scrolls to bottom regardless of animation/layout race.
  const scrollToBottom = useCallback((animated = true) => {
    // Three-staged scroll handles the two common RN layout races: the first
    // call fires before the new item has measured, so we re-scroll on the
    // next frame and once more after the layout flush.
    const run = () => {
      try {
        flatListRef.current?.scrollToEnd({ animated });
      } catch (_) {}
    };
    run();
    requestAnimationFrame(run);
    setTimeout(run, 120);
  }, []);

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
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setIsFollowing(res.data?.followers?.includes(userInfo._id) ?? false);
        // Seed initial presence from the profile payload so the header shows
        // the real status immediately — the socket will then keep it live.
        setPresence({
          isOnline: !!res.data?.isOnline,
          lastSeen: res.data?.lastSeen || null,
        });
      } catch (_) {}
    };
    fetchBalance();
    fetchUser();
  }, [userId]);

  // Tick every 60s so "last seen X minutes ago" stays fresh.
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Whenever the bottom overlay resizes (keyboard toggled, emoji picker opened,
  // or the input grew from a multiline draft) the FlatList padding changes but
  // content size does not — so we must re-scroll explicitly to keep the tail
  // visible instead of letting it get covered by the input bar.
  useEffect(() => {
    if (messages.length === 0) return;
    scrollToBottom(true);
  }, [keyboardHeight, showEmojiPicker, inputHeight, scrollToBottom, messages.length]);

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
      scrollToBottom(true);
    } catch (e) {
      Alert.alert("خطأ", e?.response?.data?.message || "فشل إرسال الهدية");
    }
  };

  useEffect(() => {
    if (!userId) return;

    const socketUrl = BASE_URL.replace("/api", "");
    socket.current = io(socketUrl);
    socket.current.emit("join", userInfo._id);

    // Ask the server for the opened user's current presence right away.
    socket.current.emit("presence:query", { userId });

    // Subscribe to presence broadcasts and only keep the ones for this user.
    const onPresence = ({ userId: uid, isOnline, lastSeen }) => {
      if (String(uid) === String(userId)) {
        setPresence({ isOnline: !!isOnline, lastSeen: lastSeen || null });
      }
    };
    socket.current.on("user:presence", onPresence);

    socket.current.on("receiveMessage", (message) => {
      if (message.sender === userId || message.receiver === userId) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom(true);
      }
    });

    return () => {
      try {
        socket.current?.off("user:presence", onPresence);
      } catch (_) {}
      socket.current.disconnect();
    };
  }, [userId, scrollToBottom]);

  useEffect(() => {
    if (!userId) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/messages/${userId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        setMessages(res.data);
        scrollToBottom(false);
      } catch (e) {
        console.log(e);
      }
    };

    fetchMessages();
  }, [userId, scrollToBottom]);

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
      scrollToBottom(true);
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
        scrollToBottom(true);

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
      scrollToBottom(true);
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
  }, [scrollToBottom]);

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // Human "last seen" label — e.g. "نشط الآن" / "آخر ظهور قبل 5 د" / "أمس".
  const formatLastSeen = (isOnline, lastSeenStr) => {
    if (isOnline) return "نشط الآن";
    if (!lastSeenStr) return "غير متصل";
    const last = new Date(lastSeenStr).getTime();
    if (!last || Number.isNaN(last)) return "غير متصل";
    const diffMs = Math.max(0, nowTick - last);
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "نشط قبل لحظات";
    if (mins < 60) return `آخر ظهور قبل ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `آخر ظهور قبل ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "آخر ظهور أمس";
    if (days < 7) return `آخر ظهور قبل ${days} أيام`;
    const d = new Date(lastSeenStr);
    return `آخر ظهور ${d.getDate()}/${d.getMonth() + 1}`;
  };

  // Arabic day-bucket label for date separators.
  const dayBucketLabel = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const today = new Date();
    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(d, today)) return "اليوم";
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (sameDay(d, y)) return "أمس";
    const diffDays = Math.floor(
      (today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diffDays < 7) {
      const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      return days[d.getDay()];
    }
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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

  const renderMessage = ({ item, index }) => {
    const isOwn = item.sender === userInfo._id;
    const timeLabel = formatMsgTime(item.createdAt);
    const isPureImageMsg =
      item.imageUrl && (!item.text || item.text === "🖼️ صورة");

    // Date separator: show whenever the bucket changes from the previous msg.
    const prev = index > 0 ? messages[index - 1] : null;
    const bucket = dayBucketLabel(item.createdAt);
    const prevBucket = prev ? dayBucketLabel(prev.createdAt) : null;
    const showDateSep = !prev || bucket !== prevBucket;

    // Group consecutive bubbles from the same sender (hide avatar on followups).
    const sameSenderAsPrev =
      prev && prev.sender === item.sender && !showDateSep;

    return (
      <>
        {showDateSep && bucket ? (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <Text style={styles.dateSeparatorText}>{bucket}</Text>
            <View style={styles.dateSeparatorLine} />
          </View>
        ) : null}
        <View
          style={[
            styles.messageContainer,
            isOwn ? styles.myMessage : styles.theirMessage,
            sameSenderAsPrev && { marginBottom: ms(3), marginTop: -ms(4) },
          ]}
        >
          {!isOwn && (
            <View style={styles.messageAvatarWrap}>
              {sameSenderAsPrev ? (
                <View style={styles.messageAvatar} />
              ) : profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.messageAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.messageAvatar,
                    styles.messageAvatarPlaceholder,
                  ]}
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
                <Text
                  style={[
                    styles.messageText,
                    isOwn ? styles.messageTextMine : styles.messageTextTheirs,
                  ]}
                >
                  {item.text}
                </Text>
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
      </>
    );
  };

  // If no userId, go back
  if (!userId) {
    navigation.goBack();
    return null;
  }

  // Chat view
  return (
    // Only apply the TOP safe-area inset. The bottom inset is handled manually
    // by the input container so it can sit flush against the keyboard when
    // visible, and above the home indicator when hidden — without double-
    // counting `insets.bottom` (which previously caused the input to float
    // above the keyboard and hide the last messages).
    <SafeAreaView style={styles.container} edges={["top"]}>
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
            activeOpacity={0.85}
          >
            <View style={styles.chatHeaderAvatarWrap}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={[
                    styles.chatHeaderAvatar,
                    { borderColor: theme.avatarRing },
                  ]}
                />
              ) : (
                <View style={styles.chatHeaderAvatarPlaceholder}>
                  <Ionicons name="person" size={20} color="#CCC" />
                </View>
              )}
              {/* Live presence dot — green=online, grey=offline. Bottom-right. */}
              <View
                style={[
                  styles.presenceDot,
                  presence.isOnline
                    ? styles.presenceDotOnline
                    : styles.presenceDotOffline,
                ]}
              />
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                {username}
              </Text>
              <Text
                style={[
                  styles.chatHeaderOnline,
                  !presence.isOnline && styles.chatHeaderOffline,
                ]}
                numberOfLines={1}
              >
                {formatLastSeen(presence.isOnline, presence.lastSeen)}
              </Text>
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
          keyExtractor={(item, idx) =>
            item._id ? String(item._id) : `m-${idx}`
          }
          contentContainerStyle={[
            styles.messagesList,
            {
              // Reserve enough room for the last message to sit above the
              // input bar in every state. IMPORTANT: on Android the manifest
              // default is `adjustResize`, so the OS already shrinks the
              // window when the keyboard opens — we must NOT add
              // `keyboardHeight` on top of that or items would be pushed off
              // screen. On iOS the keyboard overlays the window, so we do
              // need to reserve space for it manually.
              paddingBottom:
                inputHeight +
                (Platform.OS === "ios" && keyboardHeight > 0
                  ? keyboardHeight
                  : showEmojiPicker
                    ? EMOJI_PICKER_HEIGHT
                    : 0) +
                ms(16),
            },
          ]}
          inverted={false}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom(false)}
          onLayout={() => scrollToBottom(false)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      </View>

      {/* Input container anchored to bottom. onLayout captures its height.
          On Android the OS resizes the window when the keyboard opens
          (`adjustResize` — the Expo default), so `bottom: 0` keeps the input
          naturally flush above the keyboard. On iOS we must offset by the
          reported `keyboardHeight` because the keyboard overlays the view.
          When the custom emoji picker is open, we always offset by its
          fixed height on both platforms. */}
      <View
        style={[
          styles.inputContainer,
          styles.inputContainerAbsolute,
          {
            bottom:
              Platform.OS === "ios" && keyboardHeight > 0
                ? keyboardHeight
                : showEmojiPicker
                  ? EMOJI_PICKER_HEIGHT
                  : 0,
            paddingBottom:
              keyboardHeight > 0 || showEmojiPicker
                ? ms(10)
                : (insets.bottom || 0) + ms(10),
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
            scrollToBottom(true);
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
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(14,11,30,0.92)",
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
  chatHeaderAvatarWrap: {
    position: "relative",
    width: ms(40),
    height: ms(40),
  },
  chatHeaderInfo: {
    flexDirection: "column",
    flexShrink: 1,
  },
  chatHeaderOnline: {
    color: "#4CAF50",
    fontSize: fs(11),
    marginTop: ms(1),
    fontWeight: "600",
  },
  chatHeaderOffline: {
    color: "#9AA0B4",
    fontWeight: "500",
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
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
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
  presenceDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
    borderWidth: 2,
    borderColor: "#0E0B1E",
  },
  presenceDotOnline: {
    backgroundColor: "#4CAF50",
  },
  presenceDotOffline: {
    backgroundColor: "#6B6B80",
  },
  chatHeaderTitle: {
    color: "#FFF",
    fontSize: fs(15),
    fontWeight: "700",
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: ms(12),
    paddingHorizontal: ms(12),
    gap: ms(8),
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  dateSeparatorText: {
    color: "#9AA0B4",
    fontSize: fs(11),
    fontWeight: "600",
    paddingHorizontal: ms(10),
    paddingVertical: ms(3),
    borderRadius: ms(10),
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
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
    borderRadius: ms(20),
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  imageBubble: {
    padding: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderRadius: ms(16),
  },
  messageImage: {
    width: ms(220),
    height: ms(220),
    borderRadius: ms(16),
  },
  myBubble: {
    backgroundColor: "#FE2C55",
    borderBottomRightRadius: ms(6),
  },
  theirBubble: {
    backgroundColor: "#1C1838",
    borderBottomLeftRadius: ms(6),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  messageText: {
    fontSize: fs(15),
    textAlign: "right",
    lineHeight: fs(20),
  },
  messageTextMine: {
    color: "#FFF",
  },
  messageTextTheirs: {
    color: "#EDEAFF",
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
    paddingHorizontal: ms(12),
    paddingVertical: ms(10),
    paddingBottom: Platform.OS === "android" ? ms(14) : ms(10),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(14,11,30,0.92)",
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
