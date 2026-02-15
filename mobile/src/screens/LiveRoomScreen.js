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
  ImageBackground,
  Dimensions,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import io from "socket.io-client";
import { BASE_URL } from "../config/api";
import { AuthContext } from "../context/AuthContext";
import ProfileBadgeFrame from "../components/ProfileBadgeFrame";

const { width, height } = Dimensions.get("window");

const SOCKET_URL = BASE_URL.replace("/api", "");

const LiveRoomScreen = ({ route, navigation }) => {
  const { userToken, userInfo } = React.useContext(AuthContext);
  const { roomId } = route.params;
  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [roomBackground, setRoomBackground] = useState(null);
  const socketRef = useRef(null);
  const joinSoundRef = useRef(null);

  useEffect(() => {
    loadCurrentUser();
    joinRoom();
    setupSocket();
    loadJoinSound();

    return () => {
      leaveRoom();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (joinSoundRef.current) {
        joinSoundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadJoinSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        {
          uri: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
        },
        { shouldPlay: false, volume: 0.5 },
      );
      joinSoundRef.current = sound;
    } catch (error) {
      console.log("Could not load join sound:", error);
    }
  };

  const playJoinSound = async () => {
    try {
      if (joinSoundRef.current) {
        await joinSoundRef.current.replayAsync();
      }
    } catch (error) {
      console.log("Could not play join sound:", error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      if (userInfo) {
        setCurrentUser(userInfo);
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
      playJoinSound();
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
      const response = await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/join`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      if (response.data.success) {
        setRoom(response.data.data);

        // Emit socket event
        if (userInfo) {
          socketRef.current?.emit("liveroom:join", {
            roomId,
            userId: userInfo._id,
            user: userInfo,
          });
        }
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

  const leaveRoom = async () => {
    try {
      await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
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
      if (isHandRaised) {
        await axios.post(
          `${BASE_URL}/live-rooms/${roomId}/lower-hand`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } },
        );
        setIsHandRaised(false);
        socketRef.current?.emit("liveroom:lower_hand", {
          roomId,
          userId: currentUser._id,
        });
      } else {
        await axios.post(
          `${BASE_URL}/live-rooms/${roomId}/raise-hand`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } },
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
      const response = await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/toggle-mute`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } },
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
      const response = await axios.post(
        `${BASE_URL}/live-rooms/${roomId}/make-speaker`,
        { userId },
        { headers: { Authorization: `Bearer ${userToken}` } },
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
            await axios.post(
              `${BASE_URL}/live-rooms/${roomId}/end`,
              {},
              { headers: { Authorization: `Bearer ${userToken}` } },
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

  const handleChangeBackground = async () => {
    if (!isHost) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant access to your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setRoomBackground(result.assets[0].uri);
      Alert.alert("Success", "Background changed successfully!");
    }
  };

  const handleRemoveSpeaker = async (userId) => {
    if (!isHost) return;

    Alert.alert(
      "Remove Speaker",
      "Are you sure you want to remove this speaker?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await axios.post(
                `${BASE_URL}/live-rooms/${roomId}/remove-speaker`,
                { userId },
                { headers: { Authorization: `Bearer ${userToken}` } },
              );

              if (response.data.success) {
                fetchRoomData();
                socketRef.current?.emit("liveroom:remove_speaker", {
                  roomId,
                  userId,
                });
              }
            } catch (error) {
              console.error("Error removing speaker:", error);
              Alert.alert("Error", "Could not remove speaker");
            }
          },
        },
      ],
    );
  };

  const isHost = currentUser && room?.host?._id === currentUser._id;
  const isSpeaker =
    currentUser && room?.speakers?.some((s) => s.user._id === currentUser._id);

  // Create 8 fixed seats with positions
  const getSeatPositions = () => {
    const centerX = width / 2;
    const centerY = height * 0.4;
    const radius = width * 0.32;

    return [
      { x: centerX, y: centerY - radius - 20, position: 1 }, // Top
      { x: centerX + radius * 0.7, y: centerY - radius * 0.7, position: 2 }, // Top Right
      { x: centerX + radius, y: centerY, position: 3 }, // Right
      { x: centerX + radius * 0.7, y: centerY + radius * 0.7, position: 4 }, // Bottom Right
      { x: centerX, y: centerY + radius + 20, position: 5 }, // Bottom
      { x: centerX - radius * 0.7, y: centerY + radius * 0.7, position: 6 }, // Bottom Left
      { x: centerX - radius, y: centerY, position: 7 }, // Left
      { x: centerX - radius * 0.7, y: centerY - radius * 0.7, position: 8 }, // Top Left
    ];
  };

  const renderSeat = (seatPosition, index) => {
    const speaker = room?.speakers?.[index];
    const isEmpty = !speaker;

    return (
      <View
        key={index}
        style={[
          styles.seatContainer,
          {
            position: "absolute",
            left: seatPosition.x - 40,
            top: seatPosition.y - 40,
          },
        ]}
      >
        {isEmpty ? (
          <TouchableOpacity
            style={styles.emptySeat}
            onPress={() => {
              console.log("Empty seat pressed", {
                isHost,
                isSpeaker,
                handRaisedCount: room.handRaised?.length,
              });
              if (isHost && room.handRaised?.length > 0) {
                handleMakeSpeaker(room.handRaised[0].user._id);
              } else if (!isSpeaker && !isHost) {
                handleRaiseHand();
              } else if (isHost) {
                Alert.alert(
                  "No Hands Raised",
                  "No listeners have raised their hand to speak",
                );
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={28} color="#666" />
            <Text style={styles.seatNumber}>{seatPosition.position}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.occupiedSeat}
            onPress={() => {
              if (isHost && speaker.user._id !== currentUser._id) {
                handleRemoveSpeaker(speaker.user._id);
              }
            }}
            onLongPress={() => {
              Alert.alert(
                speaker.user?.username || "Speaker",
                `Mic: ${speaker.isMuted ? "Muted" : "Unmuted"}\n${speaker.user?.isVerified ? "✓ Verified" : ""}`,
              );
            }}
            activeOpacity={0.8}
          >
            <View style={styles.seatAvatarContainer}>
              {speaker.user?.profileImage || speaker.user?.avatar ? (
                <Image
                  source={{
                    uri: speaker.user?.profileImage || speaker.user?.avatar,
                  }}
                  style={styles.seatAvatar}
                />
              ) : (
                <View style={styles.seatAvatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#666" />
                </View>
              )}
              <View
                style={[
                  styles.micIndicator,
                  speaker.isMuted && styles.micMuted,
                ]}
              >
                <Ionicons
                  name={speaker.isMuted ? "mic-off" : "mic"}
                  size={14}
                  color="#fff"
                />
              </View>
              {speaker.user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#1DA1F2" />
                </View>
              )}
            </View>
            <Text style={styles.seatUsername} numberOfLines={1}>
              {speaker.user?.username}
            </Text>
          </TouchableOpacity>
        )}
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

  const seatPositions = getSeatPositions();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={{
          uri:
            roomBackground ||
            room.host?.activeBackground?.imageUrl ||
            room.backgroundImage ||
            "https://via.placeholder.com/1080x1920/1a1a1a/ffffff?text=Live+Room",
        }}
        style={styles.container}
        resizeMode="cover"
      >
        {/* Dark overlay for readability */}
        <View style={styles.overlay} />

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

        {/* Host/Room Info Center */}
        <View style={styles.centerInfoContainer}>
          <View style={styles.hostAvatarContainer}>
            <ProfileBadgeFrame
              profileImage={room.host?.avatar || room.host?.profileImage}
              badgeImage={room.host?.activeBadge?.imageUrl}
              size={100}
            />
            {room.host?.isVerified && (
              <View style={styles.hostVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color="#1DA1F2" />
              </View>
            )}
          </View>
          <Text style={styles.hostName}>@{room.host?.username}</Text>
          <View style={styles.centerStats}>
            <View style={styles.centerStatItem}>
              <Ionicons name="people" size={18} color="#fff" />
              <Text style={styles.centerStatText}>
                {allParticipants.length}
              </Text>
            </View>
          </View>
        </View>

        {/* 8 Seats in Circle */}
        <View style={styles.seatsContainer}>
          {seatPositions.map((pos, idx) => renderSeat(pos, idx))}
        </View>

        {/* Listeners List at Bottom */}
        {room.listeners?.length > 0 && (
          <View style={styles.listenersContainer}>
            <FlatList
              horizontal
              data={room.listeners}
              renderItem={({ item }) => (
                <View style={styles.listenerItem}>
                  <Image
                    source={{
                      uri:
                        item.user?.avatar || "https://via.placeholder.com/40",
                    }}
                    style={styles.listenerAvatar}
                  />
                </View>
              )}
              keyExtractor={(item, index) =>
                `listener-${item.user._id}-${index}`
              }
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}

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
                      uri:
                        item.user?.avatar || "https://via.placeholder.com/40",
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

          {isHost && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleChangeBackground}
            >
              <Ionicons name="image" size={24} color="#fff" />
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
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
  centerInfoContainer: {
    position: "absolute",
    top: height * 0.25,
    width: width,
    alignItems: "center",
    zIndex: 1,
  },
  hostAvatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  hostVerifiedBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#000",
    borderRadius: 12,
  },
  hostName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  centerStats: {
    flexDirection: "row",
    gap: 16,
  },
  centerStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  centerStatText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  seatsContainer: {
    flex: 1,
    position: "relative",
  },
  seatContainer: {
    width: 80,
    height: 100,
    alignItems: "center",
  },
  emptySeat: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  seatNumber: {
    position: "absolute",
    bottom: -20,
    fontSize: 12,
    color: "#666",
    fontWeight: "bold",
  },
  occupiedSeat: {
    alignItems: "center",
  },
  seatAvatarContainer: {
    position: "relative",
    marginBottom: 4,
  },
  seatAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2a2a2a",
    borderWidth: 2,
    borderColor: "#fff",
  },
  seatAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2a2a2a",
    borderWidth: 2,
    borderColor: "#666",
    justifyContent: "center",
    alignItems: "center",
  },
  micIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#4CAF50",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  micMuted: {
    backgroundColor: "#ff4444",
  },
  verifiedBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#000",
    borderRadius: 10,
  },
  seatUsername: {
    fontSize: 11,
    color: "#fff",
    textAlign: "center",
    maxWidth: 80,
    fontWeight: "500",
  },
  listenersContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  listenerItem: {
    marginRight: 8,
  },
  listenerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2a2a2a",
    borderWidth: 2,
    borderColor: "#000",
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
