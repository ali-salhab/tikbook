import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";

const EditProfileScreen = ({ navigation, route }) => {
  const { userInfo, BASE_URL, userToken } = useContext(AuthContext);
  const currentProfile = route.params?.profile || userInfo;

  const [username, setUsername] = useState(currentProfile?.username || "");
  const [bio, setBio] = useState(currentProfile?.bio || "");
  const [profileImage, setProfileImage] = useState(
    currentProfile?.profileImage || null
  );
  const [instagram, setInstagram] = useState(
    currentProfile?.socialLinks?.instagram || ""
  );
  const [youtube, setYoutube] = useState(
    currentProfile?.socialLinks?.youtube || ""
  );
  const [twitter, setTwitter] = useState(
    currentProfile?.socialLinks?.twitter || ""
  );
  const [loading, setLoading] = useState(false);
  const [showInstagramInput, setShowInstagramInput] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [showTwitterInput, setShowTwitterInput] = useState(false);

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("خطأ", "نحتاج إلى إذن الوصول للصور");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.IMAGE,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Error picking image:", error);
      Alert.alert("خطأ", "فشل اختيار الصورة");
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("خطأ", "اسم المستخدم مطلوب");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        username: username.trim(),
        bio: bio.trim(),
        profileImage: profileImage,
        socialLinks: {
          instagram: instagram.trim(),
          youtube: youtube.trim(),
          twitter: twitter.trim(),
        },
      };

      console.log("📤 Updating profile with data:", updateData);

      const res = await axios.put(`${BASE_URL}/users/profile`, updateData, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      console.log("✅ Profile updated successfully:", res.data);

      Alert.alert("نجح", "تم تحديث الملف الشخصي بنجاح", [
        {
          text: "حسناً",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.log("❌ Error updating profile - Full error:", error);
      console.log("❌ Error response:", error.response);
      console.log("❌ Error message:", error.message);
      Alert.alert(
        "خطأ",
        error.response?.data?.message ||
          error.message ||
          "فشل تحديث الملف الشخصي"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تعديل الملف الشخصي</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FE2C55" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#FE2C55" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <Ionicons name="person-circle" size={96} color="#888" />
              )}
              <View style={styles.cameraButton}>
                <Ionicons name="camera" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>تغيير الصورة</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Username */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>اسم المستخدم</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="اسم المستخدم"
                  placeholderTextColor="#666"
                  maxLength={30}
                />
                <Text style={styles.characterCount}>{username.length}/30</Text>
              </View>
              <Text style={styles.hint}>
                tikbook.com/@{username || "username"}
              </Text>
            </View>

            {/* Bio */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>النبذة التعريفية</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="أضف نبذة عنك..."
                  placeholderTextColor="#666"
                  multiline
                  maxLength={80}
                  textAlignVertical="top"
                />
                <Text style={[styles.characterCount, styles.bioCharCount]}>
                  {bio.length}/80
                </Text>
              </View>
            </View>

            {/* Social Links */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الروابط الاجتماعية</Text>

              {/* Instagram */}
              <View>
                <TouchableOpacity
                  style={styles.linkItem}
                  onPress={() => setShowInstagramInput(!showInstagramInput)}
                >
                  <View style={styles.linkLeft}>
                    <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                    <Text style={styles.linkText}>Instagram</Text>
                  </View>
                  <View style={styles.linkRight}>
                    {instagram && (
                      <Text style={styles.linkValue}>@{instagram}</Text>
                    )}
                    <Ionicons
                      name={showInstagramInput ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
                {showInstagramInput && (
                  <View style={styles.socialInputContainer}>
                    <TextInput
                      style={styles.socialInput}
                      value={instagram}
                      onChangeText={setInstagram}
                      placeholder="اسم المستخدم على Instagram"
                      placeholderTextColor="#666"
                    />
                  </View>
                )}
              </View>

              {/* YouTube */}
              <View>
                <TouchableOpacity
                  style={styles.linkItem}
                  onPress={() => setShowYoutubeInput(!showYoutubeInput)}
                >
                  <View style={styles.linkLeft}>
                    <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                    <Text style={styles.linkText}>YouTube</Text>
                  </View>
                  <View style={styles.linkRight}>
                    {youtube && (
                      <Text style={styles.linkValue}>@{youtube}</Text>
                    )}
                    <Ionicons
                      name={showYoutubeInput ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
                {showYoutubeInput && (
                  <View style={styles.socialInputContainer}>
                    <TextInput
                      style={styles.socialInput}
                      value={youtube}
                      onChangeText={setYoutube}
                      placeholder="قناتك على YouTube"
                      placeholderTextColor="#666"
                    />
                  </View>
                )}
              </View>

              {/* Twitter */}
              <View>
                <TouchableOpacity
                  style={styles.linkItem}
                  onPress={() => setShowTwitterInput(!showTwitterInput)}
                >
                  <View style={styles.linkLeft}>
                    <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                    <Text style={styles.linkText}>Twitter</Text>
                  </View>
                  <View style={styles.linkRight}>
                    {twitter && (
                      <Text style={styles.linkValue}>@{twitter}</Text>
                    )}
                    <Ionicons
                      name={showTwitterInput ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
                {showTwitterInput && (
                  <View style={styles.socialInputContainer}>
                    <TextInput
                      style={styles.socialInput}
                      value={twitter}
                      onChangeText={setTwitter}
                      placeholder="اسم المستخدم على Twitter"
                      placeholderTextColor="#666"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الإعدادات</Text>

              <TouchableOpacity
                style={styles.linkItem}
                onPress={() =>
                  Alert.alert("قريباً", "إعدادات الخصوصية قيد التطوير")
                }
              >
                <View style={styles.linkLeft}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color="#FFF"
                  />
                  <Text style={styles.linkText}>الخصوصية</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkItem}
                onPress={() =>
                  Alert.alert("قريباً", "إعدادات الإشعارات قيد التطوير")
                }
              >
                <View style={styles.linkLeft}>
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color="#FFF"
                  />
                  <Text style={styles.linkText}>الإشعارات</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkItem}
                onPress={() =>
                  Alert.alert("اللغة", "سيتم إضافة دعم اللغات المتعددة قريباً")
                }
              >
                <View style={styles.linkLeft}>
                  <Ionicons name="language-outline" size={24} color="#FFF" />
                  <Text style={styles.linkText}>اللغة</Text>
                </View>
                <View style={styles.linkRight}>
                  <Text style={styles.linkValue}>العربية</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom Padding for Keyboard */}
            <View style={{ height: 50 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
    backgroundColor: "#000",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  photoSection: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 8,
    borderBottomColor: "#0A0A0A",
  },
  photoContainer: {
    position: "relative",
    marginBottom: 12,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FE2C55",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#000",
  },
  changePhotoText: {
    color: "#FFF",
    fontSize: 15,
  },
  form: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: "#1F1F1F",
    borderRadius: 8,
    padding: 12,
    paddingRight: 50,
    color: "#FFF",
    fontSize: 15,
    textAlign: "right",
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  characterCount: {
    position: "absolute",
    left: 12,
    top: 12,
    color: "#666",
    fontSize: 13,
  },
  bioCharCount: {
    top: 12,
  },
  hint: {
    color: "#666",
    fontSize: 13,
    marginTop: 6,
    textAlign: "right",
  },
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 8,
    borderTopColor: "#0A0A0A",
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  linkItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F1F1F",
  },
  linkLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkText: {
    color: "#FFF",
    fontSize: 15,
    marginLeft: 12,
  },
  linkRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkValue: {
    color: "#888",
    fontSize: 14,
    marginRight: 8,
  },
  socialInputContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0A0A0A",
  },
  socialInput: {
    backgroundColor: "#1F1F1F",
    borderRadius: 8,
    padding: 12,
    color: "#FFF",
    fontSize: 15,
    textAlign: "right",
  },
});

export default EditProfileScreen;
