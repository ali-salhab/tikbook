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
  ImageBackground,
  Dimensions,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { BASE_URL } from "../config/api";
import { AuthContext } from "../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const CreateLiveRoomScreen = ({ navigation }) => {
  const { userToken } = React.useContext(AuthContext);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("chat");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Visual polish: Categories with gradient colors
  const categories = [
    {
      id: "music",
      name: "Music",
      icon: "musical-notes",
      color: ["#FF1493", "#C71585"],
    },
    {
      id: "chat",
      name: "Chat",
      icon: "chatbubbles",
      color: ["#00BFFF", "#1E90FF"],
    },
    {
      id: "gaming",
      name: "Gaming",
      icon: "game-controller",
      color: ["#32CD32", "#228B22"],
    },
    {
      id: "education",
      name: "Education",
      icon: "school",
      color: ["#FFD700", "#DAA520"],
    },
    {
      id: "business",
      name: "Business",
      icon: "briefcase",
      color: ["#A020F0", "#800080"],
    },
    { id: "other", name: "Other", icon: "apps", color: ["#808080", "#696969"] },
  ];

  const handleCreateRoom = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter a room title");
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
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000&auto=format&fit=crop",
      }}
      style={styles.backgroundImage}
      blurRadius={30}
    >
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "#000"]}
        style={styles.gradientOverlay}
      />

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Live Room</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Room Cover Preview */}
          <View style={styles.coverPreview}>
            <View style={styles.coverPlaceholder}>
              <Ionicons
                name="image-outline"
                size={40}
                color="rgba(255,255,255,0.5)"
              />
              <Text style={styles.coverText}>Add Cover</Text>
            </View>
            <BlurView
              intensity={20}
              tint="dark"
              style={styles.titleInputContainer}
            >
              <TextInput
                style={styles.titleInput}
                placeholder="Enter Room Title"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={title}
                onChangeText={setTitle}
                maxLength={50}
              />
            </BlurView>
          </View>

          {/* Tags / Category */}
          <Text style={styles.sectionLabel}>Select Channel</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={styles.categoryWrapper}
              >
                <LinearGradient
                  colors={
                    category === cat.id
                      ? cat.color
                      : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]
                  }
                  style={styles.categoryButton}
                >
                  <Ionicons name={cat.icon} size={20} color="#FFF" />
                </LinearGradient>
                <Text
                  style={[
                    styles.categoryText,
                    category === cat.id && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Privacy Toggle */}
          <View style={styles.privacyContainer}>
            <View style={styles.privacyLeft}>
              <Ionicons
                name={isPrivate ? "lock-closed" : "globe-outline"}
                size={22}
                color="#FFF"
              />
              <View>
                <Text style={styles.privacyTitle}>
                  {isPrivate ? "Private Room" : "Public Room"}
                </Text>
                <Text style={styles.privacySub}>
                  {isPrivate ? "Invite only" : "Anyone can join"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)}>
              <Ionicons
                name={isPrivate ? "toggle" : "toggle-outline"}
                size={36}
                color={isPrivate ? "#FF4444" : "#FFF"}
              />
            </TouchableOpacity>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            onPress={handleCreateRoom}
            disabled={loading}
            style={styles.startBtnContainer}
          >
            <LinearGradient
              colors={["#FF1493", "#C71585"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.startText}>Go Live</Text>
                  <Ionicons name="radio-outline" size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  coverPreview: {
    height: 180,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 30,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  coverText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  titleInputContainer: {
    padding: 15,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  sectionLabel: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    justifyContent: "space-between",
    marginBottom: 30,
  },
  categoryWrapper: {
    alignItems: "center",
    width: "30%",
    marginBottom: 10,
  },
  categoryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  categoryText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  categoryTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  privacyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 15,
    borderRadius: 15,
    marginBottom: 40,
  },
  privacyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  privacyTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  privacySub: {
    color: "#CCC",
    fontSize: 12,
  },
  startBtnContainer: {
    marginTop: 20,
  },
  startButton: {
    flexDirection: "row",
    height: 55,
    borderRadius: 27.5,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: "#FF1493",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default CreateLiveRoomScreen;
