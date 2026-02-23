import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BASE_URL } from "../config/api";
import { AuthContext } from "../context/AuthContext";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  {
    id: "chat",
    name: "دردشة",
    icon: "chatbubbles",
    color: ["#00BFFF", "#1E90FF"],
  },
  {
    id: "music",
    name: "موسيقى",
    icon: "musical-notes",
    color: ["#FF1493", "#C71585"],
  },
  {
    id: "gaming",
    name: "ألعاب",
    icon: "game-controller",
    color: ["#00FF7F", "#228B22"],
  },
  {
    id: "education",
    name: "تعليم",
    icon: "school",
    color: ["#FFD700", "#DAA520"],
  },
  {
    id: "business",
    name: "أعمال",
    icon: "briefcase",
    color: ["#A020F0", "#6A0DAD"],
  },
  { id: "other", name: "أخرى", icon: "apps", color: ["#FF6B35", "#E84855"] },
];

const CreateLiveRoomScreen = ({ navigation }) => {
  const { userToken } = React.useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("chat");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setCoverImage(result.assets[0].uri);
  };

  const handleCreateRoom = async () => {
    if (!title.trim()) {
      Alert.alert("مطلوب", "يرجى إدخال عنوان للغرفة");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", category);
      formData.append("isPrivate", String(isPrivate));

      if (coverImage) {
        const filename = coverImage.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";
        formData.append("coverImage", {
          uri: coverImage,
          name: filename,
          type,
        });
      }

      const res = await axios.post(`${BASE_URL}/live-rooms/create`, formData, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        navigation.replace("LiveRoom", { roomId: res.data.data.roomId });
      }
    } catch (err) {
      Alert.alert("خطأ", err.response?.data?.message || "تعذّر إنشاء الغرفة");
    } finally {
      setLoading(false);
    }
  };

  const selectedCat = CATEGORIES.find((c) => c.id === category);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Blurred cover preview in background */}
      {coverImage && (
        <Image
          source={{ uri: coverImage }}
          style={StyleSheet.absoluteFill}
          blurRadius={18}
        />
      )}
      <LinearGradient
        colors={
          coverImage
            ? ["rgba(0,0,0,0.5)", "rgba(0,0,0,0.78)", "#000"]
            : ["#0D0D1A", "#130D26", "#0A0A14"]
        }
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Feather name="x" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إنشاء غرفة بث</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Cover card */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={pickImage}
          style={styles.coverCard}
        >
          {coverImage ? (
            <>
              <Image
                source={{ uri: coverImage }}
                style={styles.coverImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.72)"]}
                style={styles.coverGradient}
              />
              <View style={styles.changeCoverBtn}>
                <Ionicons name="camera" size={14} color="#FFF" />
                <Text style={styles.changeCoverText}>تغيير الغلاف</Text>
              </View>
            </>
          ) : (
            <View style={styles.coverEmpty}>
              <View style={styles.cameraCircle}>
                <Ionicons name="camera-outline" size={32} color="#FFF" />
              </View>
              <Text style={styles.coverEmptyTitle}>إضافة صورة غلاف</Text>
              <Text style={styles.coverEmptyHint}>
                اضغط لاختيار صورة للغرفة
              </Text>
            </View>
          )}
          {/* LIVE badge */}
          <View style={styles.liveBadge}>
            <MaterialCommunityIcons name="broadcast" size={10} color="#FFF" />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </TouchableOpacity>

        {/* Title input */}
        <BlurView intensity={18} tint="dark" style={styles.inputWrap}>
          <Ionicons
            name="pencil-outline"
            size={18}
            color="rgba(255,255,255,0.5)"
          />
          <TextInput
            style={styles.titleInput}
            placeholder="عنوان الغرفة…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          {title.length > 0 && (
            <TouchableOpacity onPress={() => setTitle("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color="rgba(255,255,255,0.4)"
              />
            </TouchableOpacity>
          )}
        </BlurView>

        {/* Category */}
        <Text style={styles.sectionLabel}>اختر القناة</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.75}
                style={styles.catItem}
              >
                {active ? (
                  <LinearGradient colors={cat.color} style={styles.catCircle}>
                    <Ionicons name={cat.icon} size={22} color="#FFF" />
                  </LinearGradient>
                ) : (
                  <View style={[styles.catCircle, styles.catCircleInactive]}>
                    <Ionicons
                      name={cat.icon}
                      size={22}
                      color="rgba(255,255,255,0.55)"
                    />
                  </View>
                )}
                <Text
                  style={[styles.catLabel, active && styles.catLabelActive]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Privacy */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setIsPrivate(!isPrivate)}
          style={styles.privacyRow}
        >
          <View style={styles.privacyLeft}>
            <View
              style={[
                styles.privacyIcon,
                isPrivate && { backgroundColor: "rgba(255,68,68,0.18)" },
              ]}
            >
              <Ionicons
                name={isPrivate ? "lock-closed" : "globe-outline"}
                size={20}
                color={isPrivate ? "#FF4444" : "#00F2EA"}
              />
            </View>
            <View>
              <Text style={styles.privacyTitle}>
                {isPrivate ? "غرفة خاصة" : "غرفة عامة"}
              </Text>
              <Text style={styles.privacySub}>
                {isPrivate ? "بالدعوة فقط" : "يمكن للجميع الانضمام"}
              </Text>
            </View>
          </View>
          <View style={[styles.toggle, isPrivate && styles.toggleOn]}>
            <View
              style={[styles.toggleThumb, isPrivate && styles.toggleThumbOn]}
            />
          </View>
        </TouchableOpacity>

        {/* Go Live */}
        <TouchableOpacity
          onPress={handleCreateRoom}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.goLiveWrap}
        >
          <LinearGradient
            colors={
              selectedCat
                ? [selectedCat.color[0], selectedCat.color[1], "#FF1493"]
                : ["#FF1493", "#C71585"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.goLiveBtn}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="broadcast"
                  size={22}
                  color="#FFF"
                />
                <Text style={styles.goLiveText}>بدء البث المباشر</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D1A" },
  scroll: { paddingHorizontal: 18 },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },

  /* cover */
  coverCard: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  coverImage: { ...StyleSheet.absoluteFillObject },
  coverGradient: { ...StyleSheet.absoluteFillObject },
  coverEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  cameraCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  coverEmptyTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
  },
  coverEmptyHint: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  changeCoverBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeCoverText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  liveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FF1493",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  /* input */
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 28,
  },
  titleInput: { flex: 1, fontSize: 16, color: "#FFF", fontWeight: "600" },

  /* category */
  sectionLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  catItem: { width: (width - 36 - 48) / 3, alignItems: "center", gap: 6 },
  catCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },
  catCircleInactive: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  catLabel: { color: "rgba(255,255,255,0.45)", fontSize: 12 },
  catLabelActive: { color: "#FFF", fontWeight: "700" },

  /* privacy */
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 32,
  },
  privacyLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  privacyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,242,234,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  privacyTitle: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  privacySub: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: "#FF4444" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  /* go live */
  goLiveWrap: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  goLiveBtn: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  goLiveText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export default CreateLiveRoomScreen;
