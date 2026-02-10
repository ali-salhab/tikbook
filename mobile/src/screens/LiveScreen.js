import React, { useRef, useState, useEffect, useContext } from "react";
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
  VideoSourceType,
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
  const [chatMessages, setChatMessages] = useState([]);
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

    engine.setVideoEncoderConfiguration({
      dimensions: { width: 1280, height: 720 },
      frameRate: 24,
      bitrate: 2000,
    });

    engine.registerEventHandler({
      onJoinChannelSuccess: (_, uid) => {
        console.log("✅ Joined Channel Success:", uid);
        setLocalUid(uid);
        setJoined(true);
      },
      onUserJoined: (_, uid) => {
        console.log("👤 User Joined:", uid);
        setRemoteUsers((p) => [...new Set([...p, uid])]);
        setViewerCount((v) => v + 1);
      },
      onUserOffline: (_, uid) => {
        console.log("❌ User Offline:", uid);
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

    if (isBroadcaster) {
      const permitted = await requestPermissions();
      if (!permitted) {
        Alert.alert(
          "Permission required",
          "Camera and Microphone access are needed to go live.",
        );
        return;
      }
    }

    try {
      setIsConnecting(true);
      setErrorMessage("");

      const engine = initEngine();

      if (isBroadcaster) {
        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.enableLocalVideo(true);

        engine.setupLocalVideo({
          sourceType: VideoSourceType.VideoSourceCameraPrimary,
          uid: 0,
          view: undefined,
          renderMode: 1,
          mirrorMode: 0,
        });

        const previewRet = engine.startPreview();
        console.log("Start Preview Result:", previewRet);
      } else {
        engine.setClientRole(ClientRoleType.ClientRoleAudience);
      }

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
      const token = res.data.token;

      const joinRet = engine.joinChannel(token, finalChannel, 0, {});
      console.log("Join Channel Result:", joinRet);
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
    try {
      engineRef.current?.leaveChannel();
      if (isBroadcaster) {
        engineRef.current?.stopPreview();
      }
    } catch (e) {
      console.warn("Leave Channel Error:", e);
    }
    navigation.goBack();
  };

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
      <View style={styles.preLiveContainer}>
        <Image
          source={{
            uri: userInfo?.profileImage || "https://picsum.photos/900/1600",
          }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={30}
        />
        <View style={styles.preLiveOverlay} />

        <SafeAreaView style={styles.preLiveContent}>
          <View style={styles.preLiveHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.flipBtn}>
              <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
              <Text style={styles.flipText}>قلب</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.preLiveInputs}>
            <Image
              source={{
                uri: userInfo?.profileImage || "https://i.pravatar.cc/150",
              }}
              style={styles.preLiveAvatar}
            />
            <Text style={styles.preLiveName}>{userInfo?.username}</Text>

            <TextInput
              placeholder="أضف عنواناً للبث المباشر..."
              placeholderTextColor="#ccc"
              style={styles.detailsInput}
              value={liveTitle}
              onChangeText={setLiveTitle}
              maxLength={50}
            />
          </View>

          <View style={styles.preLiveBottom}>
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.goLiveBtn, isConnecting && styles.goLiveDisabled]}
              onPress={joinLive}
              disabled={isConnecting}
            >
              <Text style={styles.goLiveText}>
                {isConnecting ? "جاري البدء..." : "بدء بث مباشر"}
              </Text>
            </TouchableOpacity>

            <View style={styles.preLiveOptions}>
              <TouchableOpacity style={styles.optionItem}>
                <Ionicons name="sparkles-outline" size={24} color="#fff" />
                <Text style={styles.optionText}>تجميل</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem}>
                <Ionicons name="filter-outline" size={24} color="#fff" />
                <Text style={styles.optionText}>مؤثرات</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem}>
                <Ionicons name="share-social-outline" size={24} color="#fff" />
                <Text style={styles.optionText}>مشاركة</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ───────────────── LIVE UI ─────────────────
  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {isBroadcaster ? (
          remoteUsers.length === 0 ? (
            <RtcSurfaceView
              style={styles.fullScreenVideo}
              canvas={{ uid: 0 }}
            />
          ) : (
            <View style={styles.splitScreenContainer}>
              <View style={styles.splitScreenItem}>
                <RtcSurfaceView
                  style={styles.fullScreenVideo}
                  canvas={{ uid: 0 }}
                />
              </View>
              {remoteUsers.map((uid) => (
                <View key={uid} style={styles.splitScreenItem}>
                  <RtcSurfaceView
                    style={styles.fullScreenVideo}
                    canvas={{ uid }}
                  />
                </View>
              ))}
            </View>
          )
        ) : remoteUsers.length > 0 ? (
          remoteUsers.length === 1 ? (
            <RtcSurfaceView
              style={styles.fullScreenVideo}
              canvas={{ uid: remoteUsers[0] }}
            />
          ) : (
            <View style={styles.splitScreenContainer}>
              {remoteUsers.map((uid) => (
                <View key={uid} style={styles.splitScreenItem}>
                  <RtcSurfaceView
                    style={styles.fullScreenVideo}
                    canvas={{ uid }}
                  />
                </View>
              ))}
            </View>
          )
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={{ color: "#fff" }}>جاري انتظار المضيف...</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.ui}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.topSection, { paddingTop: insets.top + 10 }]}>
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
                  {userInfo?.username || "مضيف"}
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

          <View style={styles.topRight}>
            <View style={styles.viewerBadge}>
              <Ionicons name="people" color="#fff" size={14} />
              <Text style={styles.viewerText}>{viewerCount}</Text>
            </View>
          </View>
        </View>

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

        <View
          style={[styles.bottomSection, { paddingBottom: insets.bottom + 10 }]}
        >
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
                <Ionicons name="people-circle-outline" size={26} color="#fff" />
              </View>
              <Text style={styles.sideBtnText}>ضيوف</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideBtn}>
              <View style={styles.iconWrap}>
                <Ionicons name="infinite-outline" size={26} color="#fff" />
              </View>
              <Text style={styles.sideBtnText}>غرفة</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sideBtn}>
              <View style={styles.iconWrap}>
                <Ionicons name="menu" size={26} color="#fff" />
              </View>
              <Text style={styles.sideBtnText}>المزيد</Text>
            </TouchableOpacity>
          </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111",
  },
  fullScreenVideo: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  splitScreenContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  splitScreenItem: {
    flex: 1,
    aspectRatio: 0.6,
    margin: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ui: { flex: 1 },

  preLiveContainer: { flex: 1, backgroundColor: "#000" },
  preLiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  preLiveContent: { flex: 1, justifyContent: "space-between", padding: 20 },
  preLiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flipBtn: { alignItems: "center", gap: 4 },
  flipText: { color: "#fff", fontSize: 12 },
  preLiveInputs: { alignItems: "center", marginVertical: 40 },
  preLiveAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#FE2C55",
    marginBottom: 10,
  },
  preLiveName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  detailsInput: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    width: "80%",
    paddingVertical: 10,
  },
  preLiveBottom: { gap: 20 },
  goLiveBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
  },
  goLiveText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  goLiveDisabled: { opacity: 0.7 },
  preLiveOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 20,
  },
  optionItem: { alignItems: "center", gap: 5 },
  optionText: { color: "#fff", fontSize: 12 },

  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 12,
  },
  topLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
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
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 20,
    gap: 8,
  },
  hostAvatar: { width: 32, height: 32, borderRadius: 16 },
  hostDetails: { justifyContent: "center" },
  hostName: { color: "#fff", fontSize: 12, fontWeight: "700" },
  hostId: { color: "#eee", fontSize: 10 },
  followBtn: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 4,
  },
  followBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  topRight: { alignItems: "flex-end", gap: 8 },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  viewerText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  middleSection: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  chatScroll: { maxHeight: height * 0.4 },
  chatMessage: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 6,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  chatMessageVip: { backgroundColor: "rgba(255,20,147,0.8)" },
  chatUsername: { color: "#fff", fontSize: 13, fontWeight: "700" },
  chatText: { color: "#fff", fontSize: 13 },

  bottomSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    gap: 12,
  },
  sideActions: { gap: 16, alignItems: "center" },
  sideBtn: { alignItems: "center" },
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
  sideBtnText: { color: "#fff", fontSize: 11, marginTop: 4, fontWeight: "600" },
  chatInputContainer: { flex: 1 },
  chatInputFake: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  chatInputFakeText: { color: "#ccc", fontSize: 14 },
  chatInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 25,
    paddingHorizontal: 12,
    gap: 8,
  },
  chatInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 10 },
  sendBtn: {
    backgroundColor: "#FE2C55",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  closeChatBtn: { padding: 4 },

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
  giftModalTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  giftItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    margin: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
  },
  giftIcon: { fontSize: 40, marginBottom: 8 },
  giftName: { fontSize: 12, fontWeight: "600", color: "#333", marginBottom: 4 },
  giftPrice: { fontSize: 11, color: "#00D4FF", fontWeight: "700" },
  errorText: {
    color: "#FE2C55",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
});
