import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
} from "react-native";
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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      // Handle selection
      console.log(result.assets[0].uri);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      if (selectedMode === "photo") {
        try {
          const photo = await cameraRef.current.takePictureAsync();
          console.log(photo.uri);
          // Navigate to preview/edit screen
        } catch (e) {
          console.error(e);
        }
      } else {
        if (isRecording) {
          cameraRef.current.stopRecording();
          setIsRecording(false);
        } else {
          setIsRecording(true);
          try {
            const video = await cameraRef.current.recordAsync();
            console.log(video.uri);
            // Navigate to preview/edit screen
          } catch (e) {
            console.error(e);
            setIsRecording(false);
          }
        }
      }
    }
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
                <Text style={styles.bottomTabText}>LIVE</Text>
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
    paddingHorizontal: 16,
    marginTop: 10,
  },
  closeButton: {
    padding: 8,
  },
  addSoundButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addSoundText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  sidebar: {
    position: "absolute",
    left: 16,
    top: 100,
    alignItems: "center",
    zIndex: 10,
  },
  sidebarItem: {
    marginBottom: 20,
    alignItems: "center",
  },
  sidebarLabel: {
    color: "white",
    fontSize: 10,
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomControls: {
    paddingBottom: 20,
    backgroundColor: "transparent", // Gradient could be added here
  },
  modeSelectorContainer: {
    height: 40,
    marginBottom: 10,
  },
  modeSelectorContent: {
    alignItems: "center",
    paddingHorizontal: width / 2 - 30, // Center the first item roughly
  },
  modeItem: {
    paddingHorizontal: 15,
    justifyContent: "center",
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  activeModeItem: {
    backgroundColor: "rgba(100, 100, 100, 0.5)", // Semi-transparent pill
  },
  modeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
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
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  shutterButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: "rgba(255, 255, 255, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  shutterButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "white",
  },
  recordingShutter: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: "#FE2C55",
  },
  sideButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
  },
  sideButtonLabel: {
    color: "white",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },
  uploadPreview: {
    width: 32,
    height: 32,
    borderRadius: 6,
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
    marginTop: 5,
  },
  bottomTabText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 15,
  },
  activeBottomTab: {
    color: "white",
  },
  permissionButton: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignSelf: "center",
  },
});
