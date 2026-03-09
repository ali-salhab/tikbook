import React, { useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { ms, fs } from "../utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import { useUpload } from "../context/UploadContext";
import axios from "axios";

const { width, height } = Dimensions.get("window");

const PostEditScreen = ({ navigation, route }) => {
  const initialMedia =
    route.params?.mediaItems ||
    (route.params?.mediaUri
      ? [{ uri: route.params.mediaUri, type: route.params.mediaType }]
      : []);
  const { userToken } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { startUpload, updateProgress, finishUpload } = useUpload();
  const videoRef = useRef(null);

  const [mediaItems, setMediaItems] = useState(initialMedia);
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const privacyOptions = [
    { value: "public", label: "عام", icon: "earth" },
    { value: "friends", label: "أصدقاء", icon: "people" },
    { value: "private", label: "خاص", icon: "lock-closed" },
  ];

  const handleUpload = async () => {
    if (!description.trim()) {
      Alert.alert("مطلوب", "الرجاء إضافة وصف للمنشور");
      return;
    }

    if (!mediaItems.length) {
      Alert.alert("خطأ", "لا يوجد وسائط مرفوعة");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    startUpload();

    try {
      // Create FormData
      const formData = new FormData();

      mediaItems.forEach((item, index) => {
        const uriParts = item.uri.split(".");
        const fileExtension =
          uriParts[uriParts.length - 1] ||
          (item.type === "video" ? "mp4" : "jpg");
        const fileName = `${item.type || "media"}-${Date.now()}-${index}.${fileExtension}`;

        formData.append("video", {
          uri: item.uri,
          type:
            item.type === "video"
              ? `video/${fileExtension}`
              : `image/${fileExtension}`,
          name: fileName,
        });
      });

      // Add metadata
      formData.append("description", description.trim());
      formData.append("privacy", privacy);
      formData.append("allowComments", allowComments.toString());
      formData.append("allowDuet", allowDuet.toString());
      formData.append("allowStitch", allowStitch.toString());

      // Start background upload via Context
      startUpload(formData, userToken);

      // Navigate away immediately
      Alert.alert(
        "جاري الرفع",
        "سيتم رفع المنشور في الخلفية، يمكنك استكمال التصفح.",
        [
          {
            text: "حسناً",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "MainTabs" }],
              });
            },
          },
        ],
      );
    } catch (error) {
      console.error("❌ Upload preparation error:", error);
      Alert.alert("خطأ", "فشل تجهيز المنشور");
    } finally {
      // Clean up if needed
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          disabled={uploading}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>منشور جديد</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mediaItems.length > 1 && (
          <Text style={styles.multiHint}>
            تم اختيار {mediaItems.length} ملف (سيتم رفعهم في منشور واحد)
          </Text>
        )}
        {/* Media Preview */}
        {mediaItems.length > 1 && (
          <Text style={styles.multiHint}>
            تم اختيار {mediaItems.length} ملف (سيتم رفعهم في منشور واحد)
          </Text>
        )}
        <View style={styles.previewContainer}>
          {mediaItems[0]?.type === "video" ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaItems[0].uri }}
              style={styles.preview}
              resizeMode="cover"
              shouldPlay
              isLooping
              isMuted={false}
              useNativeControls={false}
            />
          ) : (
            <Image
              source={{ uri: mediaItems[0]?.uri }}
              style={styles.preview}
              resizeMode="cover"
            />
          )}

          {/* Play button overlay for video */}
          {mediaItems[0]?.type === "video" && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => {
                if (videoRef.current) {
                  videoRef.current.getStatusAsync().then((status) => {
                    if (status.isPlaying) {
                      videoRef.current.pauseAsync();
                    } else {
                      videoRef.current.playAsync();
                    }
                  });
                }
              }}
            >
              <Ionicons
                name="play-circle"
                size={60}
                color="rgba(255,255,255,0.8)"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الوصف</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="أضف وصفاً لمنشورك..."
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
            textAlign="right"
          />
          <Text style={styles.charCount}>{description.length}/300</Text>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الخصوصية</Text>
          <View style={styles.privacyOptions}>
            {privacyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.privacyOption,
                  privacy === option.value && styles.privacyOptionActive,
                ]}
                onPress={() => setPrivacy(option.value)}
                disabled={uploading}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={privacy === option.value ? "#FE2C55" : "#FFF"}
                />
                <Text
                  style={[
                    styles.privacyLabel,
                    privacy === option.value && styles.privacyLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإعدادات</Text>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setAllowComments(!allowComments)}
            disabled={uploading}
          >
            <View style={styles.toggleLeft}>
              <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
              <Text style={styles.toggleLabel}>السماح بالتعليقات</Text>
            </View>
            <View style={[styles.toggle, allowComments && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleThumb,
                  allowComments && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setAllowDuet(!allowDuet)}
            disabled={uploading}
          >
            <View style={styles.toggleLeft}>
              <Ionicons name="people-outline" size={20} color="#FFF" />
              <Text style={styles.toggleLabel}>السماح بالديو</Text>
            </View>
            <View style={[styles.toggle, allowDuet && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleThumb,
                  allowDuet && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setAllowStitch(!allowStitch)}
            disabled={uploading}
          >
            <View style={styles.toggleLeft}>
              <Ionicons name="git-merge-outline" size={20} color="#FFF" />
              <Text style={styles.toggleLabel}>السماح بالدمج</Text>
            </View>
            <View style={[styles.toggle, allowStitch && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleThumb,
                  allowStitch && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Upload Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        {uploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${uploadProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              جاري الرفع... {uploadProgress}%
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.uploadButton,
            uploading && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#FFF" />
              <Text style={styles.uploadButtonText}>نشر</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ms(16),
    paddingBottom: ms(10),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerButton: {
    padding: ms(8),
  },
  headerTitle: {
    color: "#FFF",
    fontSize: fs(18),
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  previewContainer: {
    width: width,
    height: width * 1.33,
    backgroundColor: "#1a1a1a",
    position: "relative",
  },
  multiHint: {
    color: "#bbb",
    textAlign: "center",
    marginBottom: ms(6),
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: ms(-30),
    marginLeft: ms(-30),
  },
  section: {
    padding: ms(16),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "bold",
    marginBottom: ms(12),
    textAlign: "right",
  },
  descriptionInput: {
    color: "#FFF",
    fontSize: fs(15),
    minHeight: ms(80),
    textAlignVertical: "top",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: ms(8),
    padding: ms(12),
  },
  charCount: {
    color: "#888",
    fontSize: fs(12),
    textAlign: "right",
    marginTop: ms(4),
  },
  privacyOptions: {
    flexDirection: "row",
    gap: ms(12),
  },
  privacyOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(8),
    padding: ms(12),
    borderRadius: ms(8),
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  privacyOptionActive: {
    backgroundColor: "rgba(254,44,85,0.1)",
    borderColor: "#FE2C55",
  },
  privacyLabel: {
    color: "#FFF",
    fontSize: fs(14),
    fontWeight: "600",
  },
  privacyLabelActive: {
    color: "#FE2C55",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: ms(12),
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(12),
  },
  toggleLabel: {
    color: "#FFF",
    fontSize: fs(15),
  },
  toggle: {
    width: ms(50),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: ms(2),
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#FE2C55",
  },
  toggleThumb: {
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    backgroundColor: "#FFF",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  footer: {
    padding: ms(16),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  progressContainer: {
    marginBottom: ms(12),
  },
  progressBar: {
    height: ms(4),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: ms(2),
    overflow: "hidden",
    marginBottom: ms(8),
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FE2C55",
  },
  progressText: {
    color: "#FFF",
    fontSize: fs(12),
    textAlign: "center",
  },
  uploadButton: {
    backgroundColor: "#FE2C55",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(8),
    padding: ms(16),
    borderRadius: ms(8),
  },
  uploadButtonDisabled: {
    backgroundColor: "#666",
  },
  uploadButtonText: {
    color: "#FFF",
    fontSize: fs(16),
    fontWeight: "bold",
  },
});

export default PostEditScreen;
