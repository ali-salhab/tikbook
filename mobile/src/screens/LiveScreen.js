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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoEncoderConfiguration,
} from "react-native-agora";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL, AGORA_APP_ID } from "../config/api";
import axios from "axios";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";

const { width, height } = Dimensions.get("window");

const LiveScreen = ({ navigation, route }) => {
  const { isBroadcaster, channelId: paramChannelId } = route.params || {};
  const { userToken, userInfo } = useContext(AuthContext);

  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [channelName, setChannelName] = useState(
    paramChannelId || userInfo?._id || "test_channel"
  );
  const [liveTitle, setLiveTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [localUid, setLocalUid] = useState(null);

  const engineRef = useRef(null);

  const ensureEngine = () => {
    if (engineRef.current) return engineRef.current;

    const engine = createAgoraRtcEngine();
    engine.initialize({
      appId: AGORA_APP_ID,
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });
    engine.enableVideo();
    engine.enableAudio();
    engine.setVideoEncoderConfiguration(
      new VideoEncoderConfiguration({
        dimensions: { width: 720, height: 1280 },
        frameRate: 24,
      })
    );

    engine.registerEventHandler({
      onJoinChannelSuccess: (_, uid) => {
        setLocalUid(uid);
        setIsJoined(true);
      },
      onUserJoined: (_, uid) => {
        setRemoteUsers((prev) => {
          if (prev.includes(uid)) return prev;
          return [...prev, uid];
        });
      },
      onUserOffline: (_, uid) => {
        setRemoteUsers((prev) => prev.filter((id) => id !== uid));
      },
      onLeaveChannel: () => {
        setRemoteUsers([]);
        setLocalUid(null);
        setIsJoined(false);
      },
      onError: (err) => {
        console.error("Agora error", err);
      },
    });

    engineRef.current = engine;
    return engine;
  };

  // Permissions
  const getPermission = async () => {
    if (Platform.OS === "android") {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } = await Audio.requestPermissionsAsync();

      if (cameraStatus !== "granted" || audioStatus !== "granted") {
        Alert.alert("Error", "Camera and Audio permissions are required");
        return false;
      }
      return true;
    }
    return true;
  };

  useEffect(() => {
    ensureEngine();
    return () => {
      leave(true);
      const engine = engineRef.current;
      if (engine) {
        engine.stopPreview();
        engine.unregisterEventHandler();
        engine.release();
        engineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const count = (isBroadcaster ? 1 : 0) + (isBroadcaster ? remoteUsers.length : remoteUsers.length + 1);
    setViewerCount(count);
  }, [remoteUsers, isBroadcaster]);

  const join = async () => {
    if (isConnecting || isJoined) return;
    if (isBroadcaster && !liveTitle.trim()) {
      Alert.alert("Required", "Please enter a title for your live stream");
      return;
    }

    try {
      const hasPermission = await getPermission();
      if (!hasPermission) return;

      setIsConnecting(true);
      setErrorMessage("");

      const response = await axios.post(
        `${BASE_URL}/live/token`,
        {
          channelName,
          role: isBroadcaster ? "publisher" : "subscriber",
          title: liveTitle,
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const { token, channelName: serverChannelName } = response.data;
      const finalChannel = serverChannelName || channelName;
      setChannelName(finalChannel);

      const engine = ensureEngine();
      engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
      engine.setClientRole(
        isBroadcaster
          ? ClientRoleType.ClientRoleBroadcaster
          : ClientRoleType.ClientRoleAudience
      );

      if (isBroadcaster) {
        engine.startPreview();
      }

      engine.joinChannel(
        token,
        finalChannel,
        0,
        {
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
          clientRoleType: isBroadcaster
            ? ClientRoleType.ClientRoleBroadcaster
            : ClientRoleType.ClientRoleAudience,
        }
      );
    } catch (e) {
      console.error("Error joining Agora:", e);
      setErrorMessage(e.response?.data?.message || e.message);
      Alert.alert("Error", "Failed to join live stream: " + (e.message || ""));
      setIsJoined(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const leave = async (skipApi = false) => {
    try {
      const engine = engineRef.current;
      if (engine) {
        engine.leaveChannel();
        engine.stopPreview();
      }
      if (isBroadcaster && !skipApi) {
        await axios.post(
          `${BASE_URL}/live/end`,
          { channelName },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
      }
    } catch (e) {
      console.error("Error leaving Agora:", e);
    } finally {
      setRemoteUsers([]);
      setIsJoined(false);
      if (!skipApi) {
        navigation.goBack();
      }
    }
  };

  const switchCamera = () => {
    try {
      const engine = engineRef.current;
      if (engine) {
        engine.switchCamera();
      }
    } catch (e) {
      console.error("Error switching camera:", e);
    }
  };

  const remoteUid = useMemo(() => remoteUsers[0] ?? null, [remoteUsers]);

  // --- UI DATA (placeholder-ready, wire real data when available) ---
  const viewerAvatars = useMemo(
    () => [
      userInfo?.profileImage,
      "https://i.pravatar.cc/100?img=12",
      "https://i.pravatar.cc/100?img=22",
      "https://i.pravatar.cc/100?img=32",
    ].filter(Boolean),
    [userInfo]
  );

  const floatingUsers = useMemo(
    () => [
      { name: "ليمار", uri: "https://i.pravatar.cc/120?img=48", vip: true },
      { name: "ترلاهه", uri: "https://i.pravatar.cc/120?img=57", vip: true },
      { name: "سيف", uri: "https://i.pravatar.cc/120?img=29", vip: false },
      { name: "رامي", uri: "https://i.pravatar.cc/120?img=15", vip: false },
    ],
    []
  );

  const chatMessages = useMemo(
    () => [
      { user: "hamode", text: "نورّت", vip: true, color: "#ff5fa2" },
      { user: "تريلاهه", text: "❤️", vip: false, color: "#222" },
      { user: "سيف", text: "سلام", vip: true, color: "#c21f2f" },
      { user: "ليمار", text: "هلا فيكم", vip: false, color: "#333" },
    ],
    []
  );

  // --- UI RENDER ---

  // 1. Pre-Live View (Broadcaster only)
  if (isBroadcaster && !isJoined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.preLiveContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.preLiveHeader}>Add a title to go LIVE</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="What are you doing?"
            placeholderTextColor="#888"
            value={liveTitle}
            onChangeText={setLiveTitle}
            maxLength={60}
          />

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.goLiveButton} onPress={join}>
            <Text style={styles.goLiveText}>
              {isConnecting ? "Connecting..." : "Go LIVE"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Live View
  return (
    <View style={styles.container}>
      {/* Video Surface */}
      {isBroadcaster ? (
        isJoined ? (
          <RtcSurfaceView
            style={styles.fullScreenVideo}
            canvas={{ uid: localUid ?? 0 }}
          />
        ) : (
          <View
            style={[
              styles.fullScreenVideo,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={{ color: "#FFF" }}>Starting camera...</Text>
          </View>
        )
      ) : remoteUid ? (
        <RtcSurfaceView
          style={styles.fullScreenVideo}
          canvas={{ uid: remoteUid }}
        />
      ) : (
        <View
          style={[
            styles.fullScreenVideo,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: "#FFF" }}>Waiting for host...</Text>
        </View>
      )}

      {/* Overlay UI */}
      <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
        {/* Top cluster */}
        <View style={styles.topCluster} pointerEvents="box-none">
          <View style={styles.titleCard}>
            <Text style={styles.titleText} numberOfLines={1}>
              {liveTitle || "لايف أنـ ..."}
            </Text>
            <Text style={styles.idText}>ID: {channelName || "SY1660000"}</Text>
          </View>

          <View style={styles.topBadgesRow}>
            <View style={styles.badgePill}>
              <Ionicons name="medal" size={14} color="#FFD700" />
              <Text style={styles.badgeText}>السجـل</Text>
            </View>
            <View style={styles.badgePill}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.badgeText}>الأسبوعي</Text>
            </View>
            <View style={styles.badgePill}>
              <Ionicons name="diamond" size={14} color="#7df0ff" />
              <Text style={styles.badgeText}>13M</Text>
            </View>
          </View>

          <View style={styles.viewerRow}>
            <View style={styles.viewerCountPill}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.viewerCountText}>{viewerCount}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.viewerAvatars}
            >
              {viewerAvatars.map((uri, idx) => (
                <View key={idx} style={styles.viewerAvatar}>
                  <View style={styles.avatarRing}>
                    <View style={styles.avatarInner}>
                      <Image
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButtonSmall} onPress={leave}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Left vertical icons */}
        <View style={styles.leftRail} pointerEvents="box-none">
          <View style={styles.lockButton}>
            <Ionicons name="lock-closed" size={22} color="#fff" />
            <Text style={styles.lockCount}>{remoteUsers.length}</Text>
          </View>
          <View style={styles.sideIconBubble}>
            <Ionicons name="rocket" size={20} color="#7df0ff" />
          </View>
          <View style={styles.sideIconBubble}>
            <Ionicons name="sparkles" size={20} color="#ff8a00" />
          </View>
          <View style={styles.sideIconBubble}>
            <Ionicons name="shield-checkmark" size={20} color="#20d5ec" />
          </View>
        </View>

        {/* Center avatars */}
        <View style={styles.centerStage} pointerEvents="box-none">
          <View style={styles.hostBadge}>
            <View style={styles.hostCrown} />
            <View style={styles.hostAvatar}>
              <Ionicons name="person" size={42} color="#fff" />
            </View>
            <Text style={styles.hostNameText}>{userInfo?.username || "Host"}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floatingRow}
          >
            {floatingUsers.map((u, idx) => (
              <View key={idx} style={styles.floatingAvatar}>
                <View style={styles.fireRing} />
                <View style={styles.floatingInner}>
                  <Ionicons name="person" size={24} color="#fff" />
                </View>
                <Text style={styles.floatingLabel} numberOfLines={1}>
                  {u.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Chat bubbles (right side) */}
        <View style={styles.chatColumn} pointerEvents="box-none">
          <ScrollView
            contentContainerStyle={{ gap: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.chatBubble,
                  { backgroundColor: msg.color || "rgba(0,0,0,0.4)" },
                ]}
              >
                <Text style={styles.chatUser}>
                  {msg.vip ? "VIP " : ""}
                  {msg.user}
                </Text>
                <Text style={styles.chatText}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Bottom bar */}
        <View style={styles.bottomBar} pointerEvents="box-none">
          <View style={styles.chatInput}>
            <Text style={styles.chatPlaceholder}>قل شيئاً...</Text>
          </View>
          <View style={styles.bottomIcons}>
            <TouchableOpacity style={styles.bottomIcon}>
              <Ionicons name="gift" size={22} color="#ffb100" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomIcon}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomIcon}>
              <Ionicons name="share-social" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomIcon} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomIcon}>
              <Ionicons name="apps" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullScreenVideo: {
    width: width,
    height: height,
    position: "absolute",
  },
  preLiveContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
  preLiveHeader: {
    color: "#FFF",
    fontSize: 18,
    marginTop: 60,
    marginBottom: 20,
  },
  titleInput: {
    color: "#FFF",
    fontSize: 24,
    textAlign: "center",
    width: "100%",
  },
  goLiveButton: {
    backgroundColor: "#FE2C55",
    width: "80%",
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 40,
  },
  goLiveText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  overlayContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  topCluster: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 8,
  },
  titleCard: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  titleText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "right",
  },
  idText: {
    color: "#d0d0d0",
    fontSize: 11,
    textAlign: "right",
  },
  topBadgesRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-end",
  },
  viewerCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  viewerCountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  viewerAvatars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  avatarRing: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#FE2C55",
    borderRadius: 17,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
  },
  avatarFill: {
    flex: 1,
  },
  closeButtonSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  leftRail: {
    position: "absolute",
    left: 10,
    top: height * 0.25,
    gap: 12,
  },
  lockButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  lockCount: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
  },
  sideIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  centerStage: {
    position: "absolute",
    top: height * 0.32,
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  hostBadge: {
    alignItems: "center",
    gap: 6,
  },
  hostCrown: {
    width: 90,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,183,0,0.3)",
  },
  hostAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#ffd700",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  hostNameText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  floatingRow: {
    gap: 16,
    paddingHorizontal: 20,
  },
  floatingAvatar: {
    alignItems: "center",
    gap: 4,
  },
  fireRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,94,0,0.35)",
  },
  floatingInner: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingLabel: {
    color: "#fff",
    fontSize: 12,
    maxWidth: 64,
    textAlign: "center",
  },
  chatColumn: {
    position: "absolute",
    right: 10,
    top: height * 0.35,
    width: width * 0.45,
  },
  chatBubble: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  chatUser: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  chatText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 2,
  },
  bottomBar: {
    position: "absolute",
    bottom: 12,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatPlaceholder: {
    color: "#bbb",
    fontSize: 13,
    textAlign: "right",
  },
  bottomIcons: {
    flexDirection: "row",
    gap: 10,
  },
  bottomIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
});

export default LiveScreen;
