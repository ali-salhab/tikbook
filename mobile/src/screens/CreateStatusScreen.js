import React, { useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import { AuthContext } from "../context/AuthContext";
import { useUpload } from "../context/UploadContext";
import { BASE_URL } from "../config/api";

const BG_COLORS = [
  "#FE2C55",
  "#25D366",
  "#1DA1F2",
  "#FF8C00",
  "#9B59B6",
  "#E74C3C",
  "#2ECC71",
  "#000000",
];

const CreateStatusScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { startUpload } = useUpload();
  const [statusText, setStatusText] = useState("");
  const [selectedColor, setSelectedColor] = useState(BG_COLORS[0]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoRef = useRef(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مرفوض", "يرجى السماح بالوصول إلى مكتبة الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setSelectedImage(result.assets[0]);
      setSelectedVideo(null);
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("إذن مرفوض", "يرجى السماح بالوصول إلى مكتبة الفيديو");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 30,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setSelectedVideo(result.assets[0]);
      setSelectedImage(null);
    }
  };

  const removeMedia = () => {
    setSelectedImage(null);
    setSelectedVideo(null);
  };

  const handlePost = () => {
    if (!statusText.trim() && !selectedImage && !selectedVideo) {
      Alert.alert("تنبيه", "يرجى كتابة نص أو اختيار صورة أو فيديو للحالة");
      return;
    }

    const formData = new FormData();
    if (statusText.trim()) formData.append("text", statusText.trim());
    formData.append("bgColor", selectedColor);
    if (selectedImage) {
      const uri = selectedImage.uri;
      const filename = uri.split("/").pop();
      const ext = filename.split(".").pop().toLowerCase();
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "gif"
            ? "image/gif"
            : "image/jpeg";
      formData.append("image", { uri, name: filename, type: mimeType });
    } else if (selectedVideo) {
      const uri = selectedVideo.uri;
      const filename = uri.split("/").pop();
      const ext = filename.split(".").pop().toLowerCase() || "mp4";
      formData.append("image", { uri, name: filename, type: `video/${ext}` });
    }

    // Navigate back first so the FloatingUploadOverlay is visible
    navigation.goBack();

    // Fire & forget — upload runs in background with floating indicator
    startUpload(formData, userToken, `${BASE_URL}/status`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إنشاء حالة</Text>
        <TouchableOpacity
          style={[
            styles.postBtn,
            !statusText.trim() &&
              !selectedImage &&
              !selectedVideo &&
              styles.postBtnDisabled,
          ]}
          onPress={handlePost}
          disabled={!statusText.trim() && !selectedImage && !selectedVideo}
        >
          <Text style={styles.postBtnText}>نشر</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Preview */}
        <View
          style={[
            styles.preview,
            {
              backgroundColor:
                selectedImage || selectedVideo ? "#000" : selectedColor,
            },
          ]}
        >
          {selectedImage ? (
            <>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
              />
              {statusText ? (
                <View style={styles.previewTextOverlay}>
                  <Text style={styles.previewText}>{statusText}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={removeMedia}
              >
                <Ionicons name="close-circle" size={26} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : selectedVideo ? (
            <>
              <Video
                ref={videoRef}
                source={{ uri: selectedVideo.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                shouldPlay
                isLooping
                isMuted={false}
                useNativeControls={false}
              />
              {statusText ? (
                <View style={styles.previewTextOverlay}>
                  <Text style={styles.previewText}>{statusText}</Text>
                </View>
              ) : null}
              <View style={styles.videoLabel}>
                <Ionicons name="videocam" size={16} color="#FFF" />
                <Text style={{ color: "#FFF", fontSize: 12, marginLeft: 4 }}>
                  فيديو قصير
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={removeMedia}
              >
                <Ionicons name="close-circle" size={26} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.previewText}>
              {statusText || "اكتب شيئاً..."}
            </Text>
          )}
        </View>

        {/* Color picker — only when no media */}
        {!selectedImage && !selectedVideo && (
          <View style={styles.colorRow}>
            {BG_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>
        )}

        {/* Media picker buttons */}
        <View style={styles.mediaRow}>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={22} color="#FE2C55" />
            <Text style={styles.mediaBtnText}>
              {selectedImage ? "تغيير الصورة" : "إضافة صورة"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={22} color="#FE2C55" />
            <Text style={styles.mediaBtnText}>
              {selectedVideo ? "تغيير الفيديو" : "إضافة فيديو"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Text input */}
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={statusText}
            onChangeText={setStatusText}
            placeholder="اكتب حالتك هنا..."
            placeholderTextColor="#999"
            multiline
            maxLength={200}
            autoFocus
            textAlign="right"
          />
          <Text style={styles.charCount}>{statusText.length}/200</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#000" },
  postBtn: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  postBtnDisabled: { backgroundColor: "#F0A0B0" },
  postBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  preview: {
    margin: 16,
    borderRadius: 16,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  previewText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    resizeMode: "cover",
  },
  previewTextOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  videoLabel: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FE2C55",
    borderStyle: "dashed",
    justifyContent: "center",
  },
  mediaBtnText: {
    color: "#FE2C55",
    fontSize: 14,
    fontWeight: "600",
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 12,
    paddingHorizontal: 16,
    flexWrap: "wrap",
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: {
    borderColor: "#000",
    transform: [{ scale: 1.2 }],
  },
  inputBox: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
  },
  input: {
    fontSize: 16,
    color: "#000",
    minHeight: 80,
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
});

export default CreateStatusScreen;
