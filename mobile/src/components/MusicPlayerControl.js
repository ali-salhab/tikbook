import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";

const MusicPlayerControl = ({
  visible,
  onClose,
  musicPlayer,
  onControlMusic,
  isHost,
}) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(musicPlayer?.volume || 50);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    if (musicPlayer?.isPlaying && musicPlayer?.currentTrack && !isHost) {
      loadAndPlayMusic(musicPlayer.currentTrack);
    } else if (!musicPlayer?.isPlaying && sound) {
      sound.pauseAsync();
      setIsPlaying(false);
    }

    if (musicPlayer?.volume !== undefined) {
      setVolume(musicPlayer.volume);
      if (sound) {
        sound.setVolumeAsync(musicPlayer.volume / 100);
      }
    }
  }, [musicPlayer]);

  const loadAndPlayMusic = async (uri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          volume: volume / 100,
        },
        onPlaybackStatusUpdate,
      );

      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error("Error loading music:", error);
      Alert.alert("خطأ", "فشل في تحميل الموسيقى");
    }
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);

      if (status.didJustFinish) {
        setIsPlaying(false);
        if (isHost) {
          onControlMusic("stop", null, null, volume);
        }
      }
    }
  };

  const handlePickMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        await loadAndPlayMusic(file.uri);
        onControlMusic("play", file.uri, file.name, volume);
      }
    } catch (error) {
      console.error("Error picking music:", error);
      Alert.alert("خطأ", "فشل في اختيار الملف");
    }
  };

  const handlePlayPause = async () => {
    if (!sound) {
      if (isHost) {
        handlePickMusic();
      }
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        if (isHost) {
          onControlMusic("pause", null, null, volume);
        }
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        if (isHost) {
          onControlMusic(
            "play",
            musicPlayer?.currentTrack,
            musicPlayer?.trackName,
            volume,
          );
        }
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  const handleStop = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setPosition(0);
        if (isHost) {
          onControlMusic("stop", null, null, volume);
        }
      } catch (error) {
        console.error("Error stopping music:", error);
      }
    }
  };

  const handleVolumeChange = async (value) => {
    setVolume(value);
    if (sound) {
      await sound.setVolumeAsync(value / 100);
    }
  };

  const handleVolumeChangeComplete = (value) => {
    if (isHost) {
      onControlMusic("volume", null, null, value);
    }
  };

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>مشغل الموسيقى</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Player Info */}
          <View style={styles.playerInfo}>
            <View style={styles.musicIcon}>
              <Ionicons
                name="musical-notes"
                size={48}
                color={isPlaying ? "#FE2C55" : "#666"}
              />
            </View>
            <Text style={styles.trackName} numberOfLines={2}>
              {musicPlayer?.trackName || "لم يتم اختيار موسيقى"}
            </Text>
          </View>

          {/* Progress Bar */}
          {sound && (
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(position / duration) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          )}

          {/* Controls */}
          <View style={styles.controls}>
            {isHost && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePickMusic}
              >
                <Ionicons name="folder-open" size={28} color="#666" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={36}
                color="#fff"
              />
            </TouchableOpacity>

            {sound && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleStop}
              >
                <Ionicons name="stop" size={28} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Volume Control */}
          <View style={styles.volumeContainer}>
            <Ionicons name="volume-low" size={20} color="#666" />
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={100}
              value={volume}
              onValueChange={handleVolumeChange}
              onSlidingComplete={handleVolumeChangeComplete}
              minimumTrackTintColor="#FE2C55"
              maximumTrackTintColor="#ddd"
              thumbTintColor="#FE2C55"
              disabled={!isHost}
            />
            <Ionicons name="volume-high" size={20} color="#666" />
            <Text style={styles.volumeText}>{Math.round(volume)}%</Text>
          </View>

          {!isHost && (
            <Text style={styles.infoText}>
              المذيع فقط يمكنه التحكم في الموسيقى
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  playerInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  musicIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  trackName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FE2C55",
  },
  timeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginBottom: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FE2C55",
    justifyContent: "center",
    alignItems: "center",
  },
  volumeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  volumeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    minWidth: 40,
    textAlign: "center",
  },
  infoText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default MusicPlayerControl;
