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
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  VideoCanvas,
} from "react-native-agora";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL, AGORA_APP_ID } from "../config/api";
import axios from "axios";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";

const { width, height } = Dimensions.get("window");

const LiveScreen = ({ navigation, route }) => {
  const { isBroadcaster, channelId: paramChannelId } = route.params || {};
  const { userToken, userInfo } = useContext(AuthContext);

  const agoraEngineRef = useRef(null);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(0);
  const [channelName, setChannelName] = useState(
    paramChannelId || userInfo?._id || "test_channel"
  );
  const [liveTitle, setLiveTitle] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [viewerCount, setViewerCount] = useState(0);

  // Permissions
  const getPermission = async () => {
    if (Platform.OS === "android") {
      const { status: cameraStatus } =
        await Camera.requestCameraPermissionsAsync();
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
    (async () => {
      const success = await setupVideoSDKEngine();
      if (success && !isBroadcaster) {
        join();
      }
    })();
    return () => {
      leave();
    };
  }, []);

  const setupVideoSDKEngine = async () => {
    try {
      console.log("Initializing Agora Engine...");
      if (!AGORA_APP_ID) {
        Alert.alert("Error", "Agora App ID is missing in config");
        return;
      }

      const hasPermission = await getPermission();
      if (!hasPermission) {
        console.log("Permissions denied");
        return false;
      }

      // Create the engine
      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      agoraEngine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      agoraEngine.enableVideo();
      console.log("Agora Engine Initialized");

      // Register event handlers
      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: (_connection, uid) => {
          console.log("Successfully joined channel:", uid);
          setIsJoined(true);
        },
        onUserJoined: (_connection, uid) => {
          console.log("Remote user joined:", uid);
          setRemoteUid(uid);
          setViewerCount((prev) => prev + 1);
        },
        onUserOffline: (_connection, uid) => {
          console.log("Remote user left:", uid);
          setRemoteUid(0);
          setViewerCount((prev) => Math.max(0, prev - 1));
        },
        onError: (err, msg) => {
          console.error("Agora Error:", err, msg);
        },
        onLocalVideoStateChanged: (source, state, error) => {
          console.log("Local Video State:", state, "Error:", error);
          // State 1: Stopped, 2: Capturing, 3: Encoding, 4: Failed
        },
        onConnectionStateChanged: (state, reason) => {
          console.log("Connection State:", state, "Reason:", reason);
          // State 3: Connected
        },
      });
      return true;
    } catch (e) {
      console.error("Error setting up Agora:", e);
      Alert.alert("Error", "Failed to setup video engine: " + e.message);
      return false;
    }
  };

  const join = async () => {
    console.log("Join button pressed");
    if (isBroadcaster && !liveTitle.trim()) {
      Alert.alert("Required", "Please enter a title for your live stream");
      return;
    }

    try {
      console.log("Fetching token...");
      const role = isBroadcaster
        ? ClientRoleType.ClientRoleBroadcaster
        : ClientRoleType.ClientRoleAudience;

      // Get Token from Backend
      const response = await axios.post(
        `${BASE_URL}/live/token`,
        {
          channelName: channelName,
          role: isBroadcaster ? "publisher" : "subscriber",
          title: liveTitle, // Send title to backend
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const { token } = response.data;
      console.log("Token received:", token);

      if (!agoraEngineRef.current) {
        console.error("Agora engine not initialized");
        Alert.alert("Error", "Video engine not ready");
        return;
      }

      if (isBroadcaster) {
        agoraEngineRef.current?.setClientRole(role);
        agoraEngineRef.current?.startPreview();
      }

      const result = agoraEngineRef.current?.joinChannel(
        token,
        channelName,
        0, // uid (0 = allow any)
        {
          clientRoleType: role,
        }
      );

      console.log("Join Channel Result:", result);
      if (result !== 0) {
        Alert.alert("Error", "Failed to join channel, error code: " + result);
      }
    } catch (e) {
      console.error("Error joining channel:", e);
      Alert.alert("Error", "Failed to join live stream: " + e.message);
    }
  };

  const leave = async () => {
    try {
      agoraEngineRef.current?.leaveChannel();
      if (isBroadcaster) {
        agoraEngineRef.current?.stopPreview();
        // Notify backend to end stream
        await axios.post(
          `${BASE_URL}/live/end`,
          { channelName },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
      }
      setIsJoined(false);
      setRemoteUid(0);
      navigation.goBack();
    } catch (e) {
      console.error("Error leaving:", e);
    }
  };

  const switchCamera = () => {
    agoraEngineRef.current?.switchCamera();
  };

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
            <Text style={styles.goLiveText}>Go LIVE</Text>
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
        <RtcSurfaceView
          style={styles.fullScreenVideo}
          canvas={{ uid: 0 }} // 0 = local user
        />
      ) : remoteUid !== 0 ? (
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
          <ScrollView style={styles.commentsList}>
            <Text style={styles.comment}>
              <Text style={styles.commentUser}>User1:</Text> Hello!
            </Text>
            <Text style={styles.comment}>
              <Text style={styles.commentUser}>User2:</Text> Cool stream 🔥
            </Text>
          </ScrollView>

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
