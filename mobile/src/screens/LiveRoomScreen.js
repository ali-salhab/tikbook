import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
  StatusBar,
  Animated,
  Alert,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  Keyboard,
  InteractionManager,
  PanResponder,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import io from "socket.io-client";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";
import { PermissionsAndroid } from "react-native";

import { BASE_URL, AGORA_APP_ID } from "../config/api";
import { AuthContext } from "../context/AuthContext";
import RoomManagementModal from "../components/RoomManagementModal";
import AnimatedGift from "../components/AnimatedGift";
import FloatingComments from "../components/FloatingComments";
import GiftPanel from "../components/GiftPanel";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";
import VipBadge from "../components/VipBadge";
import SoundService from "../services/soundService";
import { ms, fs } from "../utils/responsive";

const { width, height } = Dimensions.get("window");
const SEAT_SIZE = ms(58);
const HOST_SIZE = ms(110);
const SOCKET_URL = BASE_URL.replace("/api", "");

// ─────────────────────────────────────────────────────────────────────────────

const LiveRoomScreen = ({ route, navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const { roomId } = route.params;
  const insets = useSafeAreaInsets();

  // ── Core ─────────────────────────────────────────────────────────────────────
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [freshUser, setFreshUser] = useState(null); // live-fetched profile with activeBadge
  const [loading, setLoading] = useState(true);
  const [joinedAgora, setJoinedAgora] = useState(false);

  // ── Audio ────────────────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(true);
  const [micVolume, setMicVolume] = useState(100);
  const [masterVolume, setMasterVolume] = useState(100);
  const [showAudioPanel, setShowAudioPanel] = useState(false);

  // ── Music ────────────────────────────────────────────────────────────────────
  const [sound, setSound] = useState(null);
  const [musicTitle, setMusicTitle] = useState("");
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicPosition, setMusicPosition] = useState(0);
  const [musicVolume, setMusicVolume] = useState(1.0);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // ── Gifts ────────────────────────────────────────────────────────────────────
  const [activeGifts, setActiveGifts] = useState([]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [vipLevelCommentStyles, setVipLevelCommentStyles] = useState({});

  // ── Management ───────────────────────────────────────────────────────────────
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showHandRaiseList, setShowHandRaiseList] = useState(false);

  // ── Summary ───────────────────────────────────────────────────────────────────
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState(null);
  const liveStartRef = useRef(Date.now());
  const peakViewersRef = useRef(0);
  const giftsReceivedRef = useRef(0);

  // ── Animations ───────────────────────────────────────────────────────────────
  const glowAnim = useRef(new Animated.Value(1)).current;

  // ── Speaker detection ────────────────────────────────────────────────────────
  const [speakingUserIds, setSpeakingUserIds] = useState(new Set());
  const agoraUidMapRef = useRef({}); // agoraUid (number) → userId (string)
  const localAgoraUidRef = useRef(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const socketRef = useRef(null);
  const agoraEngineRef = useRef(null);
  const inputRef = useRef(null);
  const baseWindowHeightRef = useRef(Dimensions.get("window").height);
  const isHostRef = useRef(false);
  const liveMessageKeysRef = useRef(new Set());

  // ─── LIFECYCLE ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setCurrentUser(userInfo);
    loadUserBalance();
    loadVipLevelCommentStyles();
    setupRoom();
    startGlowAnimation();
    SoundService.preload().catch(() => {});
    fetchFreshCurrentUser();

    return () => {
      cleanup();
    };
  }, []);

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  // Fetch the logged-in user's full profile (with populated activeBadge) so we
  // always show the real, up-to-date profile image and badge frame.
  const fetchFreshCurrentUser = async () => {
    if (!userInfo?._id) return;
    try {
      const res = await axios.get(`${BASE_URL}/users/${userInfo._id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (res.data) setFreshUser(res.data);
    } catch (_) {}
  };

  const playGiftSound = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    SoundService.play("gift_receive");
  };

  const playTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    SoundService.play("tap");
  };

  const loadUserBalance = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/wallet`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (res.data?.balance !== undefined) setUserBalance(res.data.balance);
    } catch (_) {}
  };

  const loadVipLevelCommentStyles = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/vip/levels`);
      const levels = Array.isArray(res.data?.levels) ? res.data.levels : [];
      const commentStyles = levels.reduce((acc, level) => {
        const levelNumber = Number(level?.level);
        if (levelNumber <= 0) return acc;

        const color =
          typeof level?.color === "string" && level.color.trim()
            ? level.color.trim()
            : "#FFD700";

        const widthValue = Number(level?.commentBorderWidth);
        const borderWidth =
          Number.isFinite(widthValue) && widthValue >= 0
            ? Math.min(widthValue, 8)
            : 1.4;

        const shapeRaw =
          typeof level?.commentBubbleShape === "string"
            ? level.commentBubbleShape.trim().toLowerCase()
            : "classic";
        const bubbleShape = ["classic", "rounded", "square", "pill"].includes(
          shapeRaw,
        )
          ? shapeRaw
          : "classic";

        acc[levelNumber] = {
          color,
          borderWidth,
          bubbleShape,
        };

        return acc;
      }, {});
      setVipLevelCommentStyles(commentStyles);
    } catch (_) {
      setVipLevelCommentStyles({});
    }
  };

  const startGlowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const formatTime = (ms) => {
    const safMs = isNaN(ms) ? 0 : ms;
    const m = Math.floor(safMs / 60000);
    const s = String(Math.floor((safMs % 60000) / 1000)).padStart(2, "0");
    return `${m}:${s}`;
  };

  const normalizeLiveMessage = (payload) => {
    if (!payload) return null;

    const messageText =
      typeof payload.message === "string"
        ? payload.message.trim()
        : typeof payload.text === "string"
          ? payload.text.trim()
          : "";

    if (!messageText && !payload.isSystem) return null;

    const messageId =
      payload.clientMessageId ||
      payload.id ||
      payload._id ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      ...payload,
      id: messageId,
      clientMessageId: payload.clientMessageId || messageId,
      message: messageText || payload.message || "",
      user: payload.user || payload.sender || null,
    };
  };

  const appendLiveMessage = (payload) => {
    const normalized = normalizeLiveMessage(payload);
    if (!normalized) return;

    const dedupeKey = normalized.clientMessageId || normalized.id;
    if (liveMessageKeysRef.current.has(dedupeKey)) return;

    liveMessageKeysRef.current.add(dedupeKey);
    setMessages((prev) => {
      const next = [...prev, normalized].slice(-50);
      liveMessageKeysRef.current = new Set(
        next.map((entry) => entry.clientMessageId || entry.id),
      );
      return next;
    });
  };

  // ─── PERMISSIONS & SETUP ────────────────────────────────────────────────────

  const setupRoom = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
    }
    await joinRoomBackend();
  };

  const cleanup = async () => {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (_) {}
    }
    try {
      await leaveRoomBackend();
    } catch (_) {}
    if (socketRef.current) socketRef.current.disconnect();
    if (agoraEngineRef.current) {
      try {
        agoraEngineRef.current.leaveChannel();
        agoraEngineRef.current.release();
      } catch (_) {}
    }
  };

  // ─── AGORA ───────────────────────────────────────────────────────────────────

  const initAgora = async (channelName, isHostOrSpeaker) => {
    try {
      if (!AGORA_APP_ID) return;
      const engine = createAgoraRtcEngine();
      agoraEngineRef.current = engine;
      engine.initialize({ appId: AGORA_APP_ID });
      engine.enableAudio();
      engine.enableAudioVolumeIndication(1000, 3, false);
      engine.setChannelProfile(
        ChannelProfileType.ChannelProfileLiveBroadcasting,
      );
      engine.setClientRole(
        isHostOrSpeaker
          ? ClientRoleType.ClientRoleBroadcaster
          : ClientRoleType.ClientRoleAudience,
      );
      engine.addListener("onJoinChannelSuccess", (connection) => {
        const uid = connection?.localUid ?? 0;
        localAgoraUidRef.current = uid;
        // Broadcast our Agora UID so others can map it to our userId
        socketRef.current?.emit("liveroom:agora_uid", {
          roomId,
          userId: userInfo._id,
          agoraUid: uid,
        });
        setJoinedAgora(true);
      });
      engine.addListener("onAudioVolumeIndication", (connection, speakers) => {
        const THRESHOLD = 30;
        const nowSpeaking = new Set();
        (speakers || []).forEach(({ uid, volume }) => {
          if (volume >= THRESHOLD) {
            if (uid === 0) {
              // Local user
              nowSpeaking.add(userInfo._id);
            } else {
              const userId = agoraUidMapRef.current[uid];
              if (userId) nowSpeaking.add(userId);
            }
          }
        });
        setSpeakingUserIds(nowSpeaking);
      });
      // Fetch a signed Agora token from the backend
      let agoraToken = null;
      try {
        const tokenRes = await axios.post(
          `${BASE_URL}/live-rooms/agora-token`,
          { channelName, role: isHostOrSpeaker ? "publisher" : "subscriber" },
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        agoraToken = tokenRes.data.token;
      } catch (tokenErr) {
        console.warn(
          "Could not fetch Agora token, joining without token:",
          tokenErr?.message,
        );
      }
      engine.joinChannel(agoraToken, channelName, 0, {});
      // Only mute audience; hosts/speakers join with mic live
      engine.muteLocalAudioStream(!isHostOrSpeaker);
    } catch (e) {
      console.error("Agora init error:", e);
    }
  };

  const updateAgoraRole = (isBroadcaster) => {
    if (!agoraEngineRef.current) return;
    agoraEngineRef.current.setClientRole(
      isBroadcaster
        ? ClientRoleType.ClientRoleBroadcaster
        : ClientRoleType.ClientRoleAudience,
    );
    if (isBroadcaster) agoraEngineRef.current.muteLocalAudioStream(isMuted);
  };

  const applyMicVolume = (vol) => {
    const v = Math.round(vol);
    setMicVolume(v);
    agoraEngineRef.current?.adjustRecordingSignalVolume(v);
  };

  const applyMasterVolume = (vol) => {
    const v = Math.round(vol);
    setMasterVolume(v);
    agoraEngineRef.current?.adjustPlaybackSignalVolume(v);
  };

  // ─── SOCKET ──────────────────────────────────────────────────────────────────

  const setupSocket = () => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.emit("liveroom:join", {
      roomId,
      userId: userInfo._id,
      user: userInfo,
    });

    socket.on("liveroom:user_joined", fetchRoomData);
    socket.on("liveroom:agora_uid", ({ userId, agoraUid }) => {
      agoraUidMapRef.current[agoraUid] = userId;
    });
    socket.on("liveroom:speaker_added", ({ user }) => {
      fetchRoomData();
      if (user._id === userInfo._id) {
        Alert.alert("✅", "أصبحت متحدثاً الآن!");
        updateAgoraRole(true);
      }
    });
    socket.on("liveroom:speaker_removed", ({ userId }) => {
      fetchRoomData();
      if (userId === userInfo._id) {
        Alert.alert("ℹ️", "تم نقلك إلى المستمعين");
        updateAgoraRole(false);
        setIsMuted(true);
        agoraEngineRef.current?.muteLocalAudioStream(true);
      }
    });
    socket.on("liveroom:mute_toggled", fetchRoomData);
    socket.on(
      "liveroom:hand_raised",
      ({ userId: raisedUserId, user: raisedUser }) => {
        fetchRoomData();
        // Notify the host about the seat request
        if (isHostRef.current && raisedUserId !== userInfo._id) {
          Alert.alert(
            "✋ طلب جلوس",
            `${raisedUser?.username || "مستخدم"} يطلب الصعود على المقعد`,
            [
              { text: "رفض", style: "cancel" },
              {
                text: "قبول",
                onPress: async () => {
                  try {
                    await axios.post(
                      `${BASE_URL}/live-rooms/${roomId}/make-speaker/${raisedUserId}`,
                      {},
                      { headers: { Authorization: `Bearer ${userToken}` } },
                    );
                    socketRef.current?.emit("liveroom:make_speaker", {
                      roomId,
                      userId: raisedUserId,
                      user: raisedUser,
                    });
                    fetchRoomData();
                  } catch (e) {
                    Alert.alert(
                      "خطأ",
                      e?.response?.data?.message || "فشل إضافة المتحدث",
                    );
                  }
                },
              },
            ],
          );
        }
      },
    );
    socket.on("liveroom:ended", () => {
      Alert.alert("انتهت الغرفة", "أنهى المضيف هذه الغرفة.", [
        { text: "حسناً", onPress: () => navigation.goBack() },
      ]);
    });
    socket.on("liveroom:message_received", (msg) => {
      appendLiveMessage(msg);
      SoundService.play("notification");
    });
    socket.on("liveroom:gift_received", ({ gift, sender }) => {
      const id = `${Date.now()}${Math.random()}`;
      giftsReceivedRef.current += 1;
      playGiftSound();
      setActiveGifts((prev) => [...prev, { id, gift, sender }]);
      appendLiveMessage({
        id,
        clientMessageId: id,
        user: sender,
        message: `أرسل هدية ${gift.name}!`,
        isSystem: true,
        giftUrl: gift.thumbnailUrl,
      });
    });
    socket.on("liveroom:kicked", ({ userId }) => {
      if (userId === userInfo._id) {
        Alert.alert("تم الطرد", "تم إزالتك من الغرفة.", [
          { text: "حسناً", onPress: () => navigation.goBack() },
        ]);
      }
    });
  };

  // ─── BACKEND ─────────────────────────────────────────────────────────────────

  const joinRoomBackend = async () => {
    try {
      const res = await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/join`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      if (res.data.success) {
        const rData = res.data.data;
        setRoom(rData);
        SoundService.play("join");
        const isHost = rData.host._id === userInfo._id;
        isHostRef.current = isHost;
        const isSpeaker = rData.speakers?.some(
          (s) => s.user._id === userInfo._id,
        );
        initAgora(
          rData.agoraChannelName || `room_${roomId}`,
          isHost || isSpeaker,
        );
        setupSocket();
      }
    } catch (err) {
      console.error("Join room error:", err);
      const rawMsg = err?.response?.data?.message || "";
      // Translate known backend messages to Arabic
      const msgMap = {
        "Live room is not active": "انتهى هذا البث المباشر",
        "Live room not found": "لم يتم العثور على الغرفة",
        "Maximum speakers reached": "وصل عدد المتحدثين إلى الحد الأقصى",
        "You are already a speaker": "أنت متحدث بالفعل في هذه الغرفة",
      };
      const msg = msgMap[rawMsg] || rawMsg || "تعذّر الانضمام إلى الغرفة";
      Alert.alert("تنبيه", msg);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomData = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/live-rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (res.data.success) {
        setRoom(res.data.data);
        const viewers = res.data.data?.listeners?.length ?? 0;
        if (viewers > peakViewersRef.current) peakViewersRef.current = viewers;
      }
    } catch (_) {}
  };

  const leaveRoomBackend = async () => {
    try {
      await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      socketRef.current?.emit("liveroom:leave", {
        roomId,
        userId: userInfo._id,
      });
    } catch (_) {}
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleExitPress = () => {
    const isHost = room?.host?._id === userInfo?._id;
    if (!isHost) {
      navigation.goBack();
      return;
    }
    Alert.alert("إنهاء الغرفة", "هل تريد إنهاء الغرفة وعرض ملخص البث؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "إنهاء",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.post(
              `${BASE_URL}/live-rooms/${roomId}/end`,
              {},
              { headers: { Authorization: `Bearer ${userToken}` } },
            );
            socketRef.current?.emit("liveroom:end", { roomId });
          } catch (_) {}
          const durationSec = Math.floor(
            (Date.now() - liveStartRef.current) / 1000,
          );
          let walletBalance = userBalance;
          try {
            const wRes = await axios.get(`${BASE_URL}/wallet`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (wRes.data?.balance !== undefined)
              walletBalance = wRes.data.balance;
          } catch (_) {}
          setSummaryStats({
            duration: formatDuration(durationSec),
            peakViewers: peakViewersRef.current,
            giftsReceived: giftsReceivedRef.current,
            balance: walletBalance,
          });
          setShowSummary(true);
        },
      },
    ]);
  };

  // ─── ACTION HANDLERS ─────────────────────────────────────────────────────────

  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    agoraEngineRef.current?.muteLocalAudioStream(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    SoundService.play(next ? "mic_off" : "mic_on");
    try {
      await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/toggle-mute`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      socketRef.current?.emit("liveroom:toggle_mute", {
        roomId,
        userId: userInfo._id,
        isMuted: next,
      });
    } catch (_) {}
  };

  const handleRaiseHand = async () => {
    try {
      const endpoint = isHandRaised ? "lower-hand" : "raise-hand";
      await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      setIsHandRaised(!isHandRaised);
      socketRef.current?.emit(
        isHandRaised ? "liveroom:lower_hand" : "liveroom:raise_hand",
        { roomId, userId: userInfo._id },
      );
    } catch (_) {
      Alert.alert("خطأ", "تعذّر تغيير حالة رفع اليد");
    }
  };

  const handleSendMessage = () => {
    const msg = inputText.trim();
    if (!msg) return;
    SoundService.play("message");
    const senderUser = freshUser
      ? {
          ...userInfo,
          vipLevel: freshUser.vipLevel ?? userInfo?.vipLevel ?? 0,
          profileImage: freshUser.profileImage || userInfo?.profileImage,
        }
      : {
          ...userInfo,
          vipLevel: userInfo?.vipLevel ?? 0,
        };
    const clientMessageId = `msg-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    appendLiveMessage({
      id: clientMessageId,
      clientMessageId,
      message: msg,
      user: senderUser,
      timestamp: new Date().toISOString(),
    });
    socketRef.current?.emit("liveroom:send_message", {
      roomId,
      message: msg,
      user: senderUser,
      clientMessageId,
    });
    setInputText("");
    Keyboard.dismiss();
    setShowInput(false);
    setKeyboardOffset(0);
  };

  const handleOpenInput = () => {
    playTap();
    setShowInput(true);
  };

  const handleCloseInput = () => {
    Keyboard.dismiss();
    setShowInput(false);
    setInputText("");
    setKeyboardOffset(0);
  };

  const handleSendGiftRequest = async ({ gift, quantity }) => {
    const receiver = room?.host;
    if (!receiver) {
      Alert.alert("خطأ", "لا يوجد مضيف");
      return;
    }
    try {
      const res = await axios.post(
        `${BASE_URL}/gifts/send`,
        {
          giftId: gift._id,
          receiverId: receiver._id,
          context: "live_room",
          contextId: roomId,
          quantity,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      if (res.data.success) {
        if (res.data.senderBalance !== undefined)
          setUserBalance(res.data.senderBalance);
        SoundService.play("gift_send");
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
        socketRef.current?.emit("liveroom:send_gift", {
          roomId,
          gift,
          sender: userInfo,
        });
        setShowGiftModal(false);
      }
    } catch (err) {
      console.error("Gift send error:", err);
      const msg = err?.response?.data?.message || "فشل إرسال الهدية";
      const isInsufficientBalance =
        msg.toLowerCase().includes("coin") ||
        msg.toLowerCase().includes("insufficient");
      Alert.alert("رصيد غير كافٍ", msg, [
        { text: "إلغاء", style: "cancel" },
        ...(isInsufficientBalance
          ? [
              {
                text: "شحن الرصيد",
                onPress: () => {
                  setShowGiftModal(false);
                  navigation.navigate("Wallet");
                },
              },
            ]
          : []),
      ]);
    }
  };

  // ─── MUSIC ───────────────────────────────────────────────────────────────────

  const handlePickMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      if (sound) {
        await sound.unloadAsync();
      }
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: ns } = await Audio.Sound.createAsync(
        { uri: asset.uri },
        { shouldPlay: true, volume: musicVolume },
      );
      setSound(ns);
      setMusicTitle(asset.name || "Music");
      setIsPlayingMusic(true);
      setShowMusicPlayer(true);
      ns.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setMusicDuration(status.durationMillis || 0);
          setMusicPosition(status.positionMillis || 0);
          setIsPlayingMusic(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlayingMusic(false);
            setShowMusicPlayer(false);
            setSound(null);
            setMusicTitle("");
          }
        }
      });
    } catch (e) {
      console.error("Music error:", e);
    }
  };

  const handleToggleMusic = async () => {
    if (!sound) return;
    isPlayingMusic ? await sound.pauseAsync() : await sound.playAsync();
  };

  const handleStopMusic = async () => {
    if (!sound) return;
    await sound.stopAsync();
    await sound.unloadAsync();
    setSound(null);
    setIsPlayingMusic(false);
    setShowMusicPlayer(false);
    setMusicTitle("");
  };

  const handleSeekMusic = async (val) => {
    if (sound) await sound.setPositionAsync(Math.round(val));
  };

  const handleChangeMusicVolume = async (val) => {
    setMusicVolume(val);
    if (sound) await sound.setVolumeAsync(val);
  };

  // ─── COMPONENTS ──────────────────────────────────────────────────────────────

  const Header = () => {
    const isHost = room?.host?._id === currentUser?._id;
    const raisers = room?.speakers?.filter((s) => s.handRaised) || [];
    return (
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {/* Left */}
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.exitBtn} onPress={handleExitPress}>
            <Feather name="x" size={16} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.liveBadge}>
            <MaterialCommunityIcons name="broadcast" size={11} color="#FFF" />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
          <View style={styles.viewerBadge}>
            <Ionicons name="eye-outline" size={11} color="#FFF" />
            <Text style={styles.viewerText}>
              {room?.listeners?.length ?? 0}
            </Text>
          </View>
        </View>
        {/* Center */}
        <Text style={styles.roomTitle} numberOfLines={1}>
          {room?.title || "غرفة البث"}
        </Text>
        {/* Right */}
        <View style={styles.headerRight}>
          {isHost && raisers.length > 0 && (
            <TouchableOpacity
              style={styles.handBadgePill}
              onPress={() => setShowHandRaiseList(true)}
            >
              <Text style={{ fontSize: 12 }}>✋</Text>
              <Text style={styles.handBadgeCount}>{raisers.length}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.userChip}>
            <ProfileBadgeFrame
              profileImage={
                freshUser?.profileImage || userInfo?.profileImage || null
              }
              badgeImage={
                freshUser?.activeBadge?.imageUrl ||
                freshUser?.activeBadge?.image ||
                null
              }
              size={30}
            />
          </View>
        </View>
      </View>
    );
  };

  const HostSection = () => {
    const host = room?.host;
    return (
      <View style={styles.hostSection}>
        {/* Outer pulse ring */}
        <Animated.View
          style={[
            styles.glowRingOuter,
            {
              transform: [{ scale: glowAnim }],
              opacity: glowAnim.interpolate({
                inputRange: [1, 1.08],
                outputRange: [0.5, 0],
              }),
            },
          ]}
        />
        {/* Inner glow ring */}
        <Animated.View
          style={[styles.glowRing, { transform: [{ scale: glowAnim }] }]}
        />
        <View style={styles.hostAvatarWrap}>
          <ProfileBadgeFrame
            profileImage={host?.profileImage || host?.avatar || null}
            badgeImage={
              host?.activeBadge?.imageUrl || host?.activeBadge?.image || null
            }
            size={HOST_SIZE}
          />
          {joinedAgora && <View style={styles.onlineDot} />}
        </View>
        <Text style={styles.hostName}>{host?.username || "Host"}</Text>
        {host?.vipLevel > 0 && <VipBadge level={host.vipLevel} size="small" />}
        <View style={styles.hostRoleRow}>
          <MaterialIcons name="verified" size={13} color="#00F2EA" />
          <Text style={styles.hostRoleText}>صاحب الغرفة</Text>
        </View>
      </View>
    );
  };

  const Seat = ({ index, speaker }) => {
    const user = speaker?.user;
    // Use fresh data for the current user's own seat
    const isMe = user?._id === userInfo?._id;
    const profileImg = isMe
      ? freshUser?.profileImage || user?.profileImage || null
      : user?.profileImage || user?.avatar || null;
    const badgeImg = isMe
      ? freshUser?.activeBadge?.imageUrl ||
        freshUser?.activeBadge?.image ||
        null
      : user?.activeBadge?.imageUrl || user?.activeBadge?.image || null;
    const isSpeaking = user && speakingUserIds.has(user._id);

    return (
      <View style={styles.seatWrap}>
        <View
          style={[
            styles.seatCircle,
            !speaker?.isMuted && user && styles.seatActive,
            isSpeaking && styles.seatSpeaking,
          ]}
        >
          {user ? (
            <View style={styles.seatFrameWrap}>
              <ProfileBadgeFrame
                profileImage={profileImg}
                badgeImage={badgeImg}
                size={SEAT_SIZE - 4}
              />
            </View>
          ) : (
            <Feather name="plus" size={18} color="rgba(255,255,255,0.35)" />
          )}
          <View style={styles.seatNum}>
            <Text style={styles.seatNumText}>{index + 1}</Text>
          </View>
          {speaker?.isMuted && (
            <View style={styles.mutedDot}>
              <Ionicons name="mic-off" size={7} color="#FFF" />
            </View>
          )}
          {speaker?.handRaised && (
            <View style={styles.handDot}>
              <Text style={{ fontSize: 8 }}>✋</Text>
            </View>
          )}
        </View>
        <Text style={styles.seatLabel} numberOfLines={1}>
          {user ? user.username : `${index + 1}`}
        </Text>
        {user?.vipLevel > 0 && <VipBadge level={user.vipLevel} size="small" />}
      </View>
    );
  };

  const SeatGrid = () => {
    const hostId = room?.host?._id;
    // Filter out the host from speakers so they don’t appear in seat grid
    const speakers = (room?.speakers || []).filter(
      (s) => s.user._id !== hostId,
    );
    const slots = Array(8)
      .fill(null)
      .map((_, i) => speakers[i] || null);
    return (
      <View style={styles.seatGrid}>
        <View style={styles.seatRow}>
          {[0, 1, 2, 3].map((i) => (
            <Seat key={i} index={i} speaker={slots[i]} />
          ))}
        </View>
        <View style={styles.seatRow}>
          {[4, 5, 6, 7].map((i) => (
            <Seat key={i} index={i} speaker={slots[i]} />
          ))}
        </View>
      </View>
    );
  };

  const BottomBar = () => {
    const isHost = room?.host?._id === currentUser?._id;
    const isSpeaker = room?.speakers?.some(
      (s) => s.user._id === currentUser?._id,
    );
    const canSpeak = isHost || isSpeaker;
    return (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* Actions */}
        <View style={styles.actions}>
          {/* Mic / Hand */}
          {canSpeak ? (
            <TouchableOpacity
              onPress={() => {
                playTap();
                handleToggleMute();
              }}
            >
              <View style={[styles.actionCircle, isMuted && styles.actionRed]}>
                <Ionicons
                  name={isMuted ? "mic-off" : "mic"}
                  size={19}
                  color="#FFF"
                />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                playTap();
                handleRaiseHand();
              }}
            >
              <View
                style={[
                  styles.actionCircle,
                  isHandRaised && styles.actionYellow,
                ]}
              >
                <Ionicons
                  name={isHandRaised ? "hand-right" : "hand-right-outline"}
                  size={19}
                  color="#FFF"
                />
              </View>
            </TouchableOpacity>
          )}
          {/* Music */}
          {canSpeak && (
            <TouchableOpacity
              onPress={() => {
                playTap();
                sound ? setShowMusicPlayer(true) : handlePickMusic();
              }}
              onLongPress={sound ? handleStopMusic : undefined}
            >
              <View style={[styles.actionCircle, sound && styles.actionGreen]}>
                <Ionicons
                  name={sound ? "musical-notes" : "musical-note-outline"}
                  size={19}
                  color="#FFF"
                />
              </View>
            </TouchableOpacity>
          )}
          {/* Audio controls */}
          <TouchableOpacity
            onPress={() => {
              playTap();
              setShowAudioPanel(true);
            }}
          >
            <View style={styles.actionCircle}>
              <Ionicons name="options-outline" size={19} color="#FFF" />
            </View>
          </TouchableOpacity>

          {/* Inline Comment Input */}
          <TouchableOpacity
            style={styles.inlineCommentContainer}
            onPress={handleOpenInput}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={styles.inlineCommentPlaceholder}>
                اكتب تعليقاً...
              </Text>
            </View>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>

          {/* Gift */}
          <TouchableOpacity
            onPress={() => {
              playTap();
              setShowGiftModal(true);
            }}
          >
            <View style={{ alignItems: "center", gap: 2 }}>
              <LinearGradient
                colors={["#A020F0", "#FF00FF"]}
                style={styles.giftCircle}
              >
                <Ionicons name="gift-outline" size={21} color="#FFF" />
              </LinearGradient>
              <Text style={styles.actionLabel}>هدية</Text>
            </View>
          </TouchableOpacity>
          {/* More — owner only */}
          {isHost && (
            <TouchableOpacity
              onPress={() => {
                playTap();
                setShowManagementModal(true);
              }}
            >
              <View style={styles.actionCircle}>
                <Ionicons name="ellipsis-horizontal" size={19} color="#FFF" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ─── MUSIC PLAYER MODAL ───────────────────────────────────────────────────────

  const musicPlayerModal = (
    <Modal
      visible={showMusicPlayer}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMusicPlayer(false)}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => setShowMusicPlayer(false)}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>🎵 مشغّل الموسيقى</Text>
        <Text style={styles.trackName} numberOfLines={1}>
          {musicTitle || "— لا يوجد مسار —"}
        </Text>
        {/* Seek */}
        <View style={styles.seekRow}>
          <Text style={styles.timeText}>{formatTime(musicPosition)}</Text>
          <Slider
            style={{ flex: 1 }}
            minimumValue={0}
            maximumValue={musicDuration > 0 ? musicDuration : 1}
            value={musicPosition}
            onSlidingComplete={handleSeekMusic}
            minimumTrackTintColor="#A020F0"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#A020F0"
          />
          <Text style={styles.timeText}>{formatTime(musicDuration)}</Text>
        </View>
        {/* Controls */}
        <View style={styles.musicCtrl}>
          <TouchableOpacity
            style={styles.musicCtrlBtn}
            onPress={handleStopMusic}
          >
            <Ionicons name="stop-circle" size={34} color="#FF4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleMusic}>
            <LinearGradient
              colors={["#A020F0", "#FF00FF"]}
              style={styles.playBtn}
            >
              <Ionicons
                name={isPlayingMusic ? "pause" : "play"}
                size={32}
                color="#FFF"
              />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.musicCtrlBtn}
            onPress={handlePickMusic}
          >
            <Ionicons name="folder-open-outline" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        {/* Music volume */}
        <Text style={styles.volLabel}>
          🔊 مستوى صوت الموسيقى {Math.round(musicVolume * 100)}%
        </Text>
        <View style={styles.volRow}>
          <Ionicons name="volume-low" size={16} color="#999" />
          <Slider
            style={styles.volSlider}
            minimumValue={0}
            maximumValue={1}
            value={musicVolume}
            onValueChange={handleChangeMusicVolume}
            minimumTrackTintColor="#A020F0"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#A020F0"
          />
          <Ionicons name="volume-high" size={16} color="#FFF" />
        </View>
      </View>
    </Modal>
  );

  // ─── AUDIO PANEL MODAL ────────────────────────────────────────────────────────

  const audioPanelModal = (
    <Modal
      visible={showAudioPanel}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAudioPanel(false)}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => setShowAudioPanel(false)}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>🎙️ ضبط الصوت</Text>

        {/* Mic volume */}
        <Text style={styles.volLabel}>
          🎤 صوت الميكروفون {Math.round(micVolume)}%
        </Text>
        <View style={styles.volRow}>
          <Ionicons name="volume-low" size={16} color="#999" />
          <Slider
            style={styles.volSlider}
            minimumValue={0}
            maximumValue={100}
            value={micVolume}
            onValueChange={applyMicVolume}
            minimumTrackTintColor="#00F2EA"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#00F2EA"
          />
          <Ionicons name="volume-high" size={16} color="#FFF" />
        </View>

        {/* Speaker volume */}
        <Text style={[styles.volLabel, { marginTop: 16 }]}>
          📢 صوت السماعة {Math.round(masterVolume)}%
        </Text>
        <View style={styles.volRow}>
          <Ionicons name="volume-low" size={16} color="#999" />
          <Slider
            style={styles.volSlider}
            minimumValue={0}
            maximumValue={200}
            value={masterVolume}
            onValueChange={applyMasterVolume}
            minimumTrackTintColor="#A020F0"
            maximumTrackTintColor="rgba(255,255,255,0.2)"
            thumbTintColor="#A020F0"
          />
          <Ionicons name="volume-high" size={16} color="#FFF" />
        </View>

        {/* Music volume (if playing) */}
        {sound && (
          <>
            <Text style={[styles.volLabel, { marginTop: 16 }]}>
              🎵 صوت الموسيقى {Math.round(musicVolume * 100)}%
            </Text>
            <View style={styles.volRow}>
              <Ionicons name="volume-low" size={16} color="#999" />
              <Slider
                style={styles.volSlider}
                minimumValue={0}
                maximumValue={1}
                value={musicVolume}
                onValueChange={handleChangeMusicVolume}
                minimumTrackTintColor="#FFD700"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="#FFD700"
              />
              <Ionicons name="volume-high" size={16} color="#FFF" />
            </View>
          </>
        )}

        {/* Mic toggle */}
        <TouchableOpacity style={styles.muteBtn} onPress={handleToggleMute}>
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={20} color="#FFF" />
          <Text style={styles.muteBtnText}>
            {isMuted ? "تفعيل الميك" : "كتم الميك"}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  // ─── HAND RAISE LIST MODAL ───────────────────────────────────────────────────

  const raisers = room?.speakers?.filter((s) => s.handRaised) || [];
  const handRaiseModal = (
    <Modal
      visible={showHandRaiseList}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHandRaiseList(false)}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => setShowHandRaiseList(false)}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>
          ✋ طلبات الكلام ({raisers.length})
        </Text>
        <ScrollView>
          {raisers.length === 0 && (
            <Text style={{ color: "#999", textAlign: "center", padding: 20 }}>
              لا توجد طلبات
            </Text>
          )}
          {raisers.map((s) => (
            <View key={s.user._id} style={styles.raiserRow}>
              <Image
                source={{
                  uri: s.user.profileImage || s.user.avatar || null,
                }}
                style={styles.raiserAvatar}
              />
              <Text style={styles.raiserName}>{s.user.username}</Text>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={async () => {
                  try {
                    await axios.post(
                      `${BASE_URL}/live-rooms/${roomId}/add-speaker`,
                      { userId: s.user._id },
                      { headers: { Authorization: `Bearer ${userToken}` } },
                    );
                    fetchRoomData();
                    socketRef.current?.emit("liveroom:add_speaker", {
                      roomId,
                      userId: s.user._id,
                      user: s.user,
                    });
                  } catch (_) {}
                }}
              >
                <Text style={styles.approveBtnText}>قبول</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  // ─── MINI MUSIC BAR (draggable floating widget) ──────────────────────────────

  const floatPos = useRef(
    new Animated.ValueXY({ x: 10, y: Dimensions.get("window").height - 220 }),
  ).current;
  const floatLastPos = useRef({
    x: 10,
    y: Dimensions.get("window").height - 220,
  });
  const floatDragging = useRef(false);

  const floatPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
      onPanResponderGrant: () => {
        floatDragging.current = false;
        floatPos.setOffset(floatLastPos.current);
        floatPos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4) {
          floatDragging.current = true;
        }
        Animated.event([null, { dx: floatPos.x, dy: floatPos.y }], {
          useNativeDriver: false,
        })(_, gs);
      },
      onPanResponderRelease: (_, gs) => {
        floatPos.flattenOffset();
        const newX = floatLastPos.current.x + gs.dx;
        const newY = floatLastPos.current.y + gs.dy;
        floatLastPos.current = { x: newX, y: newY };
        if (!floatDragging.current) {
          setShowMusicPlayer(true);
        }
      },
    }),
  ).current;

  const MiniMusicBar = () => {
    if (!sound) return null;
    return (
      <Animated.View
        style={[
          styles.miniBar,
          { transform: floatPos.getTranslateTransform() },
        ]}
        {...floatPanResponder.panHandlers}
      >
        <View style={styles.miniBarInner}>
          <Ionicons name="musical-notes" size={18} color="#A020F0" />
          <Text style={styles.miniBarTitle} numberOfLines={1}>
            {musicTitle || "Music"}
          </Text>
          <TouchableOpacity
            onPress={handleToggleMusic}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPlayingMusic ? "pause" : "play"}
              size={20}
              color="#A020F0"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStopMusic}
            style={{ marginLeft: 6 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ─── KEYBOARD LISTENER ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!showInput) return;

    let retryTimer = null;
    const task = InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
      retryTimer = setTimeout(() => inputRef.current?.focus(), 120);
    });

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      task?.cancel?.();
    };
  }, [showInput]);

  useEffect(() => {
    const onKeyboardFrame = (e) => {
      const screenHeight = Dimensions.get("screen").height;
      const endY = e?.endCoordinates?.screenY;
      const endHeight = e?.endCoordinates?.height;

      const offsetFromY =
        typeof endY === "number" ? Math.max(0, screenHeight - endY) : 0;
      const offsetFromHeight =
        typeof endHeight === "number" ? Math.max(0, endHeight) : 0;

      // Use the larger value because some Android keyboards report one metric
      // more reliably than the other across devices.
      const resolvedOffset = Math.max(offsetFromY, offsetFromHeight);
      setKeyboardOffset(resolvedOffset);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      onKeyboardFrame,
    );
    const changeSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow",
      onKeyboardFrame,
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardOffset(0),
    );
    return () => {
      showSub.remove();
      changeSub.remove();
      hideSub.remove();
    };
  }, []);

  // ─── CHAT INPUT BAR ───────────────────────────────────────────────────────────

  const isAndroidResizedByKeyboard =
    Platform.OS === "android" &&
    baseWindowHeightRef.current - Dimensions.get("window").height > 80;

  const chatInputBar = showInput ? (
    <>
      {/* Dismiss backdrop */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleCloseInput}
      />
      {/* Input bar — sits directly above the keyboard */}
      <View
        style={[
          styles.chatBar,
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom:
              Platform.OS === "android"
                ? isAndroidResizedByKeyboard
                  ? 0
                  : keyboardOffset
                : keyboardOffset,
            paddingBottom: keyboardOffset > 0 ? 10 : insets.bottom + 10,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          autoFocus
          value={inputText}
          onChangeText={setInputText}
          placeholder="اكتب تعليقاً..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          style={styles.chatField}
          onSubmitEditing={handleSendMessage}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline={false}
          autoCorrect={false}
          spellCheck={false}
        />
        <TouchableOpacity
          onPress={() => {
            playTap();
            handleSendMessage();
          }}
          style={styles.sendBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="send" size={20} color="#00BFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCloseInput}
          style={styles.closeChatBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={20} color="#AAA" />
        </TouchableOpacity>
      </View>
    </>
  ) : null;

  // ─── SUMMARY MODAL ───────────────────────────────────────────────────────────
  const summaryModal = (
    <Modal
      visible={showSummary}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowSummary(false);
        navigation.goBack();
      }}
    >
      <View style={styles.summaryOverlay}>
        <View
          style={[styles.summaryCard, { paddingBottom: insets.bottom + 20 }]}
        >
          {/* Header */}
          <LinearGradient
            colors={["#A020F0", "#FF00FF"]}
            style={styles.summaryHeader}
          >
            <MaterialCommunityIcons name="broadcast" size={28} color="#FFF" />
            <Text style={styles.summaryTitle}>ملخص الغرفة</Text>
            <Text style={styles.summarySubtitle}>شكراً لبثك المباشر!</Text>
          </LinearGradient>

          {/* Stats grid */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={26} color="#A020F0" />
              <Text style={styles.summaryValue}>
                {summaryStats?.duration ?? "0:00"}
              </Text>
              <Text style={styles.summaryLabel}>مدة البث</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="eye-outline" size={26} color="#00F2EA" />
              <Text style={styles.summaryValue}>
                {summaryStats?.peakViewers ?? 0}
              </Text>
              <Text style={styles.summaryLabel}>ذروة المشاهدين</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="gift-outline" size={26} color="#FF4D94" />
              <Text style={styles.summaryValue}>
                {summaryStats?.giftsReceived ?? 0}
              </Text>
              <Text style={styles.summaryLabel}>هدايا استُلمت</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="logo-bitcoin" size={26} color="#FFD700" />
              <Text style={styles.summaryValue}>
                {summaryStats?.balance ?? 0}
              </Text>
              <Text style={styles.summaryLabel}>رصيدك الحالي</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.summaryCloseBtn}
            onPress={() => {
              setShowSummary(false);
              navigation.goBack();
            }}
          >
            <Text style={styles.summaryCloseBtnText}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ─── LOADING SCREEN ──────────────────────────────────────────────────────────

  if (loading || !room) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <MaterialCommunityIcons name="broadcast" size={52} color="#A020F0" />
        <Text style={{ color: "#FFF", marginTop: 16, fontSize: 16 }}>
          جارٍ التحميل...
        </Text>
      </View>
    );
  }

  const liveCommentsBottomOffset =
    keyboardOffset > 0 ? keyboardOffset + ms(72) : insets.bottom + ms(92);
  const liveCommentsMaxHeight =
    keyboardOffset > 0
      ? Math.min(height * 0.2, ms(160))
      : Math.min(height * 0.34, ms(280));

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background — blurred cover image */}
      <ImageBackground
        source={
          room?.coverImage
            ? { uri: room.coverImage }
            : room?.backgroundImage
              ? { uri: room.backgroundImage }
              : {
                  uri: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=1000",
                }
        }
        style={StyleSheet.absoluteFill}
        blurRadius={5}
      />
      <LinearGradient
        colors={["rgba(8,0,22,0.28)", "rgba(8,0,22,0.52)", "rgba(0,0,0,0.88)"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Main content */}
      <View style={{ flex: 1 }}>
        {Header()}

        {/* Cover banner removed — background image fills full screen */}

        {/* Currency bar */}
        <View style={styles.currencyBar}>
          <View style={styles.currencyItem}>
            <Ionicons name="radio" size={11} color="#FF4444" />
            <Text style={styles.currencyText}>REC</Text>
          </View>
          <View style={styles.currencyItem}>
            <Ionicons name="gift" size={11} color="#D8BFD8" />
            <Text style={styles.currencyText}>Gift</Text>
          </View>
        </View>

        {HostSection()}
        {SeatGrid()}
      </View>

      {/* Floating comments — bottom tracks keyboard so comments stay above input */}
      <FloatingComments
        comments={messages}
        bottomOffset={liveCommentsBottomOffset}
        maxHeight={liveCommentsMaxHeight}
        vipLevelStyles={vipLevelCommentStyles}
      />

      {/* Animated gifts */}
      {activeGifts.map((d) => (
        <AnimatedGift
          key={d.id}
          gift={d.gift}
          sender={d.sender}
          onComplete={() =>
            setActiveGifts((p) => p.filter((g) => g.id !== d.id))
          }
        />
      ))}

      {/* Mini music bar */}
      {MiniMusicBar()}

      {/* Bottom action bar */}
      {!showInput && BottomBar()}

      {/* Chat input — always mounted, shown/hidden via display prop */}
      {chatInputBar}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {musicPlayerModal}
      {audioPanelModal}
      {handRaiseModal}

      {summaryModal}

      <RoomManagementModal
        visible={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        roomId={roomId}
        isHost={room?.host?._id === userInfo?._id}
      />

      <GiftPanel
        visible={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        onSendGift={handleSendGiftRequest}
        userBalance={userBalance}
        onRecharge={() => {
          setShowGiftModal(false);
          navigation.navigate("Wallet");
        }}
      />
    </View>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050010" },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(12),
    paddingBottom: ms(6),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    flex: 1,
    justifyContent: "flex-end",
  },
  exitBtn: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(3),
    backgroundColor: "#CC2222",
    paddingHorizontal: ms(7),
    paddingVertical: ms(3),
    borderRadius: ms(8),
  },
  liveBadgeText: { color: "#FFF", fontSize: fs(9), fontWeight: "700" },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(3),
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: ms(6),
    paddingVertical: ms(3),
    borderRadius: ms(8),
  },
  viewerText: { color: "#FFF", fontSize: fs(10) },
  roomTitle: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: fs(13),
    flex: 1,
    textAlign: "center",
  },
  handBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(3),
    backgroundColor: "rgba(255,220,0,0.2)",
    paddingHorizontal: ms(7),
    paddingVertical: ms(3),
    borderRadius: ms(8),
  },
  handBadgeCount: { color: "#FFD700", fontSize: fs(10), fontWeight: "bold" },
  userChip: { alignItems: "center", gap: ms(2) },
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(2),
    backgroundColor: "rgba(0,242,234,0.12)",
    paddingHorizontal: ms(5),
    paddingVertical: ms(2),
    borderRadius: ms(6),
  },
  coinText: { color: "#00F2EA", fontSize: fs(8) },

  // ── Cover banner ─────────────────────────────────────────────────────────────
  coverBanner: {
    marginHorizontal: ms(14),
    marginBottom: ms(6),
    height: ms(80),
    borderRadius: ms(14),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  coverBannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  coverBannerOverlay: {
    position: "absolute",
    bottom: ms(8),
    left: ms(10),
    right: ms(10),
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
  },
  coverLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(3),
    backgroundColor: "#FF1493",
    paddingHorizontal: ms(7),
    paddingVertical: ms(3),
    borderRadius: ms(10),
  },
  coverLiveText: {
    color: "#FFF",
    fontSize: fs(9),
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  coverBannerTitle: {
    color: "#FFF",
    fontSize: fs(13),
    fontWeight: "700",
    flex: 1,
  },

  // ── Currency bar ─────────────────────────────────────────────────────────────
  currencyBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: ms(14),
    gap: ms(6),
    marginBottom: ms(2),
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(3),
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: ms(7),
    paddingVertical: ms(3),
    borderRadius: ms(8),
  },
  currencyText: { color: "#FFF", fontSize: fs(10) },

  // ── Host ─────────────────────────────────────────────────────────────────────
  hostSection: { alignItems: "center", marginTop: ms(14), marginBottom: ms(8) },
  glowRing: {
    position: "absolute",
    width: HOST_SIZE + 34,
    height: HOST_SIZE + 34,
    borderRadius: (HOST_SIZE + 34) / 2,
    borderWidth: 3,
    borderColor: "#A020F0",
    shadowColor: "#A020F0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 24,
  },
  glowRingOuter: {
    position: "absolute",
    width: HOST_SIZE + 62,
    height: HOST_SIZE + 62,
    borderRadius: (HOST_SIZE + 62) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(160,32,240,0.35)",
    shadowColor: "#A020F0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 16,
  },
  hostAvatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute",
    bottom: ms(4),
    right: ms(4),
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: "#00BB55",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  hostName: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: fs(14),
    marginTop: ms(8),
  },
  hostRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    marginTop: ms(2),
  },
  hostRoleText: { color: "#00F2EA", fontSize: fs(11) },

  // ── Seat grid ─────────────────────────────────────────────────────────────────
  seatGrid: { paddingHorizontal: ms(8), gap: ms(6), marginTop: ms(4) },
  seatRow: { flexDirection: "row", justifyContent: "space-around" },
  seatWrap: { alignItems: "center", width: SEAT_SIZE + 12 },
  seatCircle: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    borderRadius: SEAT_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.52)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    // No overflow:hidden — badge frames extend beyond the circle
  },
  seatActive: { borderColor: "#00BB55", borderWidth: 2 },
  seatSpeaking: {
    borderColor: "#00F2EA",
    borderWidth: 3,
    shadowColor: "#00F2EA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  seatFrameWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  seatNum: {
    position: "absolute",
    bottom: ms(-2),
    left: ms(-4),
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: ms(4),
    paddingVertical: ms(1),
    borderRadius: ms(6),
    minWidth: ms(16),
    alignItems: "center",
  },
  seatNumText: { color: "#FFF", fontSize: fs(8) },
  mutedDot: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FF4444",
    width: ms(13),
    height: ms(13),
    borderRadius: ms(6.5),
    justifyContent: "center",
    alignItems: "center",
  },
  handDot: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    justifyContent: "center",
    alignItems: "center",
  },
  seatLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: fs(9),
    marginTop: ms(4),
  },

  // ── Bottom bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingHorizontal: ms(12),
    paddingTop: ms(10),
  },
  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    backgroundColor: "rgba(0,242,234,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,242,234,0.2)",
    paddingHorizontal: ms(9),
    paddingVertical: ms(6),
    borderRadius: ms(14),
  },
  balanceChipText: { color: "#00F2EA", fontWeight: "bold", fontSize: fs(12) },
  actions: { flexDirection: "row", alignItems: "center", gap: ms(10) },
  actionCircle: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionRed: { backgroundColor: "rgba(255,60,60,0.35)" },
  actionYellow: { backgroundColor: "rgba(255,210,0,0.35)" },
  actionGreen: { backgroundColor: "rgba(0,187,85,0.35)" },
  giftCircle: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    color: "#FF88FF",
    fontSize: fs(8),
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Mini music bar (floating draggable) ─────────────────────────────────────
  miniBar: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 999,
    borderRadius: 26,
    elevation: 8,
    shadowColor: "#A020F0",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  miniBarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    backgroundColor: "rgba(10,0,30,0.92)",
    paddingHorizontal: ms(14),
    paddingVertical: ms(9),
    borderRadius: ms(26),
    borderWidth: 1.5,
    borderColor: "rgba(160,32,240,0.6)",
    maxWidth: ms(220),
  },
  miniBarTitle: { flex: 1, color: "#EEE", fontSize: fs(13), fontWeight: "600" },

  // ── Chat input ────────────────────────────────────────────────────────────────
  chatBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(4,0,16,0.97)",
    paddingHorizontal: ms(12),
    paddingTop: ms(10),
    borderTopWidth: 1,
    borderTopColor: "rgba(160,32,240,0.3)",
  },
  summaryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: ms(20),
  },
  summaryCard: {
    width: "100%",
    backgroundColor: "#0D0020",
    borderRadius: ms(24),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(160,32,240,0.4)",
  },
  summaryHeader: {
    alignItems: "center",
    paddingVertical: ms(24),
    paddingHorizontal: ms(16),
  },
  summaryTitle: {
    color: "#FFF",
    fontSize: fs(22),
    fontWeight: "700",
    marginTop: ms(8),
  },
  summarySubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: fs(14),
    marginTop: ms(4),
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: ms(16),
    gap: ms(12),
  },
  summaryItem: {
    width: "46%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: ms(16),
    alignItems: "center",
    paddingVertical: ms(18),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginHorizontal: "2%",
  },
  summaryValue: {
    color: "#FFF",
    fontSize: fs(26),
    fontWeight: "700",
    marginTop: ms(8),
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: fs(12),
    marginTop: ms(4),
    textAlign: "center",
  },
  summaryCloseBtn: {
    margin: ms(16),
    marginTop: ms(4),
    backgroundColor: "#A020F0",
    borderRadius: ms(14),
    paddingVertical: ms(14),
    alignItems: "center",
  },
  summaryCloseBtnText: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "700",
  },
  chatField: {
    flex: 1,
    color: "#FFF",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: ms(20),
    height: ms(40),
    paddingHorizontal: ms(14),
    paddingVertical: 0,
    fontSize: fs(14),
    marginRight: ms(8),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    textAlign: "right",
  },
  inlineCommentContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: ms(20),
    height: ms(40),
    paddingHorizontal: ms(12),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  inlineCommentPlaceholder: {
    color: "rgba(255,255,255,0.5)",
    fontSize: fs(13),
    textAlign: "right",
  },
  inlineSendBtn: {
    paddingLeft: 8,
  },
  sendBtn: { padding: 4 },
  closeChatBtn: { padding: 4, marginLeft: 2 },

  // ── Modals / Bottom sheet ─────────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "#0A0018",
    borderTopLeftRadius: ms(22),
    borderTopRightRadius: ms(22),
    paddingTop: ms(10),
    paddingHorizontal: ms(20),
    borderTopWidth: 1,
    borderColor: "rgba(160,32,240,0.4)",
    minHeight: ms(200),
  },
  sheetHandle: {
    alignSelf: "center",
    width: ms(36),
    height: ms(4),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: ms(2),
    marginBottom: ms(14),
  },
  sheetTitle: {
    color: "#FFF",
    fontSize: fs(15),
    fontWeight: "700",
    marginBottom: ms(12),
  },

  // ── Music player ──────────────────────────────────────────────────────────────
  trackName: {
    color: "#BBB",
    fontSize: fs(13),
    textAlign: "center",
    marginBottom: ms(10),
  },
  seekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    marginBottom: ms(4),
  },
  timeText: {
    color: "#888",
    fontSize: fs(10),
    width: ms(34),
    textAlign: "center",
  },
  musicCtrl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(28),
    marginVertical: ms(10),
  },
  musicCtrlBtn: { padding: ms(6) },
  playBtn: {
    width: ms(60),
    height: ms(60),
    borderRadius: ms(30),
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Volume rows ──────────────────────────────────────────────────────────────
  volLabel: { color: "#CCC", fontSize: fs(12), marginBottom: ms(4) },
  volRow: { flexDirection: "row", alignItems: "center", gap: ms(6) },
  volSlider: { flex: 1 },

  // ── Mic toggle ───────────────────────────────────────────────────────────────
  muteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(10),
    backgroundColor: "rgba(160,32,240,0.2)",
    padding: ms(13),
    borderRadius: ms(14),
    marginTop: ms(10),
  },
  muteBtnText: { color: "#FFF", fontSize: fs(14), fontWeight: "600" },

  // ── Hand raise list ───────────────────────────────────────────────────────────
  raiserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  raiserAvatar: { width: ms(38), height: ms(38), borderRadius: ms(19) },
  raiserName: { flex: 1, color: "#FFF", fontSize: fs(13) },
  approveBtn: {
    backgroundColor: "#A020F0",
    paddingHorizontal: ms(14),
    paddingVertical: ms(6),
    borderRadius: ms(14),
  },
  approveBtnText: { color: "#FFF", fontSize: fs(12), fontWeight: "bold" },
});

export default LiveRoomScreen;
