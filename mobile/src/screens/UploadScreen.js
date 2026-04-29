import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  Feather,
  Entypo,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { ms, fs } from "../utils/responsive";

const { width, height } = Dimensions.get("window");

const MODES = [
  { id: "10m", label: "10 د" },
  { id: "60s", label: "60 ث" },
  { id: "15s", label: "15 ث" },
  { id: "photo", label: "صورة" },
  { id: "text", label: "نص" },
];

export default function UploadScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [facing, setFacing] = useState("back");
  const [flash, setFlash] = useState("off");
  const [selectedMode, setSelectedMode] = useState("photo");
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    if (!micPermission?.granted) {
      requestMicPermission();
    }
  }, []);

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === "off" ? "on" : "off"));
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const mediaItems = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
      }));

      console.log("Selected from gallery:", mediaItems);

      navigation.navigate("PostEdit", {
        mediaItems,
      });
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      if (selectedMode === "photo") {
        try {
          const photo = await cameraRef.current.takePictureAsync();
          console.log("Photo captured:", photo.uri);

          // Navigate to PostEditScreen
          navigation.navigate("PostEdit", {
            mediaItems: [{ uri: photo.uri, type: "image" }],
          });
        } catch (e) {
          console.error("Photo capture error:", e);
        }
      } else {
        if (isRecording) {
          cameraRef.current.stopRecording();
          setIsRecording(false);
        } else {
          setIsRecording(true);
          try {
            const video = await cameraRef.current.recordAsync();
            console.log("Video recorded:", video.uri);
            setIsRecording(false);

            // Navigate to PostEditScreen
            navigation.navigate("PostEdit", {
              mediaItems: [{ uri: video.uri, type: "video" }],
            });
          } catch (e) {
            console.error("Video recording error:", e);
            setIsRecording(false);
          }
        }
      }
    }
  };

  const handleGoLive = () => {
    navigation.navigate("Live", { isBroadcaster: true });
  };

  if (!permission || !micPermission) {
    // Camera permissions are still loading.
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "white", textAlign: "center", marginTop: 100 }}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={{ color: "black" }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {isFocused && (
        <CameraView
          style={styles.camera}
          facing={facing}
          flash={flash}
          mode={selectedMode === "photo" ? "picture" : "video"}
          ref={cameraRef}
        >
          <View
            style={[
              styles.overlay,
              { paddingTop: insets.top, paddingBottom: insets.bottom },
            ]}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <View style={{ width: 28 }} />

              <TouchableOpacity style={styles.addSoundButton}>
                <Ionicons
                  name="musical-notes"
                  size={16}
                  color="white"
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.addSoundText}>إضافة صوت</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* Sidebar (Left) */}
            <View style={styles.sidebar}>
              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={toggleCameraFacing}
              >
                <Ionicons
                  name="camera-reverse-outline"
                  size={28}
                  color="white"
                />
                <Text style={styles.sidebarLabel}>قلب</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem}>
                <Ionicons name="speedometer-outline" size={28} color="white" />
                <Text style={styles.sidebarLabel}>السرعة</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem}>
                <Ionicons name="color-filter-outline" size={28} color="white" />
                <Text style={styles.sidebarLabel}>فلاتر</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem}>
                <MaterialIcons name="face" size={28} color="white" />
                <Text style={styles.sidebarLabel}>تجميل</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem}>
                <Ionicons name="timer-outline" size={28} color="white" />
                <Text style={styles.sidebarLabel}>مؤقت</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={toggleFlash}
              >
                <Ionicons
                  name={flash === "on" ? "flash" : "flash-off-outline"}
                  size={28}
                  color="white"
                />
                <Text style={styles.sidebarLabel}>فلاش</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem}>
                <Ionicons name="chevron-down" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              {/* Mode Selector */}
              <View style={styles.modeSelectorContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modeSelectorContent}
                >
                  {MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      onPress={() => setSelectedMode(mode.id)}
                      style={[
                        styles.modeItem,
                        selectedMode === mode.id && styles.activeModeItem,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeText,
                          selectedMode === mode.id && styles.activeModeText,
                        ]}
                      >
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Capture Row */}
              <View style={styles.captureRow}>
                {/* Effects (Left) */}
                <TouchableOpacity style={styles.sideButton}>
                  <MaterialIcons name="face" size={32} color="#fff" />
                  <Text style={styles.sideButtonLabel}>مؤثرات</Text>
                </TouchableOpacity>

                {/* Shutter Button */}
                <TouchableOpacity
                  style={styles.shutterButtonOuter}
                  onPress={handleCapture}
                >
                  <View
                    style={[
                      styles.shutterButtonInner,
                      isRecording && styles.recordingShutter,
                    ]}
                  />
                </TouchableOpacity>

                {/* Upload (Right) */}
                <TouchableOpacity style={styles.sideButton} onPress={pickImage}>
                  <View style={styles.uploadPreview}>
                    <Ionicons name="image" size={24} color="#fff" />
                  </View>
                  <Text style={styles.sideButtonLabel}>تحميل</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Tabs */}
              <View style={styles.bottomTabs}>
                <Text style={[styles.bottomTabText, styles.activeBottomTab]}>
                  منشور
                </Text>
                <TouchableOpacity onPress={handleGoLive}>
                  <Text style={styles.bottomTabText}>LIVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(16),
    marginTop: ms(10),
  },
  closeButton: {
    padding: ms(8),
  },
  addSoundButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    borderRadius: ms(20),
  },
  addSoundText: {
    color: "white",
    fontSize: fs(15),
    fontWeight: "600",
  },
  sidebar: {
    position: "absolute",
    left: ms(16),
    top: ms(100),
    alignItems: "center",
    zIndex: 10,
  },
  sidebarItem: {
    marginBottom: ms(20),
    alignItems: "center",
  },
  sidebarLabel: {
    color: "white",
    fontSize: fs(10),
    marginTop: ms(4),
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomControls: {
    paddingBottom: ms(20),
    backgroundColor: "transparent",
  },
  modeSelectorContainer: {
    height: ms(40),
    marginBottom: ms(10),
  },
  modeSelectorContent: {
    alignItems: "center",
    paddingHorizontal: width / 2 - ms(30),
  },
  modeItem: {
    paddingHorizontal: ms(15),
    justifyContent: "center",
    height: ms(30),
    borderRadius: ms(15),
    marginHorizontal: ms(5),
  },
  activeModeItem: {
    backgroundColor: "rgba(100, 100, 100, 0.5)",
  },
  modeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: fs(13),
    fontWeight: "600",
  },
  activeModeText: {
    color: "white",
    fontWeight: "bold",
  },
  captureRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: ms(20),
    paddingHorizontal: ms(20),
  },
  shutterButtonOuter: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    borderWidth: 5,
    borderColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  shutterButtonInner: {
    width: ms(65),
    height: ms(65),
    borderRadius: ms(32.5),
    backgroundColor: "white",
  },
  recordingShutter: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(4),
    backgroundColor: "#FF3366",
  },
  sideButton: {
    alignItems: "center",
    justifyContent: "center",
    width: ms(60),
  },
  sideButtonLabel: {
    color: "white",
    fontSize: fs(11),
    marginTop: ms(4),
    fontWeight: "600",
  },
  uploadPreview: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(6),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  bottomTabs: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: ms(5),
  },
  bottomTabText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: fs(14),
    fontWeight: "600",
    marginHorizontal: ms(15),
  },
  activeBottomTab: {
    color: "white",
  },
  permissionButton: {
    backgroundColor: "white",
    padding: ms(15),
    borderRadius: ms(10),
    marginTop: ms(20),
    alignSelf: "center",
  },
});
