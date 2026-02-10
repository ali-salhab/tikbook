import React, { useRef, useState, useEffect, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from "react-native-agora";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL, AGORA_APP_ID } from "../config/api";
import axios from "axios";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";

const { width, height } = Dimensions.get("window");

export default function LiveScreen({ navigation, route }) {
  const { isBroadcaster, channelId } = route.params || {};
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const engineRef = useRef(null);

  const [joined, setJoined] = useState(false);
  // If audience, use passed channelId. If broadcaster, use own ID.
  const [channelName, setChannelName] = useState(
    isBroadcaster ? userInfo?._id || "test" : channelId || "test",
  );
  const [localUid, setLocalUid] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [liveTitle, setLiveTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: "hamode", text: "نورت", vip: true },
    { id: 2, user: "ليمار", text: "❤️", vip: false },
    { id: 3, user: "سيف", text: "سلام", vip: true },
  ]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);

  // ───────────────── ENGINE ─────────────────
  const initEngine = () => {
    if (engineRef.current) return engineRef.current;

    const engine = createAgoraRtcEngine();
    engine.initialize({
      appId: AGORA_APP_ID,
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });

    engine.enableVideo();
    engine.enableAudio();

    engine.registerEventHandler({
      onJoinChannelSuccess: (_, uid) => {
        setLocalUid(uid);
        setJoined(true);
      },
      onUserJoined: (_, uid) => {
        setRemoteUsers((p) => [...new Set([...p, uid])]);
        setViewerCount((v) => v + 1);
      },
      onUserOffline: (_, uid) => {
        setRemoteUsers((p) => p.filter((i) => i !== uid));
        setViewerCount((v) => Math.max(1, v - 1));
      },
    });

    engineRef.current = engine;
    return engine;
  };

  useEffect(() => {
    initEngine();
    return () => {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
    };
  }, []);

  // ───────────────── PERMISSIONS ─────────────────
  const requestPermissions = async () => {
    const cam = await Camera.requestCameraPermissionsAsync();
    const mic = await Audio.requestPermissionsAsync();
    return cam.status === "granted" && mic.status === "granted";
  };

  // ───────────────── JOIN ─────────────────
  const joinLive = async () => {
    if (isConnecting || joined) return;
    if (!userToken) {
      Alert.alert("Login required", "Please log in to start/join a live room.");
      return;
    }

    if (isBroadcaster && !liveTitle.trim()) {
      Alert.alert("Title required");
      return;
    }

    if (isBroadcaster && !(await requestPermissions())) return;

    try {
      setIsConnecting(true);
      setErrorMessage("");

      const res = await axios.post(
        `${BASE_URL}/live/token`,
        {
          channelName,
          role: isBroadcaster ? "publisher" : "subscriber",
          title: liveTitle,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      const finalChannel = res.data.channelName || channelName;
      setChannelName(finalChannel);

      const engine = initEngine();
      engine.setClientRole(
        isBroadcaster
          ? ClientRoleType.ClientRoleBroadcaster
          : ClientRoleType.ClientRoleAudience,
      );

      if (isBroadcaster) engine.startPreview();

      engine.joinChannel(res.data.token, finalChannel, 0);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        "Failed to join live";
      setErrorMessage(msg);
      Alert.alert("Live error", msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const leaveLive = async () => {
    engineRef.current?.leaveChannel();
    navigation.goBack();
  };

  // ───────────────── UI DATA ─────────────────
  const topViewers = [
    {
      id: 1,
      avatar: userInfo?.profileImage || "https://i.pravatar.cc/100?img=11",
      level: "TOP59",
      badge: "👑",
    },
    {
      id: 2,
      avatar: "https://i.pravatar.cc/100?img=12",
      level: "الأسبوعي",
      badge: "⭐",
    },
    {
      id: 3,
      avatar: "https://i.pravatar.cc/100?img=13",
      level: "سجل",
      badge: "💎",
    },
    {
      id: 4,
      avatar: "https://i.pravatar.cc/100?img=14",
      level: "13M",
      badge: "💎",
    },
  ];

  const sendMessage = () => {
    if (messageText.trim()) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          user: userInfo?.username || "You",
          text: messageText,
          vip: false,
        },
      ]);
      setMessageText("");
    }
  };

  const gifts = [
    { id: 1, icon: "🌹", name: "Rose", price: 1 },
    { id: 2, icon: "💎", name: "Diamond", price: 5 },
    { id: 3, icon: "👑", name: "Crown", price: 10 },
    { id: 4, icon: "🚀", name: "Rocket", price: 20 },
    { id: 5, icon: "🎁", name: "Gift", price: 50 },
    { id: 6, icon: "💰", name: "Money", price: 100 },
  ];

  // ───────────────── PRE LIVE ─────────────────
  if (isBroadcaster && !joined) {
    return (
      <SafeAreaView style={styles.preLive}>
        <Text style={styles.preTitle}>Add title to go LIVE</Text>
        <TextInput
          placeholder="What are you doing?"
          placeholderTextColor="#aaa"
          style={styles.input}
          value={liveTitle}
          onChangeText={setLiveTitle}
        />
        {errorMessage ? (
          <Text style={styles.errorText} numberOfLines={3}>
            {errorMessage}
          </Text>
        ) : null}
        <TouchableOpacity
          style={[styles.goLive, isConnecting && styles.goLiveDisabled]}
          onPress={joinLive}
          disabled={isConnecting}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            {isConnecting ? "CONNECTING..." : "GO LIVE"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ───────────────── LIVE UI ─────────────────
  return (
    <View style={styles.container}>
      {/* Background */}
      <Image
        source={{ uri: "https://picsum.photos/900/1600" }}
        style={StyleSheet.absoluteFillObject}
        blurRadius={Platform.OS === "ios" ? 20 : 10}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "rgba(0,0,0,0.3)" },
        ]}
      />

      {/* Video */}
      {isBroadcaster ? (
        <RtcSurfaceView style={styles.video} canvas={{ uid: localUid || 0 }} />
      ) : remoteUsers[0] ? (
        <RtcSurfaceView style={styles.video} canvas={{ uid: remoteUsers[0] }} />
      ) : null}

      {/* UI Overlay */}
      <KeyboardAvoidingView
        style={styles.ui}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* TOP SECTION */}
        <View style={[styles.topSection, { paddingTop: insets.top + 10 }]}>
          {/* Left Side - Exit & Title */}
          <View style={styles.topLeft}>
            <TouchableOpacity style={styles.exitBtn} onPress={leaveLive}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.hostInfo}>
              <Image
                source={{
                  uri: userInfo?.profileImage || "https://i.pravatar.cc/100",
                }}
                style={styles.hostAvatar}
              />
              <View style={styles.hostDetails}>
                <Text style={styles.hostName}>
                  {userInfo?.username || "Host"}
                </Text>
                <Text style={styles.hostId}>
                  ID: {channelName.slice(0, 10)}
                </Text>
              </View>
              <TouchableOpacity style={styles.followBtn}>
                <Text style={styles.followBtnText}>متابعة</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Side - Top Viewers & Stats */}
          <View style={styles.topRight}>
            <View style={styles.viewerBadge}>
              <Ionicons name="eye" color="#fff" size={14} />
              <Text style={styles.viewerText}>{viewerCount}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.topViewersRow}
            >
              {topViewers.map((viewer) => (
                <View key={viewer.id} style={styles.viewerItem}>
                  <Image
                    source={{ uri: viewer.avatar }}
                    style={styles.viewerAvatar}
                  />
                  {viewer.badge === "👑" && (
                    <View style={styles.crownBadge}>
                      <Text>👑</Text>
                    </View>
                  )}
                  {viewer.badge === "⭐" && (
                    <View style={styles.starBadge}>
                      <Text>⭐</Text>
                    </View>
                  )}
                  {viewer.badge === "💎" && (
                    <View style={styles.diamondBadge}>
                      <Text>💎</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* MIDDLE SECTION - Chat Messages */}
        <View style={styles.middleSection}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.chatScroll}
          >
            {chatMessages.map((msg) => (
              <View
                key={msg.id}
                style={[styles.chatMessage, msg.vip && styles.chatMessageVip]}
              >
                <Text style={styles.chatUsername}>
                  {msg.vip && "VIP "}
                  {msg.user}:
                </Text>
                <Text style={styles.chatText}> {msg.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* BOTTOM SECTION */}
        <View
          style={[styles.bottomSection, { paddingBottom: insets.bottom + 10 }]}
        >
          {/* Side Actions */}
          <View style={styles.sideActions}>
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => setShowGiftModal(true)}
            >
              <View style={styles.giftIconWrap}>
                <Ionicons name="gift" size={28} color="#fff" />
              </View>
              <Text style={styles.sideBtnText}>هدية</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideBtn}>
              <View style={styles.iconWrap}>
                <Ionicons name="share-social" size={26} color="#fff" />
              </View>
              <Text style={styles.sideBtnText}>مشاركة</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideBtn}>
              <View style={styles.iconWrap}>
                <Ionicons name="menu" size={26} color="#fff" />
              </View>
              <Text style={styles.sideBtnText}>المزيد</Text>
            </TouchableOpacity>
          </View>

          {/* Chat Input */}
          <View style={styles.chatInputContainer}>
            {showChatInput ? (
              <View style={styles.chatInputBox}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="اكتب رسالة..."
                  placeholderTextColor="#999"
                  value={messageText}
                  onChangeText={setMessageText}
                  autoFocus
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowChatInput(false);
                    setMessageText("");
                  }}
                  style={styles.closeChatBtn}
                >
                  <Ionicons name="close" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.chatInputFake}
                onPress={() => setShowChatInput(true)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#ccc" />
                <Text style={styles.chatInputFakeText}>قل شيئاً...</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Gift Modal */}
      <Modal
        visible={showGiftModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGiftModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.giftModal}>
            <View style={styles.giftModalHeader}>
              <Text style={styles.giftModalTitle}>إرسال هدية</Text>
              <TouchableOpacity onPress={() => setShowGiftModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={gifts}
              numColumns={3}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.giftItem}
                  onPress={() => {
                    Alert.alert("Gift", `Sent ${item.name}!`);
                    setShowGiftModal(false);
                  }}
                >
                  <Text style={styles.giftIcon}>{item.icon}</Text>
                  <Text style={styles.giftName}>{item.name}</Text>
                  <Text style={styles.giftPrice}>💎 {item.price}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ───────────────── STYLES ─────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { width, height, position: "absolute" },
  ui: { flex: 1 },

  // TOP SECTION
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 12,
  },
  topLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  hostInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 8,
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  hostId: {
    color: "#ccc",
    fontSize: 10,
  },
  followBtn: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  followBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  topRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  viewerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  topViewersRow: {
    flexDirection: "row",
  },
  viewerItem: {
    alignItems: "center",
    marginLeft: 4,
    position: "relative",
  },
  viewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  crownBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FFD700",
    borderRadius: 10,
    padding: 2,
  },
  starBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FFA500",
    borderRadius: 10,
    padding: 2,
  },
  diamondBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#00D4FF",
    borderRadius: 10,
    padding: 2,
  },

  // MIDDLE SECTION - Chat
  middleSection: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  chatScroll: {
    maxHeight: height * 0.4,
  },
  chatMessage: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 6,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  chatMessageVip: {
    backgroundColor: "rgba(255,20,147,0.8)",
  },
  chatUsername: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  chatText: {
    color: "#fff",
    fontSize: 13,
  },

  // BOTTOM SECTION
  bottomSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    gap: 12,
  },
  sideActions: {
    gap: 16,
    alignItems: "center",
  },
  sideBtn: {
    alignItems: "center",
  },
  giftIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,20,147,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FE2C55",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sideBtnText: {
    color: "#fff",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  chatInputContainer: {
    flex: 1,
  },
  chatInputFake: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  chatInputFakeText: {
    color: "#ccc",
    fontSize: 14,
  },
  chatInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 25,
    paddingHorizontal: 12,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    backgroundColor: "#FE2C55",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  closeChatBtn: {
    padding: 4,
  },

  // Gift Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  giftModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.6,
  },
  giftModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  giftModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  giftItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    margin: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  giftIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  giftName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  giftPrice: {
    fontSize: 11,
    color: "#00D4FF",
    fontWeight: "700",
  },

  preLive: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    padding: 20,
  },
  preTitle: { color: "#fff", fontSize: 18, textAlign: "center" },
  input: {
    borderBottomWidth: 1,
    borderColor: "#555",
    color: "#fff",
    marginVertical: 20,
    fontSize: 18,
    textAlign: "center",
  },
  goLive: {
    backgroundColor: "#FE2C55",
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
  },
  goLiveDisabled: {
    opacity: 0.6,
  },
  errorBanner: {
    alignSelf: "center",
    backgroundColor: "rgba(254,44,85,0.15)",
    borderColor: "rgba(254,44,85,0.5)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 6,
  },
  errorText: {
    color: "#FE2C55",
    fontSize: 12,
    textAlign: "center",
  },
});
