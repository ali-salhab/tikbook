import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import io from "socket.io-client";

const API_URL = "https://tikbook-1cdb.onrender.com/api";
const SOCKET_URL = "https://tikbook-1cdb.onrender.com";

const LiveRoomScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    loadCurrentUser();
    joinRoom();
    setupSocket();

    return () => {
      leaveRoom();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const setupSocket = () => {
    socketRef.current = io(SOCKET_URL);

    socketRef.current.on("connect", () => {
      console.log("Socket connected");
    });

    // Listen for live room events
    socketRef.current.on("liveroom:user_joined", ({ user }) => {
      fetchRoomData();
    });

    socketRef.current.on("liveroom:user_left", ({ userId }) => {
      fetchRoomData();
    });

    socketRef.current.on("liveroom:speaker_added", ({ user }) => {
      fetchRoomData();
    });

    socketRef.current.on("liveroom:speaker_removed", ({ userId }) => {
      fetchRoomData();
      if (currentUser && userId === currentUser._id) {
        Alert.alert("Notice", "You have been removed as a speaker");
      }
    });

    socketRef.current.on("liveroom:hand_raised", ({ user }) => {
      fetchRoomData();
    });

    socketRef.current.on("liveroom:mute_toggled", ({ userId, isMuted }) => {
      fetchRoomData();
    });

    socketRef.current.on("liveroom:ended", () => {
      Alert.alert("Room Ended", "The host has ended this live room", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    });
  };

  const joinRoom = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/live-rooms/${roomId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setRoom(response.data.data);

        // Emit socket event
        const userStr = await AsyncStorage.getItem("user");
        const user = JSON.parse(userStr);
        socketRef.current?.emit("liveroom:join", {
          roomId,
          userId: user._id,
          user,
        });
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
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(`${API_URL}/live-rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setRoom(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching room data:", error);
    }
  };

  const leaveRoom = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API_URL}/live-rooms/${roomId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (currentUser) {
        socketRef.current?.emit("liveroom:leave", {
          roomId,
          userId: currentUser._id,
          user: currentUser,
        });
      }
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  const handleRaiseHand = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (isHandRaised) {
        await axios.post(
          `${API_URL}/live-rooms/${roomId}/lower-hand`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setIsHandRaised(false);
        socketRef.current?.emit("liveroom:lower_hand", {
          roomId,
          userId: currentUser._id,
        });
      } else {
        await axios.post(
          `${API_URL}/live-rooms/${roomId}/raise-hand`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setIsHandRaised(true);
        socketRef.current?.emit("liveroom:raise_hand", {
          roomId,
          userId: currentUser._id,
          user: currentUser,
        });
      }
    } catch (error) {
      console.error("Error toggling hand:", error);
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    }
  };

  const handleToggleMute = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/live-rooms/${roomId}/toggle-mute`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        setIsMuted(response.data.isMuted);
        socketRef.current?.emit("liveroom:toggle_mute", {
          roomId,
          userId: currentUser._id,
          isMuted: response.data.isMuted,
        });
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    }
  };

  const handleMakeSpeaker = async (userId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/live-rooms/${roomId}/make-speaker`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        fetchRoomData();
        const user = room.handRaised.find((h) => h.user._id === userId)?.user;
        socketRef.current?.emit("liveroom:make_speaker", {
          roomId,
          userId,
          user,
        });
      }
    } catch (error) {
      console.error("Error making speaker:", error);
      Alert.alert("Error", error.response?.data?.message || "Action failed");
    }
  };

  const handleEndRoom = () => {
    Alert.alert("End Live Room", "Are you sure you want to end this room?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Room",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("token");
            await axios.post(
              `${API_URL}/live-rooms/${roomId}/end`,
              {},
              { headers: { Authorization: `Bearer ${token}` } },
            );

            socketRef.current?.emit("liveroom:end", { roomId });
            navigation.goBack();
          } catch (error) {
            console.error("Error ending room:", error);
            Alert.alert("Error", "Could not end room");
          }
        },
      },
    ]);
  };

  const isHost = currentUser && room?.host?._id === currentUser._id;
  const isSpeaker =
    currentUser && room?.speakers?.some((s) => s.user._id === currentUser._id);

  const renderParticipant = ({ item, index }) => {
    const isSpeaker = room?.speakers?.some((s) => s.user._id === item.user._id);
    const speakerData = room?.speakers?.find(
      (s) => s.user._id === item.user._id,
    );

    return (
      <View style={styles.participantItem}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: item.user?.avatar || "https://via.placeholder.com/60",
            }}
            style={styles.avatar}
          />
          {isSpeaker && (
            <View
              style={[
                styles.micBadge,
                speakerData?.isMuted && styles.micBadgeMuted,
              ]}
            >
              <Ionicons
                name={speakerData?.isMuted ? "mic-off" : "mic"}
                size={12}
                color="#fff"
              />
            </View>
          )}
          {item.user?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
            </View>
          )}
        </View>
        <Text style={styles.participantName} numberOfLines={1}>
          {item.user?.username}
        </Text>
      </View>
    );
  };

  if (loading || !room) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading room...</Text>
      </View>
    );
  }

  const allParticipants = [
    ...room.speakers.map((s) => ({ user: s.user, type: "speaker" })),
    ...room.listeners.map((l) => ({ user: l.user, type: "listener" })),
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={32} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.liveBadge}>
            <MaterialCommunityIcons name="circle" size={8} color="#ff4444" />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {isHost && (
          <TouchableOpacity onPress={handleEndRoom}>
            <Ionicons name="close-circle" size={28} color="#ff4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Room Info */}
      <View style={styles.roomInfo}>
        <Text style={styles.roomTitle}>{room.title}</Text>
        <Text style={styles.roomHost}>Hosted by @{room.host?.username}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#999" />
            <Text style={styles.statText}>{allParticipants.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="mic" size={16} color="#999" />
            <Text style={styles.statText}>{room.speakers?.length}</Text>
          </View>
        </View>
      </View>

      {/* Participants Grid */}
      <FlatList
        data={allParticipants}
        renderItem={renderParticipant}
        keyExtractor={(item, index) => `${item.user._id}-${index}`}
        numColumns={4}
        contentContainerStyle={styles.participantsList}
        showsVerticalScrollIndicator={false}
      />

      {/* Hand Raised List (for host) */}
      {isHost && room.handRaised?.length > 0 && (
        <View style={styles.handRaisedContainer}>
          <Text style={styles.handRaisedTitle}>
            Hand Raised ({room.handRaised.length})
          </Text>
          <FlatList
            horizontal
            data={room.handRaised}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.handRaisedItem}
                onPress={() => handleMakeSpeaker(item.user._id)}
              >
                <Image
                  source={{
                    uri: item.user?.avatar || "https://via.placeholder.com/40",
                  }}
                  style={styles.handRaisedAvatar}
                />
                <Ionicons
                  name="hand-right"
                  size={16}
                  color="#ffaa00"
                  style={styles.handIcon}
                />
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.user._id}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {isSpeaker && (
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.mutedButton]}
            onPress={handleToggleMute}
          >
            <Ionicons
              name={isMuted ? "mic-off" : "mic"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        )}

        {!isSpeaker && !isHost && (
          <TouchableOpacity
            style={[
              styles.controlButton,
              isHandRaised && styles.handRaisedButton,
            ]}
            onPress={handleRaiseHand}
          >
            <Ionicons name="hand-right" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => {
            leaveRoom();
            navigation.goBack();
          }}
        >
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 68, 68, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveText: {
    color: "#ff4444",
    fontSize: 12,
    fontWeight: "bold",
  },
  roomInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "center",
  },
  roomTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
  },
  roomHost: {
    fontSize: 14,
    color: "#999",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: "#999",
  },
  participantsList: {
    paddingHorizontal: 8,
  },
  participantItem: {
    width: "25%",
    alignItems: "center",
    padding: 8,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2a2a2a",
  },
  micBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  micBadgeMuted: {
    backgroundColor: "#ff4444",
  },
  verifiedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  participantName: {
    fontSize: 12,
    color: "#fff",
    textAlign: "center",
  },
  handRaisedContainer: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  handRaisedTitle: {
    color: "#ffaa00",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  handRaisedItem: {
    marginRight: 12,
    position: "relative",
  },
  handRaisedAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2a2a2a",
  },
  handIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#000",
    borderRadius: 10,
    padding: 2,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
    backgroundColor: "#1a1a1a",
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  mutedButton: {
    backgroundColor: "#ff4444",
  },
  handRaisedButton: {
    backgroundColor: "#ffaa00",
  },
  leaveButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: "#ff4444",
  },
  leaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LiveRoomScreen;
