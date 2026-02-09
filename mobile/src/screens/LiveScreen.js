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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const { isBroadcaster } = route.params || {};
  const { userToken, userInfo } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const engineRef = useRef(null);

  const [joined, setJoined] = useState(false);
  const [channelName, setChannelName] = useState(userInfo?._id || "test");
  const [localUid, setLocalUid] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [liveTitle, setLiveTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const finalChannel = res.data.channelName || channelName;
      setChannelName(finalChannel);

      const engine = initEngine();
      engine.setClientRole(
        isBroadcaster
          ? ClientRoleType.ClientRoleBroadcaster
          : ClientRoleType.ClientRoleAudience
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

  // ───────────────── MOCK UI DATA ─────────────────
  const avatars = [
    userInfo?.profileImage,
    "https://i.pravatar.cc/100?img=11",
    "https://i.pravatar.cc/100?img=21",
  ].filter(Boolean);

  const chats = [
    { user: "hamode", text: "نورت", vip: true },
    { user: "ليمار", text: "❤️" },
    { user: "سيف", text: "سلام", vip: true },
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
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.35)" }]} />

      {/* Video */}
      {isBroadcaster ? (
        <RtcSurfaceView style={styles.video} canvas={{ uid: localUid || 0 }} />
      ) : remoteUsers[0] ? (
        <RtcSurfaceView style={styles.video} canvas={{ uid: remoteUsers[0] }} />
      ) : null}

      {/* UI */}
      <SafeAreaView style={styles.ui} pointerEvents="box-none">
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={2}>
              {errorMessage}
            </Text>
          </View>
        ) : null}
        {/* TOP */}
        <View style={styles.top}>
          <View style={styles.titleBox}>
            <Text style={styles.title}>{liveTitle || "لايف الآن"}</Text>
            <Text style={styles.sub}>ID: {channelName}</Text>
          </View>

          <View style={styles.viewers}>
            <Ionicons name="eye" color="#fff" size={14} />
            <Text style={{ color: "#fff" }}>{viewerCount}</Text>
          </View>
        </View>

        {/* AVATARS */}
        <ScrollView horizontal style={styles.avatarRow}>
          {avatars.map((a, i) => (
            <View key={i} style={styles.fireWrap}>
              <View style={styles.fireRing} />
              <Image source={{ uri: a }} style={styles.avatar} />
            </View>
          ))}
        </ScrollView>

        {/* CHAT */}
        <View style={styles.chat}>
          {chats.map((c, i) => (
            <View
              key={i}
              style={[
                styles.chatBubble,
                c.vip && { backgroundColor: "#ff4fa3" },
              ]}
            >
              <Text style={styles.chatUser}>
                {c.vip ? "VIP " : ""}
                {c.user}
              </Text>
              <Text style={{ color: "#fff" }}>{c.text}</Text>
            </View>
          ))}
        </View>

        {/* BOTTOM */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom }]}>
          <View style={styles.inputFake}>
            <Text style={{ color: "#bbb" }}>قل شيئاً...</Text>
          </View>
          <TouchableOpacity style={styles.circleBtn}>
            <Ionicons name="gift" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleBtn}>
            <Ionicons name="share-social" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleBtn} onPress={leaveLive}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ───────────────── STYLES ─────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { width, height, position: "absolute" },

  ui: { flex: 1, justifyContent: "space-between" },

  top: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  titleBox: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 10,
  },
  title: { color: "#fff", fontWeight: "700" },
  sub: { color: "#ccc", fontSize: 11 },
  viewers: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 20,
  },

  avatarRow: { paddingHorizontal: 12 },
  fireWrap: { marginRight: 10, alignItems: "center" },
  fireRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,90,0,0.4)",
    position: "absolute",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginTop: 7,
  },

  chat: {
    position: "absolute",
    right: 10,
    top: height * 0.35,
    width: width * 0.5,
  },
  chatBubble: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  chatUser: { color: "#fff", fontWeight: "700", fontSize: 12 },

  bottom: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    alignItems: "center",
  },
  inputFake: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 25,
  },
  circleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
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
