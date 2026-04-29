import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ms, fs } from "../utils/responsive";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";

const VerificationRequestScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [idBackImage, setIdBackImage] = useState(null);
  const [formData, setFormData] = useState({
    fullName: userInfo?.fullName || "",
    category: "",
    followersCount: "",
    description: "",
    instagramHandle: "",
    twitterHandle: "",
    youtubeChannel: "",
    websiteUrl: "",
  });

  const categories = [
    { label: "محتوى رقمي", value: "digital_creator" },
    { label: "فنان", value: "artist" },
    { label: "رياضي", value: "athlete" },
    { label: "شخصية عامة", value: "public_figure" },
    { label: "علامة تجارية", value: "brand" },
    { label: "منظمة", value: "organization" },
    { label: "صحفي", value: "journalist" },
    { label: "مؤثر", value: "influencer" },
    { label: "أخرى", value: "other" },
  ];

  const pickIdImage = async (side) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("تنبيه", "يجب السماح بالوصول لمكتبة الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      if (side === "front") {
        setIdFrontImage(result.assets[0]);
      } else {
        setIdBackImage(result.assets[0]);
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.fullName.trim()) {
      Alert.alert("خطأ", "يرجى إدخال الاسم الكامل");
      return;
    }
    if (!formData.category) {
      Alert.alert("خطأ", "يرجى اختيار الفئة");
      return;
    }
    if (!formData.followersCount.trim()) {
      Alert.alert("خطأ", "يرجى إدخال عدد المتابعين");
      return;
    }
    if (!formData.description.trim() || formData.description.length < 50) {
      Alert.alert("خطأ", "يرجى كتابة وصف لا يقل عن 50 حرف");
      return;
    }
    if (!idFrontImage) {
      Alert.alert("خطأ", "يرجى إضافة صورة الوجه الأمامي للهوية");
      return;
    }
    if (!idBackImage) {
      Alert.alert("خطأ", "يرجى إضافة صورة الوجه الخلفي للهوية");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("fullName", formData.fullName);
      data.append("category", formData.category);
      data.append(
        "followersCount",
        String(parseInt(formData.followersCount) || 0),
      );
      data.append("description", formData.description);
      data.append("instagramUrl", formData.instagramHandle);
      data.append("twitterUrl", formData.twitterHandle);
      data.append("youtubeUrl", formData.youtubeChannel);
      data.append("websiteUrl", formData.websiteUrl);
      data.append("idDocumentFront", {
        uri: idFrontImage.uri,
        type: "image/jpeg",
        name: "id_front.jpg",
      });
      data.append("idDocumentBack", {
        uri: idBackImage.uri,
        type: "image/jpeg",
        name: "id_back.jpg",
      });

      const response = await axios.post(
        `${BASE_URL}/verification/request`,
        data,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );

      Alert.alert(
        "تم الإرسال بنجاح",
        "تم استلام طلب التوثيق الخاص بك. سيتم مراجعته خلال 3-5 أيام عمل.",
        [
          {
            text: "حسناً",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      console.error("Error submitting verification request:", error);
      const errorMessage =
        error.response?.data?.message ||
        "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً";
      Alert.alert("خطأ", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-forward" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>طلب توثيق الحساب</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Info */}
          <View style={styles.infoCard}>
            <View style={styles.badgeIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#00BFFF" />
            </View>
            <Text style={styles.infoTitle}>توثيق الحساب</Text>
            <Text style={styles.infoText}>
              يساعد التوثيق جمهورك على معرفة أن حسابك أصلي. يتم مراجعة جميع
              الطلبات من قبل فريق TikBook.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                الاسم الكامل <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل اسمك الكامل"
                placeholderTextColor="#999"
                value={formData.fullName}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullName: text })
                }
              />
            </View>

            {/* Category */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                الفئة <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.categoriesContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      formData.category === cat.value &&
                        styles.categoryChipActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category: cat.value })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        formData.category === cat.value &&
                          styles.categoryTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Followers Count */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                عدد المتابعين <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="أدخل عدد المتابعين"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.followersCount}
                onChangeText={(text) =>
                  setFormData({ ...formData, followersCount: text })
                }
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                الوصف <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.hint}>
                اشرح لماذا يجب توثيق حسابك (50 حرف على الأقل)
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="أخبرنا عن نفسك وعن محتواك..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
              />
              <Text
                style={[
                  styles.charCount,
                  formData.description.length >= 50 && styles.charCountValid,
                ]}
              >
                {formData.description.length}/50
              </Text>
            </View>

            {/* Social Media Links */}
            <View style={styles.sectionHeader}>
              <Ionicons name="link" size={20} color="#000" />
              <Text style={styles.sectionTitle}>روابط التواصل (اختياري)</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Instagram</Text>
              <TextInput
                style={styles.input}
                placeholder="@username"
                placeholderTextColor="#999"
                value={formData.instagramHandle}
                onChangeText={(text) =>
                  setFormData({ ...formData, instagramHandle: text })
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Twitter / X</Text>
              <TextInput
                style={styles.input}
                placeholder="@username"
                placeholderTextColor="#999"
                value={formData.twitterHandle}
                onChangeText={(text) =>
                  setFormData({ ...formData, twitterHandle: text })
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>YouTube</Text>
              <TextInput
                style={styles.input}
                placeholder="اسم القناة أو الرابط"
                placeholderTextColor="#999"
                value={formData.youtubeChannel}
                onChangeText={(text) =>
                  setFormData({ ...formData, youtubeChannel: text })
                }
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>موقع الويب</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor="#999"
                value={formData.websiteUrl}
                onChangeText={(text) =>
                  setFormData({ ...formData, websiteUrl: text })
                }
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* ID Documents */}
            <View style={styles.sectionHeader}>
              <Ionicons name="id-card-outline" size={20} color="#000" />
              <Text style={styles.sectionTitle}>صور الهوية الشخصية</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <Text style={styles.hint}>
              يجب رفع صورة واضحة للوجه الأمامي والخلفي لبطاقة الهوية أو جواز
              السفر
            </Text>

            <View style={styles.idRow}>
              {/* Front */}
              <TouchableOpacity
                style={[styles.idCard, idFrontImage && styles.idCardSelected]}
                onPress={() => pickIdImage("front")}
              >
                {idFrontImage ? (
                  <Image
                    source={{ uri: idFrontImage.uri }}
                    style={styles.idPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={32} color="#999" />
                    <Text style={styles.idCardLabel}>الوجه الأمامي</Text>
                  </>
                )}
                {idFrontImage && (
                  <View style={styles.idDoneTag}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#00C875"
                    />
                  </View>
                )}
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity
                style={[styles.idCard, idBackImage && styles.idCardSelected]}
                onPress={() => pickIdImage("back")}
              >
                {idBackImage ? (
                  <Image
                    source={{ uri: idBackImage.uri }}
                    style={styles.idPreview}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={32} color="#999" />
                    <Text style={styles.idCardLabel}>الوجه الخلفي</Text>
                  </>
                )}
                {idBackImage && (
                  <View style={styles.idDoneTag}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#00C875"
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>إرسال الطلب</Text>
            )}
          </TouchableOpacity>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.footerText}>
              يتم مراجعة الطلبات خلال 3-5 أيام عمل. سيتم إخطارك بالنتيجة.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(16),
    paddingVertical: ms(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: fs(18),
    fontWeight: "700",
    color: "#000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: ms(40),
  },
  infoCard: {
    backgroundColor: "#F0F8FF",
    padding: ms(24),
    margin: ms(16),
    borderRadius: ms(12),
    alignItems: "center",
  },
  badgeIcon: {
    marginBottom: ms(12),
  },
  infoTitle: {
    fontSize: fs(20),
    fontWeight: "700",
    color: "#000",
    marginBottom: ms(8),
  },
  infoText: {
    fontSize: fs(14),
    color: "#666",
    textAlign: "center",
    lineHeight: ms(22),
  },
  form: {
    paddingHorizontal: ms(16),
  },
  inputContainer: {
    marginBottom: ms(20),
  },
  label: {
    fontSize: fs(15),
    fontWeight: "600",
    color: "#000",
    marginBottom: ms(8),
  },
  required: {
    color: "#FF2D92",
  },
  hint: {
    fontSize: fs(12),
    color: "#999",
    marginBottom: ms(8),
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: ms(8),
    padding: ms(12),
    fontSize: fs(15),
    color: "#000",
    textAlign: "right",
  },
  textarea: {
    height: ms(120),
    paddingTop: ms(12),
  },
  charCount: {
    fontSize: fs(12),
    color: "#999",
    marginTop: ms(4),
    textAlign: "left",
  },
  charCountValid: {
    color: "#00C875",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ms(8),
  },
  categoryChip: {
    paddingHorizontal: ms(16),
    paddingVertical: ms(8),
    borderRadius: ms(20),
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  categoryChipActive: {
    backgroundColor: "#FF2D92",
    borderColor: "#FF2D92",
  },
  categoryText: {
    fontSize: fs(13),
    color: "#666",
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#FFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ms(24),
    marginBottom: ms(16),
    gap: ms(8),
  },
  sectionTitle: {
    fontSize: fs(16),
    fontWeight: "700",
    color: "#000",
  },
  submitButton: {
    backgroundColor: "#FF2D92",
    paddingVertical: ms(16),
    borderRadius: ms(8),
    marginHorizontal: ms(16),
    marginTop: ms(24),
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fs(16),
    fontWeight: "700",
    color: "#FFF",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: ms(16),
    marginHorizontal: ms(16),
    padding: ms(12),
    backgroundColor: "#F9F9F9",
    borderRadius: ms(8),
    gap: ms(8),
  },
  footerText: {
    flex: 1,
    fontSize: fs(12),
    color: "#666",
    lineHeight: ms(18),
  },
  idRow: {
    flexDirection: "row",
    gap: ms(12),
    marginBottom: ms(20),
  },
  idCard: {
    flex: 1,
    height: ms(130),
    borderRadius: ms(12),
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    backgroundColor: "#F9F9F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  idCardSelected: {
    borderColor: "#00C875",
    borderStyle: "solid",
  },
  idCardLabel: {
    fontSize: fs(13),
    color: "#999",
    marginTop: ms(8),
    fontWeight: "500",
  },
  idPreview: {
    width: "100%",
    height: "100%",
  },
  idDoneTag: {
    position: "absolute",
    top: ms(6),
    right: ms(6),
    backgroundColor: "#fff",
    borderRadius: ms(10),
  },
});

export default VerificationRequestScreen;
