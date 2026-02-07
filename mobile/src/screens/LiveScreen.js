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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";
import { Camera } from "expo-camera";
import { Audio } from "expo-av";
import { Room, Track, createLocalTracks } from "livekit-client";
import { useRoom, VideoView } from "livekit-react-native";

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
  const [roomUrl, setRoomUrl] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const roomRef = useRef(null);
  if (!roomRef.current) {
    roomRef.current = new Room();
  }
  const room = roomRef.current;
  const { participants } = useRoom(room);

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
    return () => {
      leave();
    };
  }, []);

  const join = async () => {
    if (isConnecting || isJoined) return;
    if (isBroadcaster && !liveTitle.trim()) {
      Alert.alert("Required", "Please enter a title for your live stream");
      return;
    }

    try {
      const hasPermission = await getPermission();
      if (!hasPermission) {
        return;
      }

      setIsConnecting(true);
      setErrorMessage("");

      const response = await axios.post(
        `${BASE_URL}/livekit/token`,
        {
          channelName,
          role: isBroadcaster ? "publisher" : "subscriber",
          title: liveTitle,
        },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      const { token, url } = response.data;
      setRoomToken(token);
      setRoomUrl(url);

      await room.connect(url, token, { autoSubscribe: true });

      if (isBroadcaster) {
        const tracks = await createLocalTracks({ audio: true, video: true });
        for (const track of tracks) {
          await room.localParticipant.publishTrack(track);
        }
      }

      setIsJoined(true);
    } catch (e) {
      console.error("Error joining LiveKit:", e);
      setErrorMessage(e.response?.data?.message || e.message);
      Alert.alert("Error", "Failed to join live stream: " + (e.message || ""));
    } finally {
      setIsConnecting(false);
    }
  };

  const leave = async () => {
    try {
      if (room) {
        room.disconnect();
      }
      if (isBroadcaster) {
        await axios.post(
          `${BASE_URL}/livekit/end`,
          { channelName },
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
      }
    } catch (e) {
      console.error("Error leaving LiveKit:", e);
    } finally {
      setIsJoined(false);
      navigation.goBack();
    }
  };

  const switchCamera = () => {
    try {
      const trackPub = room.localParticipant
        ?.getTrack(Track.Source.Camera);
      const videoTrack = trackPub?.videoTrack;
      if (videoTrack?.switchCamera) {
        videoTrack.switchCamera();
      }
    } catch (e) {
      console.error("Error switching camera:", e);
    }
  };

  const remoteParticipant = useMemo(() => {
    if (!participants || participants.length === 0) return null;
    // Prefer a participant with a camera track
    return (
      participants.find((p) =>
        p.getTrack(Track.Source.Camera)?.videoTrack
      ) || participants[0]
    );
  }, [participants]);

  const remoteVideoTrack =
    remoteParticipant?.getTrack(Track.Source.Camera)?.videoTrack || null;

  const localVideoTrack =
    room?.localParticipant?.getTrack(Track.Source.Camera)?.videoTrack || null;

  useEffect(() => {
    const count =
      (room?.localParticipant ? 1 : 0) + (participants?.length || 0);
    setViewerCount(count);
  }, [participants, room?.localParticipant]);

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
        localVideoTrack ? (
          <VideoView
            style={styles.fullScreenVideo}
            videoTrack={localVideoTrack}
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
      ) : remoteVideoTrack ? (
        <VideoView
          style={styles.fullScreenVideo}
          videoTrack={remoteVideoTrack}
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
