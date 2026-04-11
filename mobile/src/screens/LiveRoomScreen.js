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
import { BlurView } from "expo-blur";
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
import CommentParticles from "../components/CommentParticles";
import FloatingComments from "../components/FloatingComments";
import GiftPanel from "../components/GiftPanel";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";
import SoundWave from "../components/SoundWave";
import VipBadge from "../components/VipBadge";
import SoundService from "../services/soundService";
import { ms, fs } from "../utils/responsive";
import JoinAnimation from "../live/components/JoinAnimation";

const { width, height } = Dimensions.get("window");
const BASE_SEAT_SIZE = ms(58);
const HOST_SIZE = ms(110);
const SOCKET_URL = BASE_URL.replace("/api", "");

// ─── Host avatar: clean circle + animated pulse rings when speaking ───────────
// ── Speaking ripple ring colors ───────────────────────────────────────────────
const RIPPLE_COLORS = ["#7C3AED", "#2563EB", "#06B6D4"];   // violet, blue, cyan — cycle

const HostAvatarFrame = React.memo(({ imageUrl, size, isSpeaking, showOnline }) => {
  // 3 ripple rings — each is a scale+opacity value starting at 0
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  const makeRipple = (anim, delay) =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );

  useEffect(() => {
    if (isSpeaking) {
      const a1 = makeRipple(r1, 0);
      const a2 = makeRipple(r2, 730);
      const a3 = makeRipple(r3, 1460);
      a1.start(); a2.start(); a3.start();
      return () => {
        a1.stop(); a2.stop(); a3.stop();
        r1.setValue(0); r2.setValue(0); r3.setValue(0);
      };
    } else {
      r1.setValue(0); r2.setValue(0); r3.setValue(0);
    }
  }, [isSpeaking]);

  // Each ring: starts at image size, expands to 1.7× while fading out
  const ringStyle = (anim, color) => ({
    position: "absolute",
    width:  size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2.5,
    borderColor: color,
    opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.85, 0] }),
    transform: [{
      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.75] }),
    }],
  });

  return (
    // transparent — no background, no box
    <View style={{ width: size + ms(70), height: size + ms(70), alignItems: "center", justifyContent: "center" }}>

      {/* ripple rings — only visible while speaking */}
      <Animated.View pointerEvents="none" style={ringStyle(r1, RIPPLE_COLORS[0])} />
      <Animated.View pointerEvents="none" style={ringStyle(r2, RIPPLE_COLORS[1])} />
      <Animated.View pointerEvents="none" style={ringStyle(r3, RIPPLE_COLORS[2])} />

      {/* profile image */}
      <View style={{
        width: size, height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: "#2A1550",
        borderWidth: 2.5,
        borderColor: isSpeaking ? "#A855F7" : "rgba(120,40,200,0.35)",
      }}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="person" size={size * 0.38} color="rgba(255,255,255,0.4)" />
          </View>
        )}
      </View>

      {/* online dot */}
      {showOnline && (
        <View style={{
          position: "absolute",
          bottom: ms(18), right: ms(16),
          width: ms(14), height: ms(14),
          borderRadius: ms(7),
          backgroundColor: "#00BB55",
          borderWidth: 2, borderColor: "#FFF",
        }} />
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

const LiveRoomScreen = ({ route, navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const { roomId } = route.params;
  const insets = useSafeAreaInsets();

  // ── Seat size (fixed small) ────────────────────────────────────────────────
  const SEAT_SIZE = BASE_SEAT_SIZE * 0.65;

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
  const [activeCommentParticles, setActiveCommentParticles] = useState([]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [vipLevelCommentStyles, setVipLevelCommentStyles] = useState({});

  // ── Join animation (VIP entrance) ────────────────────────────────────────────
  const [joinAnimationUser, setJoinAnimationUser] = useState(null);
  const [vipJoinAnimationUrls, setVipJoinAnimationUrls] = useState({});
  // Full VIP level metadata keyed by level number
  const [vipLevelData, setVipLevelData] = useState({});

  // ── Management ───────────────────────────────────────────────────────────────
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showHandRaiseList, setShowHandRaiseList] = useState(false);
  const [seatRequests, setSeatRequests] = useState([]);

  // ── Gift seat selection ──────────────────────────────────────────────────────
  // Set of userIds of occupied seats selected as gift targets
  const [selectedGiftSeats, setSelectedGiftSeats] = useState(new Set());

  // ── Viewers modal (eye icon) ─────────────────────────────────────────────────
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [userCoinsInRoom, setUserCoinsInRoom] = useState({}); // userId -> total coins sent

  // ── Comment area top offset (measured below seat grid) ────────────────────────
  const [commentAreaTop, setCommentAreaTop] = useState(0);

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

  // Fixed comment area top — always below header + typical 2-row seat grid, never shifts with seat count
  useEffect(() => {
    setCommentAreaTop(insets.top + ms(190));
  }, [insets.top]);

  // Sync isHandRaised with server data so it survives reconnects / fetchRoomData
  useEffect(() => {
    if (!room || !userInfo?._id) return;
    const inHandRaised = (room.handRaised || []).some(
      (h) => (h.user?._id || h.user) === userInfo._id,
    );
    setIsHandRaised(inHandRaised);
  }, [room]);

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

  const playGiftSound = (gift) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    // Only play generic sound if the gift doesn't have its own custom sound
    if (!gift?.soundUrl) {
      SoundService.play("gift_receive");
    }
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
      // Fetch base VIP styles (color, shape, border) from existing endpoint
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
          imageUrl: level?.imageUrl || null,
          nameAr: level?.nameAr || null,
          commentTextColor: typeof level?.commentTextColor === "string" && level.commentTextColor.trim()
            ? level.commentTextColor.trim()
            : "",
          profileFrameLottieUrl: level?.profileFrameLottieUrl || null,
          badgeImageUrl: level?.badgeImageUrl || null,
        };

        return acc;
      }, {});

      // Also fetch live engagement VIP levels for Lottie frame and join animation URLs
      try {
        const leRes = await axios.get(`${BASE_URL}/live-engagement/vip-levels`);
        const leLevels = Array.isArray(leRes.data?.levels)
          ? leRes.data.levels
          : [];
        const joinUrls = {};
        leLevels.forEach((leLevel) => {
          const lvl = Number(leLevel?.level);
          if (lvl <= 0) return;
          if (leLevel?.commentFrameLottieUrl) {
            if (commentStyles[lvl]) {
              commentStyles[lvl].commentFrameLottieUrl =
                leLevel.commentFrameLottieUrl;
            }
          }
          if (leLevel?.commentTextColor && commentStyles[lvl]) {
            commentStyles[lvl].commentTextColor = leLevel.commentTextColor;
          }
          if (leLevel?.profileFrameLottieUrl && commentStyles[lvl]) {
            commentStyles[lvl].profileFrameLottieUrl = leLevel.profileFrameLottieUrl;
          }
          if (leLevel?.badgeImageUrl && commentStyles[lvl]) {
            commentStyles[lvl].badgeImageUrl = leLevel.badgeImageUrl;
          }
          if (leLevel?.joinAnimationLottieUrl) {
            joinUrls[lvl] = leLevel.joinAnimationLottieUrl;
          }
        });
        setVipJoinAnimationUrls(joinUrls);
      } catch (_) {
        // live-engagement endpoint may not have data yet — silently ignore
      }

      setVipLevelCommentStyles(commentStyles);

      // Build full level map for join animations / sound / specialJoinText
      const levelDataMap = {};
      levels.forEach((level) => {
        const n = Number(level?.level);
        if (n > 0) levelDataMap[n] = level;
      });
      setVipLevelData(levelDataMap);
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

  const triggerCommentParticles = (gift) => {
    const count = gift?.commentParticleCount ?? 8;
    const type  = gift?.commentParticleType || "hearts";
    if (!count || type === "none") return;
    const burstId = `burst-${Date.now()}-${Math.random()}`;
    setActiveCommentParticles((prev) => [...prev, { id: burstId, gift }]);
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
      // Hosts/speakers join with mic live; audience is muted
      engine.muteLocalAudioStream(!isHostOrSpeaker);
      // Sync React state to match actual Agora mute state
      setIsMuted(!isHostOrSpeaker);
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

    socket.on("liveroom:user_joined", ({ user }) => {
      fetchRoomData();
      // Show join banner for every user (VIP or not) except ourselves
      if (user && user._id !== userInfo?._id) {
        setJoinAnimationUser(user);
        SoundService.play("join");
      }
    });
    socket.on("liveroom:agora_uid", ({ userId, agoraUid }) => {
      agoraUidMapRef.current[agoraUid] = userId;
    });
    socket.on("liveroom:speaker_added", ({ user }) => {
      fetchRoomData();
      if (user._id === userInfo._id) {
        Alert.alert("✅", "أصبحت متحدثاً الآن!");
        // Promote to broadcaster and unmute — do NOT use updateAgoraRole here
        // because it reads the stale isMuted closure value and would re-mute us.
        agoraEngineRef.current?.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        agoraEngineRef.current?.muteLocalAudioStream(false);
        setIsMuted(false);
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

    // Host force-mutes or force-unmutes this user
    socket.on("liveroom:force_mute", ({ targetUserId, mute }) => {
      if (targetUserId !== userInfo._id) return;
      agoraEngineRef.current?.muteLocalAudioStream(mute);
      setIsMuted(mute);
      // Brief feedback so the speaker knows
      if (mute) {
        SoundService.play("mic_off");
      } else {
        SoundService.play("mic_on");
      }
    });
    socket.on("liveroom:mute_toggled", fetchRoomData);
    socket.on(
      "liveroom:hand_raised",
      ({ userId: raisedUserId, user: raisedUser }) => {
        fetchRoomData();
        // Notify host/mod — they can also tap the ✋ badge to see all requests
        const isModNow = room?.moderators?.some(
          (m) => (m.user?._id || m.user) === userInfo._id,
        );
        if ((isHostRef.current || isModNow) && raisedUserId !== userInfo._id) {
          Alert.alert(
            "✋ طلب جلوس",
            `${raisedUser?.username || "مستخدم"} يطلب الصعود على المقعد`,
            [
              {
                text: "رفض",
                style: "destructive",
                onPress: async () => {
                  try {
                    await axios.post(
                      `${BASE_URL}/live-rooms/${roomId}/reject-hand/${raisedUserId}`,
                      {},
                      { headers: { Authorization: `Bearer ${userToken}` } },
                    );
                    socketRef.current?.emit("liveroom:reject_hand", {
                      roomId,
                      userId: raisedUserId,
                    });
                    fetchRoomData();
                  } catch (_) {}
                },
              },
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
                    Alert.alert("خطأ", e?.response?.data?.message || "فشل إضافة المتحدث");
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
      // Skip if this is our own gift — we already showed it locally in handleSendGiftRequest
      if (sender?._id && userInfo?._id && sender._id === userInfo._id) {
        // Still track coins for the viewers modal
        setUserCoinsInRoom((prev) => ({
          ...prev,
          [sender._id]: (prev[sender._id] || 0) + (gift.price || 0) * (gift.quantity || 1),
        }));
        return;
      }
      const id = `${Date.now()}${Math.random()}`;
      giftsReceivedRef.current += 1;
      playGiftSound(gift);
      setActiveGifts((prev) => [...prev, { id, gift, sender }]);
      appendLiveMessage({
        id,
        clientMessageId: id,
        user: sender,
        message: `أرسل هدية ${gift.nameAr || gift.name}!`,
        isSystem: true,
        giftUrl: gift.thumbnailUrl,
      });
      triggerCommentParticles(gift);
      // Track coins per sender for the viewers modal
      if (sender?._id) {
        setUserCoinsInRoom((prev) => ({
          ...prev,
          [sender._id]: (prev[sender._id] || 0) + (gift.price || 0) * (gift.quantity || 1),
        }));
      }
    });
    socket.on("liveroom:kicked", ({ userId }) => {
      if (userId === userInfo._id) {
        Alert.alert("تم الطرد", "تم إزالتك من الغرفة.", [
          { text: "حسناً", onPress: () => navigation.goBack() },
        ]);
      }
    });
    socket.on("liveroom:settings_updated", fetchRoomData);

    // --- SEAT REQUEST FLOW ---
    // Incoming seat request (shown to host/mods)
    socket.on("liveroom:seat_request_received", ({ user }) => {
      const isHost = room?.host?._id === userInfo?._id || isHostRef.current;
      const isMod  = (room?.moderators || []).some((m) => (m.user?._id || m.user) === userInfo?._id);
      if (!isHost && !isMod) return;
      // Show alert immediately; also store in seatRequests list
      setSeatRequests((prev) => {
        if (prev.some((r) => r.user?._id === user?._id)) return prev;
        return [...prev, { user, timestamp: new Date().toISOString() }];
      });
      Alert.alert(
        "\uD83D\uDCCC طلب جلوس",
        `${user?.username || "مستخدم"} يطلب الجلوس على مقعد. هل توافق؟`,
        [
          {
            text: "رفض",
            style: "cancel",
            onPress: () => {
              setSeatRequests((prev) => prev.filter((r) => r.user?._id !== user?._id));
              socketRef.current?.emit("liveroom:seat_request_rejected", {
                roomId,
                userId: user?._id,
              });
            },
          },
          {
            text: "قبول ✅",
            onPress: async () => {
              setSeatRequests((prev) => prev.filter((r) => r.user?._id !== user?._id));
              try {
                await axios.post(
                  `${BASE_URL}/live-rooms/${roomId}/make-speaker/${user._id}`,
                  {},
                  { headers: { Authorization: `Bearer ${userToken}` } },
                );
                socketRef.current?.emit("liveroom:seat_request_approved", {
                  roomId,
                  userId: user._id,
                  approvedBy: { _id: userInfo._id, username: userInfo.username },
                });
                fetchRoomData();
              } catch (e) {
                Alert.alert("خطأ", e?.response?.data?.message || "فشل قبول الطلب");
              }
            },
          },
        ],
      );
    });

    // Host approved MY seat request
    socket.on("liveroom:seat_request_approved", ({ userId, approvedBy }) => {
      if (userId !== userInfo._id) return;
      Alert.alert(
        "\u2705 تمت الموافقة",
        `وافق ${approvedBy?.username || "المضيف"} على طلبك. أنت الآن على المقعد!`,
        [{ text: "حسناً" }],
      );
      fetchRoomData();
    });

    // Host rejected MY seat request
    socket.on("liveroom:seat_request_rejected", ({ userId }) => {
      if (userId !== userInfo._id) return;
      Alert.alert("\u274C رُفض الطلب", "رفض المضيف طلب الجلوس.", [{ text: "حسناً" }]);
    });

    // Host invited this user to a seat
    socket.on("liveroom:seat_invite_received", ({ userId, invitedBy }) => {
      if (userId === userInfo._id) {
        Alert.alert(
          "💺 دعوة للمقعد",
          `${invitedBy?.username || "صاحب الغرفة"} دعاك للجلوس على المقعد!`,
          [
            { text: "رفض", style: "cancel" },
            {
              text: "قبول",
              onPress: async () => {
                try {
                  await axios.post(
                    `${BASE_URL}/live-rooms/${roomId}/make-speaker/${userId}`,
                    {},
                    { headers: { Authorization: `Bearer ${userToken}` } },
                  );
                  socketRef.current?.emit("liveroom:make_speaker", {
                    roomId,
                    userId,
                    user: userInfo,
                  });
                  fetchRoomData();
                } catch (e) {
                  Alert.alert("خطأ", e?.response?.data?.message || "فشل قبول الدعوة");
                }
              },
            },
          ],
        );
      }
    });

    // Hand raise was rejected by host/mod
    socket.on("liveroom:hand_rejected", ({ userId }) => {
      if (userId === userInfo._id) {
        setIsHandRaised(false);
        Alert.alert("ℹ️", "تم رفض طلب الجلوس");
      }
      fetchRoomData();
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
          activeBadge: freshUser.activeBadge || userInfo?.activeBadge || null,
        }
      : {
          ...userInfo,
          vipLevel: userInfo?.vipLevel ?? 0,
          activeBadge: userInfo?.activeBadge || null,
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
    // If seats are selected → send to each seat occupant; else fall back to host
    const targetIds =
      selectedGiftSeats.size > 0
        ? Array.from(selectedGiftSeats)
        : room?.host
          ? [room.host._id]
          : [];

    if (targetIds.length === 0) {
      Alert.alert("خطأ", "لا يوجد مستلم");
      return;
    }

    try {
      const results = await Promise.all(
        targetIds.map((receiverId) =>
          axios.post(
            `${BASE_URL}/gifts/send`,
            {
              giftId: gift._id,
              receiverId,
              context: "live_room",
              contextId: roomId,
              quantity,
            },
            { headers: { Authorization: `Bearer ${userToken}` } },
          ),
        ),
      );

      const lastSuccess = results.find((r) => r.data?.success);
      if (lastSuccess) {
        if (lastSuccess.data.senderBalance !== undefined)
          setUserBalance(lastSuccess.data.senderBalance);
        // Play generic send sound only if the gift doesn't have its own custom sound
        if (!gift.soundUrl) {
          SoundService.play("gift_send");
        }
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});

        // Show the gift animation immediately on the sender's own screen
        const localId = `local_${Date.now()}${Math.random()}`;
        giftsReceivedRef.current += 1;
        setActiveGifts((prev) => [
          ...prev,
          { id: localId, gift: { ...gift, quantity }, sender: userInfo },
        ]);
        // Add the gift message to live chat
        appendLiveMessage({
          id: localId,
          clientMessageId: localId,
          user: userInfo,
          message: `أرسل هدية ${gift.nameAr || gift.name}!`,
          isSystem: true,
          giftUrl: gift.thumbnailUrl,
        });
        triggerCommentParticles(gift);

        // Emit socket event so OTHER viewers also see the gift
        socketRef.current?.emit("liveroom:send_gift", {
          roomId,
          gift: { ...gift, quantity },
          sender: userInfo,
        });
        setShowGiftModal(false);
        setSelectedGiftSeats(new Set());
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
    const isMod = room?.moderators?.some(
      (m) => (m.user?._id || m.user) === currentUser?._id,
    );
    // handRaised is a top-level array in the room model
    const raisers = room?.handRaised || [];
    return (
      <View style={[styles.header, { paddingTop: insets.top + ms(14) }]}>
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
        {/* Center spacer — host avatar is rendered absolutely behind this row */}
        <View style={{ flex: 1 }} />
        {/* Right */}
        <View style={styles.headerRight}>
          {/* Hand-raise requests badge (host/mod only) */}
          {(isHost || isMod) && raisers.length > 0 && (
            <TouchableOpacity
              style={styles.handBadgePill}
              onPress={() => setShowHandRaiseList(true)}
            >
              <Text style={{ fontSize: 12 }}>✋</Text>
              <Text style={styles.handBadgeCount}>{raisers.length}</Text>
            </TouchableOpacity>
          )}
          {/* Eye icon – shows all viewers (host/mod only) */}
          {(isHost || isMod) && (
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowViewersModal(true)}
            >
              <Ionicons name="eye" size={18} color="#00F2EA" />
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
    const isHostSpeaking = host && speakingUserIds.has(host._id);
    return (
      <View style={styles.hostSection}>
        <HostAvatarFrame
          imageUrl={host?.profileImage || host?.avatar || null}
          size={HOST_SIZE}
          isSpeaking={isHostSpeaking}
          showOnline={joinedAgora}
        />
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

    const isHostSeat = room?.host?._id === userInfo?._id;
    const isSpeakerAlready = room?.speakers?.some((s) => s.user?._id === userInfo?._id);
    const isGiftSelected = user && selectedGiftSeats.has(user._id);

    const isHostOrMod =
      room?.host?._id === userInfo?._id ||
      isHostRef.current ||
      (room?.moderators || []).some((m) => (m.user?._id || m.user) === userInfo?._id);

    // Empty seat: listener can tap to send a seat JOIN REQUEST to the host
    const canRequestSeat = !user && !isHostSeat && !isSpeakerAlready;
    // Show a pending indicator on empty seats when this user has a pending request
    const hasPendingRequest = canRequestSeat && seatRequests.some(
      (r) => r.user?._id === userInfo?._id
    );

    const leaveSeat = async () => {
      try {
        await axios.post(
          `${BASE_URL}/live-rooms/${roomId}/remove-speaker`,
          { userId: userInfo._id },
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        socketRef.current?.emit("liveroom:speaker_removed", {
          roomId,
          userId: userInfo._id,
        });
        updateAgoraRole(false);
        setIsMuted(true);
        agoraEngineRef.current?.muteLocalAudioStream(true);
        fetchRoomData();
      } catch (e) {
        Alert.alert("خطأ", e?.response?.data?.message || "فشل مغادرة المقعد");
      }
    };

    const handleSeatLongPress = () => {
      if (!isMe) return;
      playTap();
      Alert.alert(
        "💺 مقعدك",
        "اختر ما تريد فعله",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "الانسحاب من المقعد والمشاهدة",
            onPress: async () => {
              await leaveSeat();
            },
          },
          {
            text: "الانسحاب والخروج من الغرفة",
            style: "destructive",
            onPress: async () => {
              await leaveSeat();
              await leaveRoomBackend();
              navigation.goBack();
            },
          },
        ],
      );
    };

    const handleSeatPress = () => {
      if (isMe) {
        // Regular tap on own seat does nothing — use long press
      } else if (user && isHostOrMod) {
        // Occupied seat — host/mod can kick or send gift
        playTap();
        const buttons = [
          { text: "إلغاء", style: "cancel" },
          {
            text: "🎁 إرسال هدية",
            onPress: () => {
              setSelectedGiftSeats((prev) => {
                const next = new Set(prev);
                next.add(user._id);
                return next;
              });
            },
          },
          {
            text: "❌ إزالة من المقعد",
            style: "destructive",
            onPress: async () => {
              try {
                await axios.post(
                  `${BASE_URL}/live-rooms/${roomId}/remove-speaker`,
                  { userId: user._id },
                  { headers: { Authorization: `Bearer ${userToken}` } },
                );
                socketRef.current?.emit("liveroom:remove_speaker", {
                  roomId,
                  userId: user._id,
                });
                fetchRoomData();
              } catch (e) {
                Alert.alert("خطأ", e?.response?.data?.message || "فشل الإزالة");
              }
            },
          },
        ];
        Alert.alert(user.username, "اختر الإجراء", buttons);
      } else if (user && !isMe) {
        // Non-host viewer taps an occupied seat — just gift selection
        playTap();
        setSelectedGiftSeats((prev) => {
          const next = new Set(prev);
          if (next.has(user._id)) {
            next.delete(user._id);
          } else {
            next.add(user._id);
          }
          return next;
        });
      } else if (canRequestSeat) {
        playTap();
        const requester = freshUser || userInfo;
        socketRef.current?.emit("liveroom:seat_request", {
          roomId,
          user: {
            _id: requester._id,
            username: requester.username,
            profileImage: requester.profileImage || null,
          },
        });
        Alert.alert("💺 طلب جلوس", "تم إرسال طلبك إلى المضيف. انتظر الموافقة.");
      }
    };

    const isInteractive = isMe || !!user || canRequestSeat;
    const SeatWrapper = isInteractive ? TouchableOpacity : View;
    const wrapperProps = isInteractive
      ? {
          onPress: handleSeatPress,
          onLongPress: isMe ? handleSeatLongPress : undefined,
          delayLongPress: 400,
          activeOpacity: 0.7,
        }
      : {};

    return (
      <SeatWrapper style={[styles.seatWrap, { width: SEAT_SIZE + ms(14) }]} {...wrapperProps}>
        <View
          style={[
            styles.seatCircle,
            { width: SEAT_SIZE, height: SEAT_SIZE, borderRadius: SEAT_SIZE / 2 },
            !user && styles.seatEmpty,
            !speaker?.isMuted && user && styles.seatActive,
            isSpeaking && styles.seatSpeaking,
            isGiftSelected && styles.seatGiftSelected,
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
          ) : hasPendingRequest ? (
            <Ionicons name="time-outline" size={18} color="rgba(255,200,0,0.8)" />
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
          {/* Speaking sound-wave indicator */}
          {isSpeaking && !speaker?.isMuted && (
            <View style={styles.seatSoundWave} pointerEvents="none">
              <SoundWave active={true} color="#00F2EA" size="small" />
            </View>
          )}
          {/* Gift selection checkmark */}
          {isGiftSelected && (
            <View style={styles.giftCheckDot}>
              <Ionicons name="checkmark" size={9} color="#FFF" />
            </View>
          )}
        </View>
        <Text style={styles.seatLabel} numberOfLines={1}>
          {user ? user.username : `${index + 1}`}
        </Text>
        {user?.vipLevel > 0 && <VipBadge level={user.vipLevel} size="small" />}
      </SeatWrapper>
    );
  };

  const SeatGrid = () => {
    const hostId = room?.host?._id;
    // Filter out the host from speakers so they don’t appear in seat grid
    const speakers = (room?.speakers || []).filter(
      (s) => s.user._id !== hostId,
    );
    const maxSeats = Math.max(1, Math.min(12, room?.maxSpeakers ?? 8));
    const combined = speakers;
    const slots = Array(maxSeats).fill(null).map((_, i) => combined[i] || null);
    const rows = [];
    for (let r = 0; r < Math.ceil(maxSeats / 4); r++) {
      rows.push(slots.slice(r * 4, r * 4 + 4));
    }
    return (
      <View style={styles.seatGrid}>
        {rows.map((row, r) => (
          <View key={r} style={styles.seatRow}>
            {row.map((speaker, i) => (
              <Seat key={r * 4 + i} index={r * 4 + i} speaker={speaker} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  // Gift target selection bar — shown below seat grid when seats are selected
  const GiftTargetBar = () => {
    if (selectedGiftSeats.size === 0) return null;

    // Build list of selected users from speakers + host
    const allParticipants = [
      ...(room?.speakers || []).map((s) => s.user),
    ].filter(Boolean);

    const selectedUsers = allParticipants.filter((u) =>
      selectedGiftSeats.has(u._id),
    );

    return (
      <View style={styles.giftTargetBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center", gap: ms(6), paddingHorizontal: ms(4) }}
        >
          <Text style={styles.giftTargetLabel}>أرسل لـ:</Text>
          {selectedUsers.map((u) => (
            <TouchableOpacity
              key={u._id}
              onPress={() =>
                setSelectedGiftSeats((prev) => {
                  const next = new Set(prev);
                  next.delete(u._id);
                  return next;
                })
              }
              style={styles.giftTargetChip}
            >
              {u.profileImage ? (
                <Image source={{ uri: u.profileImage }} style={styles.giftTargetAvatar} />
              ) : (
                <View style={[styles.giftTargetAvatar, { backgroundColor: "rgba(160,32,240,0.4)", justifyContent: "center", alignItems: "center" }]}>
                  <Text style={{ color: "#FFF", fontSize: fs(10), fontWeight: "bold" }}>
                    {(u.username || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.giftTargetName} numberOfLines={1}>{u.username}</Text>
              <Ionicons name="close-circle" size={12} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          ))}
          {/* Select all */}
          <TouchableOpacity
            style={styles.giftTargetSelectAll}
            onPress={() => {
              const allIds = allParticipants
                .filter((u) => u._id !== userInfo?._id)
                .map((u) => u._id);
              setSelectedGiftSeats(new Set(allIds));
            }}
          >
            <Text style={styles.giftTargetSelectAllText}>الكل</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.giftTargetClear}
            onPress={() => setSelectedGiftSeats(new Set())}
          >
            <Ionicons name="close" size={13} color="#FFF" />
          </TouchableOpacity>
        </ScrollView>
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

  // handRaised is a top-level array in the room model (not in speakers)
  const raisers = room?.handRaised || [];
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
          ✋ طلبات الجلوس ({raisers.length})
        </Text>
        <ScrollView>
          {raisers.length === 0 && (
            <Text style={{ color: "#999", textAlign: "center", padding: 20 }}>
              لا توجد طلبات
            </Text>
          )}
          {raisers.map((r) => {
            const u = r.user || r;
            const uid = u._id || u;
            const username = u.username || "مستخدم";
            const profileImg = u.profileImage || u.avatar || null;
            return (
              <View key={uid} style={styles.raiserRow}>
                {profileImg ? (
                  <Image source={{ uri: profileImg }} style={styles.raiserAvatar} />
                ) : (
                  <View style={[styles.raiserAvatar, { backgroundColor: "rgba(160,32,240,0.4)", justifyContent: "center", alignItems: "center" }]}>
                    <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                      {username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.raiserName}>{username}</Text>
                {/* Accept */}
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={async () => {
                    try {
                      await axios.post(
                        BASE_URL + "/api/live-rooms/" + roomId + "/make-speaker/" + uid,
                        {},
                        { headers: { Authorization: "Bearer " + userToken } }
                      );
                      fetchRoomData();
                      if (socketRef.current) {
                        socketRef.current.emit("liveroom:make_speaker", {
                          roomId,
                          userId: uid,
                          user: u
                        });
                      }
                    } catch (e) {
                      Alert.alert("خطأ", e?.response?.data?.message || "فشل قبول الطلب");
                    }
                  }}
                >
                  <Text style={styles.approveBtnText}>قبول</Text>
                </TouchableOpacity>
                {/* Reject */}
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={async () => {
                    try {
                      await axios.post(
                        BASE_URL + "/api/live-rooms/" + roomId + "/reject-hand/" + uid,
                        {},
                        { headers: { Authorization: "Bearer " + userToken } }
                      );
                      fetchRoomData();
                      if (socketRef.current) {
                        socketRef.current.emit("liveroom:reject_hand", {
                          roomId,
                          userId: uid
                        });
                      }
                    } catch (_) {}
                  }}
                >
                  <Text style={styles.rejectBtnText}>رفض</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );

  // ─── VIEWERS MODAL (eye icon) ─────────────────────────────────────────────────

  const viewersModal = (() => {
    const isHost = room?.host?._id === userInfo?._id;
    const isMod = room?.moderators?.some(
      (m) => (m.user?._id || m.user) === userInfo?._id,
    );
    const canManage = isHost || isMod;

    // Combine all participants: listeners + speakers (excluding host)
    const allViewers = [
      ...(room?.listeners || []).map((l) => l.user).filter(Boolean),
      ...(room?.speakers || [])
        .map((s) => s.user)
        .filter((u) => u && u._id !== room?.host?._id),
    ];
    // Deduplicate
    const seen = new Set();
    const uniqueViewers = allViewers.filter((u) => {
      if (seen.has(u._id)) return false;
      seen.add(u._id);
      return true;
    });

    return (
      <Modal
        visible={showViewersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewersModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowViewersModal(false)}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20, maxHeight: height * 0.7 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            👁 المتفرجون ({uniqueViewers.length})
          </Text>
          <ScrollView>
            {uniqueViewers.length === 0 && (
              <Text style={{ color: "#999", textAlign: "center", padding: 20 }}>
                لا يوجد متفرجون الآن
              </Text>
            )}
            {uniqueViewers.map((u) => {
              const coinsFromUser = userCoinsInRoom[u._id] || 0;
              const isSpeaker = room?.speakers?.some((s) => s.user?._id === u._id);
              return (
                <View key={u._id} style={styles.viewerRow}>
                  {u.profileImage ? (
                    <Image source={{ uri: u.profileImage }} style={styles.viewerAvatar} />
                  ) : (
                    <View style={[styles.viewerAvatar, { backgroundColor: "rgba(160,32,240,0.35)", justifyContent: "center", alignItems: "center" }]}>
                      <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: fs(14) }}>
                        {(u.username || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.viewerName}>{u.username || "—"}</Text>
                    {coinsFromUser > 0 && (
                      <View style={styles.viewerCoinsRow}>
                        <Ionicons name="logo-bitcoin" size={11} color="#FFD700" />
                        <Text style={styles.viewerCoinsText}>{coinsFromUser}</Text>
                      </View>
                    )}
                  </View>
                  {/* Invite to seat (host/mod only, user not already a speaker) */}
                  {canManage && !isSpeaker && (
                    <TouchableOpacity
                      style={styles.inviteBtn}
                      onPress={async () => {
                        try {
                          await axios.post(
                            BASE_URL + "/live-rooms/" + roomId + "/make-speaker/" + u._id,
                            {},
                            { headers: { Authorization: "Bearer " + userToken } }
                          );
                          if (socketRef.current) {
                            socketRef.current.emit("liveroom:seat_request_approved", {
                              roomId,
                              userId: u._id,
                              approvedBy: { _id: userInfo._id, username: userInfo.username }
                            });
                          }
                          fetchRoomData();
                        } catch (e) {
                          Alert.alert("خطأ", e?.response?.data?.message || "فشل الدعوة");
                        }
                      }}
                    >
                      <Text style={styles.inviteBtnText}>دعوة 💺</Text>
                    </TouchableOpacity>
                  )}
                  {isSpeaker && (
                    <View style={styles.speakerBadge}>
                      <Text style={styles.speakerBadgeText}>متحدث</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    );
  })();

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
    if (showInput) {
      inputRef.current?.focus();
    }
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
            paddingBottom: keyboardOffset > 0 ? 8 : insets.bottom + 8,
          },
        ]}
      >
        {/* User avatar */}
        {userInfo?.profileImage ? (
          <Image
            source={{ uri: userInfo.profileImage }}
            style={styles.chatAvatar}
          />
        ) : (
          <View style={styles.chatAvatarFallback}>
            <Text style={styles.chatAvatarInitial}>
              {(userInfo?.username || "أ")[0]}
            </Text>
          </View>
        )}

        {/* Input pill */}
        <View style={styles.chatFieldWrap}>
          <TextInput
            ref={inputRef}
            autoFocus
            value={inputText}
            onChangeText={setInputText}
            placeholder="اكتب تعليقاً..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.chatField}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline={false}
            autoCorrect={false}
            spellCheck={false}
            maxLength={200}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          onPress={() => { playTap(); handleSendMessage(); }}
          style={[styles.chatSendBtn, !inputText.trim() && styles.chatSendBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={17} color="#FFF" />
        </TouchableOpacity>

        {/* Close */}
        <TouchableOpacity
          onPress={handleCloseInput}
          style={styles.chatCloseBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.55)" />
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

      {/* Large centered host avatar — clipped to header height so it never bleeds into seats */}
      {room?.host && (room.host.profileImage || room.host.avatar) && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + ms(108),
            overflow: "hidden",
            zIndex: 50,
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: ms(6),
          }}
        >
          <Image
            source={{ uri: room.host.profileImage || room.host.avatar }}
            style={{
              width: ms(88),
              height: ms(88),
              borderRadius: ms(44),
              borderWidth: 3,
              borderColor: "rgba(168, 85, 247, 0.9)",
            }}
            resizeMode="cover"
          />
          <Text
            style={[styles.hostTopName, { position: "absolute", bottom: ms(4) }]}
            numberOfLines={1}
          >
            {room.host.username}
          </Text>
        </View>
      )}

      {/* Main content */}
      <View style={{ flex: 1, zIndex: 100 }}>
        {Header()}

        {/* Cover banner removed — background image fills full screen */}

        {HostSection()}
        {SeatGrid()}
        {GiftTargetBar()}
      </View>

      {/* VIP join animation banner */}
      {joinAnimationUser && (() => {
          const vipLvl = Number(joinAnimationUser?.vipLevel || 0);
          const lvlData = vipLevelData[vipLvl] || null;
          return (
            <JoinAnimation
              user={joinAnimationUser}
              joinAnimationUrl={vipJoinAnimationUrls[vipLvl] || null}
              joinSoundUrl={lvlData?.joinSoundUrl || null}
              specialJoinText={lvlData?.specialJoinText || null}
              vipTier={lvlData ? { color: lvlData.color } : null}
              onDone={() => setJoinAnimationUser(null)}
            />
          );
        })()}

      {/* Mini music bar */}
      {MiniMusicBar()}

      {/* Floating comments — always visible, shifts up when keyboard is open */}

      {/* Bottom action bar */}
      {!showInput && BottomBar()}

      {/* Chat input — always mounted, shown/hidden via display prop */}
      {chatInputBar}

      {/* FloatingComments rendered before gifts so gifts paint above comments */}
      <FloatingComments
        comments={messages}
        bottomOffset={
          showInput
            ? (keyboardOffset > 0 ? keyboardOffset : insets.bottom) + ms(62)
            : insets.bottom + ms(70)
        }
        topOffset={commentAreaTop}
        vipLevelStyles={vipLevelCommentStyles}
      />

      {/* Animated gifts — rendered after FloatingComments so they appear above */}
      {activeGifts.map((d) => (
        <AnimatedGift
          key={d.id}
          gift={d.gift}
          sender={d.sender}
          containerTop={commentAreaTop > 0 ? commentAreaTop : undefined}
          onComplete={() =>
            setActiveGifts((p) => p.filter((g) => g.id !== d.id))
          }
        />
      ))}

      {/* Comment particle bursts on gift send */}
      {activeCommentParticles.map((burst) => (
        <CommentParticles
          key={burst.id}
          gift={burst.gift}
          anchorY={insets.bottom + ms(80)}
          onDone={() => setActiveCommentParticles((p) => p.filter((b) => b.id !== burst.id))}
        />
      ))}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {musicPlayerModal}
      {audioPanelModal}
      {handRaiseModal}
      {viewersModal}

      {summaryModal}

      <RoomManagementModal
        visible={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        room={room}
        roomId={roomId}
        isHost={room?.host?._id === userInfo?._id}
        userToken={userToken}
        currentUserId={userInfo?._id}
        fetchRoomData={fetchRoomData}
        socketRef={socketRef}
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
  currencyBar: { display: "none" },
  currencyItem: {},
  currencyText: {},

  // ── Host ─────────────────────────────────────────────────────────────────────
  hostSection: { display: "none" },
  hostTopCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  hostTopName: {
    color: "#FFF",
    fontSize: fs(11),
    fontWeight: "700",
    marginTop: ms(-6),
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: ms(4),
  },
  hostGlowHalo: {
    position: "absolute",
    width: HOST_SIZE * 1.35 + ms(28),
    height: HOST_SIZE * 1.35 + ms(28),
    borderRadius: (HOST_SIZE * 1.35 + ms(28)) / 2,
    backgroundColor: "rgba(160,32,240,0.28)",
    overflow: "hidden",
    shadowColor: "#A020F0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: ms(22),
    elevation: 18,
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
  seatSizeControl: { display: "none" },
  seatSizeBtn: {},
  seatSizeBtnActive: {},
  seatSizeBtnText: {},
  seatGrid: {
    paddingHorizontal: ms(4),
    gap: ms(3),
    marginTop: ms(118),
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: ms(14),
    paddingVertical: ms(6),
    marginHorizontal: ms(6),
  },
  seatRow: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center" },
  seatWrap: { alignItems: "center", width: BASE_SEAT_SIZE + ms(14) },
  seatCircle: {
    width: BASE_SEAT_SIZE,
    height: BASE_SEAT_SIZE,
    borderRadius: BASE_SEAT_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  seatEmpty: {
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  seatActive: { borderColor: "#00CC55", borderWidth: 2.5 },
  seatSpeaking: {
    borderColor: "#00F2EA",
    borderWidth: 3,
    shadowColor: "#00F2EA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  seatSoundWave: {
    position: "absolute",
    top: -ms(13),
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hostSoundWave: {
    position: "absolute",
    bottom: -ms(12),
    left: 0,
    right: 0,
    alignItems: "center",
  },
  seatFrameWrap: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  seatNum: {
    position: "absolute",
    bottom: ms(-2),
    right: ms(-2),
    backgroundColor: "rgba(254,44,85,0.82)",
    paddingHorizontal: ms(3.5),
    paddingVertical: ms(1),
    borderRadius: ms(6),
    minWidth: ms(14),
    alignItems: "center",
  },
  seatNumText: { color: "#FFF", fontSize: fs(7.5), fontWeight: "700" },
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
    color: "rgba(255,255,255,0.88)",
    fontSize: fs(7.5),
    marginTop: ms(2),
    fontWeight: "500",
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
    zIndex: 200,
    elevation: 10,
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
    backgroundColor: "rgba(6, 0, 22, 0.96)",
    paddingHorizontal: ms(10),
    paddingTop: ms(10),
    paddingBottom: ms(6),
    borderTopWidth: 1,
    borderTopColor: "rgba(160,32,240,0.45)",
    gap: ms(7),
    shadowColor: "#8B00FF",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 300,
  },
  chatAvatar: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    borderWidth: 1.5,
    borderColor: "rgba(160,32,240,0.7)",
    flexShrink: 0,
  },
  chatAvatarFallback: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    borderWidth: 1.5,
    borderColor: "rgba(160,32,240,0.7)",
    backgroundColor: "rgba(160,32,240,0.2)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  chatAvatarInitial: {
    color: "#C084FC",
    fontSize: fs(14),
    fontWeight: "700",
  },
  chatCloseBtn: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  chatFieldWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: ms(22),
    borderWidth: 1.5,
    borderColor: "rgba(160,32,240,0.6)",
    paddingHorizontal: ms(14),
    height: ms(42),
  },
  chatSendBtn: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(21),
    backgroundColor: "#7C3AED",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    shadowColor: "#8B00FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 4,
  },
  chatSendBtnDisabled: {
    backgroundColor: "rgba(124,58,237,0.28)",
    shadowOpacity: 0,
    elevation: 0,
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
    fontSize: fs(15),
    paddingVertical: 0,
    textAlign: "right",
    height: ms(44),
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
  rejectBtn: {
    backgroundColor: "rgba(255,60,60,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,60,60,0.5)",
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(14),
  },
  rejectBtnText: { color: "#FF6666", fontSize: fs(12), fontWeight: "bold" },

  // ── Header eye button ─────────────────────────────────────────────────────────
  eyeBtn: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    backgroundColor: "rgba(0,242,234,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,242,234,0.3)",
  },

  // ── Seat gift selection ───────────────────────────────────────────────────────
  seatGiftSelected: {
    borderColor: "#FFD700",
    borderWidth: 2.5,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  giftCheckDot: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FFD700",
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Gift target bar ───────────────────────────────────────────────────────────
  giftTargetBar: {
    marginHorizontal: ms(6),
    marginTop: ms(6),
    backgroundColor: "rgba(255,215,0,0.1)",
    borderRadius: ms(14),
    paddingVertical: ms(8),
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  giftTargetLabel: {
    color: "#FFD700",
    fontSize: fs(11),
    fontWeight: "700",
    marginRight: ms(4),
  },
  giftTargetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(4),
    backgroundColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.4)",
  },
  giftTargetAvatar: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
  },
  giftTargetName: {
    color: "#FFF",
    fontSize: fs(10),
    maxWidth: ms(60),
  },
  giftTargetSelectAll: {
    backgroundColor: "rgba(160,32,240,0.3)",
    paddingHorizontal: ms(10),
    paddingVertical: ms(5),
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: "rgba(160,32,240,0.5)",
  },
  giftTargetSelectAllText: { color: "#FFF", fontSize: fs(10), fontWeight: "700" },
  giftTargetClear: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: "rgba(255,60,60,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Viewers modal ─────────────────────────────────────────────────────────────
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(12),
    paddingVertical: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  viewerAvatar: {
    width: ms(42),
    height: ms(42),
    borderRadius: ms(21),
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  viewerName: { color: "#FFF", fontSize: fs(13), fontWeight: "600" },
  viewerCoinsRow: { flexDirection: "row", alignItems: "center", gap: ms(3), marginTop: ms(2) },
  viewerCoinsText: { color: "#FFD700", fontSize: fs(10) },
  inviteBtn: {
    backgroundColor: "#A020F0",
    paddingHorizontal: ms(12),
    paddingVertical: ms(6),
    borderRadius: ms(14),
  },
  inviteBtnText: { color: "#FFF", fontSize: fs(11), fontWeight: "700" },
  speakerBadge: {
    backgroundColor: "rgba(0,242,234,0.18)",
    paddingHorizontal: ms(10),
    paddingVertical: ms(4),
    borderRadius: ms(10),
    borderWidth: 1,
    borderColor: "rgba(0,242,234,0.4)",
  },
  speakerBadgeText: { color: "#00F2EA", fontSize: fs(10), fontWeight: "700" },
});

export default LiveRoomScreen;
