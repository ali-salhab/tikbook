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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { BASE_URL } from "../config/api";
import axios from "axios";

const VerificationRequestScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/verification/request`,
        {
          fullName: formData.fullName,
          category: formData.category,
          followersCount: parseInt(formData.followersCount) || 0,
          description: formData.description,
          socialMediaLinks: {
            instagram: formData.instagramHandle,
            twitter: formData.twitterHandle,
            youtube: formData.youtubeChannel,
            website: formData.websiteUrl,
          },
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: "#F0F8FF",
    padding: 24,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  badgeIcon: {
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  required: {
    color: "#FE2C55",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#000",
    textAlign: "right",
  },
  textarea: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    textAlign: "left",
  },
  charCountValid: {
    color: "#00C875",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  categoryChipActive: {
    backgroundColor: "#FE2C55",
    borderColor: "#FE2C55",
  },
  categoryText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#FFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  submitButton: {
    backgroundColor: "#FE2C55",
    paddingVertical: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
});

export default VerificationRequestScreen;
