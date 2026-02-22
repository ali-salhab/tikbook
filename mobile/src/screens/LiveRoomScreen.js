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
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import Slider from "@react-native-community/slider";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
  MaterialIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import io from "socket.io-client";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";
import { Permission, PermissionsAndroid } from "react-native";

import { BASE_URL, AGORA_APP_ID } from "../config/api";
import { AuthContext } from "../context/AuthContext";
import RoomManagementModal from "../components/RoomManagementModal";
import AnimatedGift from "../components/AnimatedGift";
import FloatingComments from "../components/FloatingComments";
import GiftPanel from "../components/GiftPanel";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";

// Get screen dimensions
const { width, height } = Dimensions.get("window");
const SEAT_SIZE = 60;
const HOST_SIZE = 100;

const SOCKET_URL = BASE_URL.replace("/api", "");

const LiveRoomScreen = ({ route, navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const { roomId } = route.params;
  const insets = useSafeAreaInsets();

  // State
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMuted, setIsMuted] = useState(true); // Default to muted
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  // Gift State for Panel
  const [giftReceiver, setGiftReceiver] = useState(null);

  const [loading, setLoading] = useState(true);
  const [joinedAgora, setJoinedAgora] = useState(false);

  // Chat & Gifts
  const [messages, setMessages] = useState([]);
  const [activeGift, setActiveGift] = useState(null);
  const [activeGifts, setActiveGifts] = useState([]); // Array of { id, gift, sender }
  const [inputText, setInputText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const inputRef = useRef(null);

  // Music State
  const [sound, setSound] = useState(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicPosition, setMusicPosition] = useState(0);

  // Animation Values
  const glowAnim = useRef(new Animated.Value(1)).current;

  // Refs
  const socketRef = useRef(null);
  const agoraEngineRef = useRef(null);

  // ─── EFFECTS ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadCurrentUser();
    loadUserBalance();
    setupRoom();
    startGlowAnimation();

    return () => {
      cleanup();
    };
  }, []);

  const loadCurrentUser = () => {
    if (userInfo) setCurrentUser(userInfo);
  };

  const loadUserBalance = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/wallet`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.data?.balance !== undefined) {
        setUserBalance(response.data.balance);
      }
    } catch (error) {
      console.error("Error loading balance:", error);
      setUserBalance(0);
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
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const setupRoom = async () => {
    await requestPermissions();
    await joinRoomBackend(); // Join via API to get room details
    // setupSocket() called inside joinRoomBackend after room is fetched
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
    }
  };

  const cleanup = async () => {
    await leaveRoomBackend();
    if (socketRef.current) socketRef.current.disconnect();
    if (agoraEngineRef.current) {
      agoraEngineRef.current.leaveChannel();
      agoraEngineRef.current.release();
    }
  };

  // ─── AGORA LOGIC ─────────────────────────────────────────────────────────────

  const initAgora = async (channelName, uid, isHostOrSpeaker) => {
    try {
      if (!AGORA_APP_ID) {
        console.warn("Agora App ID missing");
        return;
      }

      const engine = createAgoraRtcEngine();
      agoraEngineRef.current = engine;

      engine.initialize({ appId: AGORA_APP_ID });
      engine.enableAudio();

      // Set Channel Profile to Live Broadcasting
      engine.setChannelProfile(
        ChannelProfileType.ChannelProfileLiveBroadcasting,
      );

      // Set Client Role
      // Hosts/Speakers are Broadcasters, Listeners are Audience
      const role = isHostOrSpeaker
        ? ClientRoleType.ClientRoleBroadcaster
        : ClientRoleType.ClientRoleAudience;
      engine.setClientRole(role);

      // Listener handles
      engine.addListener("onJoinChannelSuccess", (connection, elapsed) => {
        console.log("Successfully joined Agora channel:", connection.channelId);
        setJoinedAgora(true);
      });

      engine.addListener("onUserJoined", (connection, remoteUid, elapsed) => {
        console.log("Remote user joined:", remoteUid);
      });

      engine.addListener("onUserOffline", (connection, remoteUid, reason) => {
        console.log("Remote user left:", remoteUid);
      });

      // Join Channel
      // Note: Using null token implies App ID only authentication (development mode)
      // For production, fetch token from your backend
      const token = null;

      // Use numeric ID for Agora if possible, or 0 to let Agora assign one.
      // However, to map users on UI, we usually need a consistent ID.
      // Assuming uid is a number or 0. If MongoDB _id (string), we might pass 0 and map via headers/signaling.
      // For simplicity here: passing 0 (Agora assigns UID)
      engine.joinChannel(token, channelName, 0, {});

      // Set Initial Mute State
      engine.muteLocalAudioStream(true); // Always start muted
      setIsMuted(true);
    } catch (e) {
      console.error("Agora Init Error:", e);
    }
  };

  const updateAgoraRole = async (isBroadcaster) => {
    if (!agoraEngineRef.current) return;

    const role = isBroadcaster
      ? ClientRoleType.ClientRoleBroadcaster
      : ClientRoleType.ClientRoleAudience;
    agoraEngineRef.current.setClientRole(role);

    if (isBroadcaster) {
      // If becoming a speaker/host, obey current mute state
      agoraEngineRef.current.muteLocalAudioStream(isMuted);
    }
  };

  const toggleAgoraMute = (muted) => {
    if (agoraEngineRef.current) {
      agoraEngineRef.current.muteLocalAudioStream(muted);
    }
    setIsMuted(muted);
  };

  // ─── BACKEND & SOCKET LOGIC ──────────────────────────────────────────────────

  const setupSocket = (roomData) => {
    socketRef.current = io(SOCKET_URL);

    // Join Socket Room
    socketRef.current.emit("liveroom:join", {
      roomId,
      userId: userInfo._id,
      user: userInfo,
    });

    socketRef.current.on("liveroom:user_joined", () => fetchRoomData());
    socketRef.current.on("liveroom:speaker_added", ({ user }) => {
      fetchRoomData();
      if (user._id === userInfo._id) {
        Alert.alert("You are now a speaker!");
        updateAgoraRole(true);
      }
    });

    socketRef.current.on("liveroom:speaker_removed", ({ userId }) => {
      fetchRoomData();
      if (userId === userInfo._id) {
        Alert.alert("You have been moved to listeners");
        updateAgoraRole(false);
        setIsMuted(true);
        toggleAgoraMute(true);
      }
    });

    socketRef.current.on(
      "liveroom:mute_toggled",
      ({ userId, isMuted: muted }) => {
        fetchRoomData(); // Update UI icons
      },
    );

    socketRef.current.on("liveroom:hand_raised", () => fetchRoomData());
    socketRef.current.on("liveroom:ended", () => {
      Alert.alert("Room Ended", "The host has ended this live room", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    });

    // Chat & Gift Listeners
    socketRef.current.on("liveroom:message_received", (msgData) => {
      setMessages((prev) => [...prev, msgData].slice(-30));
    });

    socketRef.current.on("liveroom:gift_received", ({ gift, sender }) => {
      // Add to animated queue
      const giftId = Date.now().toString() + Math.random();
      setActiveGifts((prev) => [...prev, { id: giftId, gift, sender }]);

      // Add to chat as system message
      setMessages((prev) =>
        [
          ...prev,
          {
            id: giftId,
            user: sender,
            message: `sent a ${gift.name}!`,
            isSystem: true,
            giftUrl: gift.thumbnailUrl,
          },
        ].slice(-30),
      );
    });
  };

  const joinRoomBackend = async () => {
    try {
      const response = await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/join`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      if (response.data.success) {
        setRoom(response.data.data);
        const rData = response.data.data;

        // Initialize Agora
        const isHost = rData.host._id === userInfo._id;
        const isSpeaker = rData.speakers.some(
          (s) => s.user._id === userInfo._id,
        );

        initAgora(
          rData.agoraChannelName || `room_${roomId}`,
          0,
          isHost || isSpeaker,
        );
        setupSocket(rData);
      }
    } catch (error) {
      console.error("Error joining room:", error);
      Alert.alert("Error", "Could not join room");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomData = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/live-rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.data.success) {
        setRoom(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching room data:", error);
    }
  };

  const leaveRoomBackend = async () => {
    try {
      await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      // Notify socket
      if (socketRef.current) {
        socketRef.current.emit("liveroom:leave", {
          roomId,
          userId: userInfo._id,
        });
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  const handleToggleMute = async () => {
    const newMuteState = !isMuted;

    // Update Agora
    toggleAgoraMute(newMuteState);

    // Update Backend/UI
    try {
      await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/toggle-mute`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      socketRef.current?.emit("liveroom:toggle_mute", {
        roomId,
        userId: userInfo._id,
        isMuted: newMuteState,
      });
    } catch (error) {
      console.error("Error/Mute sync:", error);
    }
  };

  const handlePickMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: false,
      });

      if (result.canceled) return;

      const { assets } = result;
      if (!assets || assets.length === 0) return;

      const { uri } = assets[0];

      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      setIsPlayingMusic(true);

      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setMusicDuration(status.durationMillis || 0);
          setMusicPosition(status.positionMillis || 0);
          setIsPlayingMusic(status.isPlaying);
        }
        if (status.didJustFinish) {
          setIsPlayingMusic(false);
          setSound(null);
        }
      });

      // Notify viewers logic? (Requires Agora custom audio source or simple chat message)
      Alert.alert(
        "Playing Music",
        "Music started locally. Streaming depends on device capabilities.",
      );
    } catch (error) {
      console.error("Music Error:", error);
      Alert.alert("Error", "Failed to play music");
    }
  };

  const handleStopMusic = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlayingMusic(false);
    }
  };

  const handleToggleMusic = async () => {
    if (sound) {
      if (isPlayingMusic) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    }
  };

  const handleSeekMusic = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  const formatTime = (millis) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (socketRef.current) {
      socketRef.current.emit("liveroom:send_message", {
        roomId,
        message: inputText.trim(),
        user: userInfo,
      });
    }

    setInputText("");
    setShowInput(false);
    Keyboard.dismiss();
  };

  const handleRemoveGift = (id) => {
    setActiveGifts((prev) => prev.filter((g) => g.id !== id));
  };

  const handleRemoveComment = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleRaiseHand = async () => {
    try {
      if (isHandRaised) {
        await axios.post(
          `${BASE_URL}/live-rooms/${roomId}/lower-hand`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        setIsHandRaised(false);
        socketRef.current?.emit("liveroom:lower_hand", {
          roomId,
          userId: userInfo._id,
        });
      } else {
        await axios.post(
          `${BASE_URL}/live-rooms/${roomId}/raise-hand`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        setIsHandRaised(true);
        Alert.alert("Hand Raised", "Host has been notified.");
        socketRef.current?.emit("liveroom:raise_hand", {
          roomId,
          userId: userInfo._id,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to raise hand");
    }
  };

  const handleSendGiftRequest = async ({ gift, quantity, totalCost }) => {
    // Determine receiver: default to host if not specified
    const receiver = room?.host;
    if (!receiver) {
      Alert.alert("Error", "No host available to send gift to");
      return;
    }

    try {
      // 1. Call API to process transaction
      const response = await axios.post(
        `${BASE_URL}/gifts/send`,
        {
          giftId: gift._id,
          receiverId: receiver._id,
          context: "live_room",
          contextId: roomId,
          quantity: quantity,
        },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      if (response.data.success) {
        // Update user balance
        if (response.data.senderBalance !== undefined) {
          setUserBalance(response.data.senderBalance);
        }

        // 2. Emit socket event so everyone sees the animation
        socketRef.current?.emit("liveroom:send_gift", {
          roomId,
          gift: gift,
          sender: userInfo,
        });

        setShowGiftModal(false);
      }
    } catch (error) {
      console.error("Gift send error:", error);
      Alert.alert("Balance Error", "Insufficient balance to send gift.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Recharge",
          onPress: () => {
            setShowGiftModal(false);
            navigation.navigate("Wallet");
          },
        },
      ]);
    }
  };

  // ─── UI COMPONENTS ───────────────────────────────────────────────────────────

  const Header = () => (
    <View style={[styles.header, { marginTop: insets.top }]}>
      <TouchableOpacity
        style={styles.powerButton}
        onPress={() => navigation.goBack()}
      >
        <Feather name="power" size={20} color="#FFF" />
      </TouchableOpacity>

      <View style={styles.roomInfoContainer}>
        <MaterialCommunityIcons
          name="broadcast"
          size={16}
          color="#00F2EA"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.roomTitle}>{room?.title || "Live Room"}</Text>
      </View>

      <View style={styles.userCountBadge}>
        <Ionicons name="person" size={12} color="#FFF" />
        <Text style={styles.userCountText}>{room?.listeners?.length || 0}</Text>
      </View>

      <View style={styles.topUserCard}>
        <ProfileBadgeFrame
          profileImage={
            userInfo?.profileImage ||
            userInfo?.avatar ||
            "https://i.pravatar.cc/100"
          }
          badgeImage={userInfo?.activeBadge?.imageUrl}
          size={40}
        />
        <View style={styles.topUserInfo}>
          <Text style={styles.topUserName} numberOfLines={1}>
            {userInfo?.username || "Guest"}
          </Text>
          <Text style={styles.topUserId}>
            ID:{userInfo?._id ? userInfo._id.slice(-6).toUpperCase() : "..."}
          </Text>
        </View>
        <TouchableOpacity style={styles.followButtonSmall}>
          <Feather name="plus" size={12} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const HostAvatar = () => (
    <View style={styles.hostContainer}>
      <Animated.View
        style={[styles.glowRing, { transform: [{ scale: glowAnim }] }]}
      />
      <View style={styles.hostImageWrapper}>
        <ProfileBadgeFrame
          profileImage={
            room?.host?.avatar ||
            room?.host?.profileImage ||
            "https://i.pravatar.cc/300"
          }
          badgeImage={room?.host?.activeBadge?.imageUrl}
          size={HOST_SIZE}
        />
        <View style={styles.verifiedBadge}>
          <MaterialIcons name="check" size={12} color="#FFF" />
        </View>
      </View>

      <View style={styles.hostNameContainer}>
        <Text style={styles.hostName}>{room?.host?.username || "Host"}</Text>
        <TouchableOpacity style={styles.followPill}>
          <Feather name="plus" size={14} color="#000" />
          <Text style={styles.followText}>Follow</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const Seat = ({ index, speaker }) => {
    const user = speaker?.user;
    return (
      <View style={styles.seatContainer}>
        <View style={styles.seatCircle}>
          {user ? (
            <Image
              source={{
                uri:
                  user.profileImage ||
                  user.avatar ||
                  "https://i.pravatar.cc/150",
              }}
              style={styles.seatImage}
            />
          ) : (
            <Feather
              name="plus"
              size={24}
              color="#FFF"
              style={{ opacity: 0.7 }}
            />
          )}

          <View style={styles.seatNumberBadge}>
            <Text style={styles.seatNumberText}>{index + 1}</Text>
          </View>

          {speaker?.isMuted && (
            <View style={styles.mutedBadge}>
              <Ionicons name="mic-off" size={10} color="#FFF" />
            </View>
          )}
        </View>
        <Text style={styles.seatUserName} numberOfLines={1}>
          {user ? user.username : index + 1}
        </Text>
      </View>
    );
  };

  const SeatGrid = () => {
    const speakers = room?.speakers || [];
    const slots = Array(8)
      .fill(null)
      .map((_, i) => speakers[i] || null);

    return (
      <View style={styles.gridContainer}>
        <View style={styles.seatRow}>
          {[0, 1, 2, 3].map((i) => (
            <Seat key={i} index={3 - i} speaker={slots[3 - i]} />
          ))}
        </View>
        <View style={styles.seatRow}>
          {[4, 5, 6, 7].map((i) => (
            <Seat key={i} index={7 - (i - 4)} speaker={slots[7 - (i - 4)]} />
          ))}
        </View>
      </View>
    );
  };

  const BottomBar = () => {
    // Check if current user is speaker or host
    const isHost = room?.host?._id === currentUser?._id;
    const isSpeaker = room?.speakers?.some(
      (s) => s.user._id === currentUser?._id,
    );
    const isSpeakerOrHost = isHost || isSpeaker;

    return (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.bottomLeftActions}>
          <TouchableOpacity style={styles.levelBadge}>
            <FontAwesome5 name="shield-alt" size={12} color="#FFF" />
            <Text style={styles.levelText}>LV1</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomRightActions}>
          {isSpeakerOrHost ? (
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={handleToggleMute}
            >
              <Ionicons
                name={isMuted ? "mic-off" : "mic"}
                size={24}
                color={isMuted ? "#FF4444" : "#FFF"}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={handleRaiseHand}
            >
              <Ionicons
                name={isHandRaised ? "hand-right" : "hand-right-outline"}
                size={24}
                color={isHandRaised ? "#FFFF00" : "#FFF"}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconActionBtn}
            onPress={handlePickMusic}
          >
            <Ionicons
              name={isPlayingMusic ? "musical-notes" : "musical-note-outline"}
              size={24}
              color={isPlayingMusic ? "#00FF00" : "#FFF"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconActionBtn}
            onPress={() => {
              setShowInput(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.giftButton}
            onPress={() => setShowGiftModal(true)}
          >
            <LinearGradient
              colors={["#A020F0", "#FF00FF"]}
              style={styles.giftButtonGradient}
            >
              <Ionicons name="gift" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconActionBtn}
            onPress={() => setShowManagementModal(true)}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading || !room) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#FFF" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ImageBackground
        source={
          room?.backgroundImage
            ? { uri: room.backgroundImage }
            : {
                uri: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000&auto=format&fit=crop",
              }
        }
        style={styles.backgroundImage}
        blurRadius={5}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)", "#000"]}
          style={styles.gradientOverlay}
        />

        <SafeAreaView style={styles.contentContainer} edges={["left", "right"]}>
          <Header />

          <View style={styles.currencyBar}>
            <View style={styles.currencyItem}>
              <Text style={styles.currencyText}>Rec</Text>
              <Ionicons name="recording" size={14} color="#FF4444" />
            </View>
            <View style={styles.currencyItem}>
              <Text style={styles.currencyText}>Gift</Text>
              <Ionicons name="gift" size={14} color="#D8BFD8" />
            </View>
          </View>

          <HostAvatar />

          <SeatGrid />

          {/* Floating Comments Overlay */}
          <FloatingComments
            comments={messages}
            removeComment={handleRemoveComment}
          />

          {/* Animated Gifts Overlay */}
          {activeGifts.map((data) => (
            <AnimatedGift
              key={data.id}
              gift={data.gift}
              sender={data.sender}
              onComplete={() => handleRemoveGift(data.id)}
            />
          ))}
        </SafeAreaView>

        {sound && (
          <View style={styles.musicPlayerContainer}>
            <Text style={styles.musicTimeText}>
              {formatTime(musicPosition || 0)}
            </Text>
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={0}
              maximumValue={musicDuration || 1}
              value={musicPosition || 0}
              onSlidingComplete={handleSeekMusic}
              minimumTrackTintColor="#00F2EA"
              maximumTrackTintColor="#FFFFFF"
              thumbTintColor="#00F2EA"
            />
            <Text style={styles.musicTimeText}>
              {formatTime(musicDuration || 0)}
            </Text>

            <TouchableOpacity
              onPress={handleToggleMusic}
              style={{ marginHorizontal: 10 }}
            >
              <Ionicons
                name={isPlayingMusic ? "pause" : "play"}
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleStopMusic}>
              <Ionicons name="close" size={24} color="#FF4444" />
            </TouchableOpacity>
          </View>
        )}

        {!showInput && <BottomBar />}

        {showInput && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 100,
            }}
          >
            <View
              style={[
                styles.inputContainer,
                { paddingBottom: Platform.OS === "ios" ? insets.bottom : 10 },
              ]}
            >
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Say something..."
                placeholderTextColor="#AAA"
                style={styles.input}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity onPress={handleSendMessage}>
                <Ionicons name="send" size={24} color="#00BFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowInput(false)}>
                <Ionicons name="close-circle" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </ImageBackground>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundImage: {
    width: width,
    height: height,
    flex: 1,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  powerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  roomInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    position: "absolute",
    left: width / 2 - 60,
  },
  roomTitle: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  userCountBadge: {
    position: "absolute",
    left: 80,
    top: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  userCountText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  topUserCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  topUserInfo: {
    marginHorizontal: 8,
    alignItems: "flex-end",
    maxWidth: 80,
  },
  topUserName: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "right",
  },
  topUserId: {
    color: "#CCC",
    fontSize: 10,
  },
  followButtonSmall: {
    backgroundColor: "#00BFFF",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  currencyBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  currencyText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  hostContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  hostImageWrapper: {
    width: HOST_SIZE,
    height: HOST_SIZE,
    borderRadius: HOST_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  hostImage: {
    width: HOST_SIZE - 4,
    height: HOST_SIZE - 4,
    borderRadius: (HOST_SIZE - 4) / 2,
  },
  glowRing: {
    position: "absolute",
    width: HOST_SIZE + 30,
    height: HOST_SIZE + 30,
    borderRadius: (HOST_SIZE + 30) / 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    zIndex: -1,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#2ECC71",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  hostNameContainer: {
    alignItems: "center",
    marginTop: -10,
    zIndex: 1,
  },
  hostName: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 16,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  followPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
    gap: 4,
  },
  followText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
  gridContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  seatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  seatContainer: {
    alignItems: "center",
    width: SEAT_SIZE + 10,
  },
  seatCircle: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    borderRadius: SEAT_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  seatImage: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    borderRadius: SEAT_SIZE / 2,
  },
  seatNumberBadge: {
    position: "absolute",
    bottom: -6,
    backgroundColor: "transparent",
  },
  seatNumberText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    opacity: 0.8,
  },
  seatUserName: {
    color: "#FFF",
    fontSize: 10,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.9,
  },
  mutedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FF4444",
    padding: 2,
    borderRadius: 8,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomLeftActions: {
    gap: 12,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2ECC71",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    alignSelf: "flex-start",
  },
  levelText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  musicPlayerContainer: {
    position: "absolute",
    bottom: 100, // Above bottom bar
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 50,
  },
  musicTimeText: {
    color: "#FFF",
    fontSize: 12,
    width: 35,
    textAlign: "center",
  },
  bottomRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconActionBtn: {
    justifyContent: "center",
    alignItems: "center",
  },
  giftButton: {
    marginBottom: 4,
  },
  giftButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: "100%",
  },
  input: {
    flex: 1,
    color: "#FFF",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
  },
});

export default LiveRoomScreen;
