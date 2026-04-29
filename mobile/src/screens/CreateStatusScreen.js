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
import { ms, fs } from "../utils/responsive";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import { AuthContext } from "../context/AuthContext";
import { useUpload } from "../context/UploadContext";
import { BASE_URL } from "../config/api";

const BG_COLORS = [
  "#FF2D92",
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
            <Ionicons name="image-outline" size={22} color="#FF2D92" />
            <Text style={styles.mediaBtnText}>
              {selectedImage ? "تغيير الصورة" : "إضافة صورة"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={22} color="#FF2D92" />
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
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: { fontSize: fs(17), fontWeight: "700", color: "#000" },
  postBtn: {
    backgroundColor: "#FF2D92",
    paddingHorizontal: ms(18),
    paddingVertical: ms(7),
    borderRadius: ms(20),
    minWidth: ms(60),
    alignItems: "center",
  },
  postBtnDisabled: { backgroundColor: "#F0A0B0" },
  postBtnText: { color: "#FFF", fontWeight: "700", fontSize: fs(14) },
  preview: {
    margin: ms(16),
    borderRadius: ms(16),
    height: ms(200),
    justifyContent: "center",
    alignItems: "center",
    padding: ms(20),
  },
  previewText: {
    color: "#FFF",
    fontSize: fs(22),
    fontWeight: "700",
    textAlign: "center",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ms(16),
    resizeMode: "cover",
  },
  previewTextOverlay: {
    position: "absolute",
    bottom: ms(12),
    left: ms(12),
    right: ms(12),
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: ms(8),
    paddingHorizontal: ms(10),
    paddingVertical: ms(6),
  },
  removeImageBtn: {
    position: "absolute",
    top: ms(8),
    right: ms(8),
  },
  videoLabel: {
    position: "absolute",
    top: ms(10),
    left: ms(10),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: ms(12),
    paddingHorizontal: ms(8),
    paddingVertical: ms(4),
  },
  mediaRow: {
    flexDirection: "row",
    gap: ms(12),
    marginHorizontal: ms(16),
    marginBottom: ms(12),
  },
  mediaBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: ms(6),
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: "#FF2D92",
    borderStyle: "dashed",
    justifyContent: "center",
  },
  mediaBtnText: {
    color: "#FF2D92",
    fontSize: fs(14),
    fontWeight: "600",
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: ms(12),
    marginVertical: ms(12),
    paddingHorizontal: ms(16),
    flexWrap: "wrap",
  },
  colorDot: {
    width: ms(34),
    height: ms(34),
    borderRadius: ms(17),
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotSelected: {
    borderColor: "#000",
    transform: [{ scale: 1.2 }],
  },
  inputBox: {
    marginHorizontal: ms(16),
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: ms(12),
    padding: ms(12),
    minHeight: ms(100),
  },
  input: {
    fontSize: fs(16),
    color: "#000",
    minHeight: ms(80),
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: fs(12),
    color: "#999",
    marginTop: ms(4),
  },
});

export default CreateStatusScreen;
