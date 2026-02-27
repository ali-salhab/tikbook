import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
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
  const [statusText, setStatusText] = useState("");
  const [selectedColor, setSelectedColor] = useState(BG_COLORS[0]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

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
    }
  };

  const removeImage = () => setSelectedImage(null);

  const handlePost = async () => {
    if (!statusText.trim() && !selectedImage) {
      Alert.alert("تنبيه", "يرجى كتابة نص أو اختيار صورة للحالة");
      return;
    }
    setLoading(true);
    try {
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
      }
      await axios.post(`${BASE_URL}/status`, formData, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "multipart/form-data",
        },
      });
      Alert.alert("تم", "تم نشر حالتك بنجاح", [
        { text: "حسناً", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      const msg =
        e?.response?.data?.message || "حدث خطأ أثناء نشر الحالة، حاول مجدداً";
      Alert.alert("خطأ", msg);
    } finally {
      setLoading(false);
    }
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
            !statusText.trim() && !selectedImage && styles.postBtnDisabled,
          ]}
          onPress={handlePost}
          disabled={(!statusText.trim() && !selectedImage) || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.postBtnText}>نشر</Text>
          )}
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
            { backgroundColor: selectedImage ? "#000" : selectedColor },
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
                onPress={removeImage}
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

        {/* Color picker */}
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

        {/* Image picker button */}
        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
          <Ionicons name="image-outline" size={22} color="#FE2C55" />
          <Text style={styles.imagePickerText}>
            {selectedImage ? "تغيير الصورة" : "إضافة صورة"}
          </Text>
        </TouchableOpacity>

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
  imagePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FE2C55",
    borderStyle: "dashed",
    justifyContent: "center",
  },
  imagePickerText: {
    color: "#FE2C55",
    fontSize: 15,
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
