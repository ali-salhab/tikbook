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
      <SafeAreaView style={styles.overlayContainer}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.hostInfo}>
            <View style={styles.avatarBubble}>
              <Ionicons name="person" size={16} color="#FFF" />
            </View>
            <View>
              <Text style={styles.hostName}>{channelName}</Text>
              <Text style={styles.viewerCount}>{viewerCount} viewers</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeButtonSmall} onPress={leave}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Bottom Area */}
        <View style={styles.bottomArea}>
          {/* Comments Area (Mock) */}
          <ScrollView style={styles.commentsList} />

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Say something..."
              placeholderTextColor="#DDD"
            />

            {/* Gift Button (Audience) */}
            {!isBroadcaster && (
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="gift" size={28} color="#FFD700" />
              </TouchableOpacity>
            )}

            {/* Share */}
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="share-social" size={28} color="#FFF" />
            </TouchableOpacity>

            {/* Switch Cam (Host) */}
            {isBroadcaster && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={switchCamera}
              >
                <Ionicons name="camera-reverse" size={28} color="#FFF" />
              </TouchableOpacity>
            )}
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "flex-start",
  },
  hostInfo: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 4,
    borderRadius: 20,
    alignItems: "center",
  },
  avatarBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  hostName: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  viewerCount: {
    color: "#DDD",
    fontSize: 10,
  },
  closeButtonSmall: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomArea: {
    padding: 16,
  },
  commentsList: {
    height: 200,
    marginBottom: 10,
  },
  comment: {
    color: "#FFF",
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 2,
  },
  commentUser: {
    fontWeight: "bold",
    color: "#DDD",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#FFF",
    marginRight: 10,
  },
  iconButton: {
    marginLeft: 10,
  },
});

export default LiveScreen;
