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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { AuthContext } from "../context/AuthContext";

const CreateLiveRoomScreen = ({ navigation }) => {
  const { userToken } = React.useContext(AuthContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("chat");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const categories = [
    { id: "music", name: "Music", icon: "musical-notes" },
    { id: "chat", name: "Chat", icon: "chatbubbles" },
    { id: "gaming", name: "Gaming", icon: "game-controller" },
    { id: "education", name: "Education", icon: "school" },
    { id: "business", name: "Business", icon: "briefcase" },
    { id: "other", name: "Other", icon: "apps" },
  ];

  const handleCreateRoom = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a room title");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/live-rooms/create`,
        {
          title: title.trim(),
          description: description.trim(),
          category,
          isPrivate,
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );

      if (response.data.success) {
        const roomId = response.data.data.roomId;
        navigation.replace("LiveRoom", { roomId });
      }
    } catch (error) {
      console.error("Error creating room:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Could not create room",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Live Room</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Room Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter room title..."
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <Text style={styles.helperText}>{title.length}/50</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this room about?"
            placeholderTextColor="#666"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.helperText}>{description.length}/200</Text>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  category === cat.id && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon}
                  size={24}
                  color={category === cat.id ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.categoryButtonText,
                    category === cat.id && styles.categoryButtonTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.privacyRow}
            onPress={() => setIsPrivate(!isPrivate)}
          >
            <View style={styles.privacyInfo}>
              <Ionicons
                name={isPrivate ? "lock-closed" : "globe"}
                size={24}
                color="#fff"
              />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>
                  {isPrivate ? "Private Room" : "Public Room"}
                </Text>
                <Text style={styles.privacyDescription}>
                  {isPrivate
                    ? "Only invited users can join"
                    : "Anyone can discover and join"}
                </Text>
              </View>
            </View>
            <View style={[styles.toggle, isPrivate && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleThumb,
                  isPrivate && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateRoom}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="radio" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Start Live Room</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 6,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryButton: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#ff4444",
    borderColor: "#ff4444",
  },
  categoryButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  privacyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
  },
  privacyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 13,
    color: "#666",
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#333",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#ff4444",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  toggleThumbActive: {
    marginLeft: 22,
  },
  createButton: {
    flexDirection: "row",
    backgroundColor: "#ff4444",
    padding: 18,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CreateLiveRoomScreen;
