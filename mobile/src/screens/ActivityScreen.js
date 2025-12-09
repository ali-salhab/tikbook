import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ActivityScreen = ({ navigation }) => {
  // Mock data based on screenshot
  const [activities, setActivities] = useState([
    {
      id: "1",
      users: ["Mel", "ⓉⓞⓉⓐ", "س"],
      action: "قاموا بزيارة ملفك الشخصي",
      time: "3 نوفمبر",
      type: "profile_view",
      avatars: [null, null], // Multiple avatars
    },
    {
      id: "2",
      username: "احمد ابن الشرقيه",
      action: "أعجبه فيديو أعدت نشره",
      time: "30 أغسطس",
      type: "like",
      thumbnail: null, // Video thumbnail
    },
    {
      id: "3",
      username: "احمد ابن الشرقيه",
      action: "أعجبه فيديو أعدت نشره",
      time: "20 أغسطس",
      type: "like",
      thumbnail: null,
    },
    {
      id: "4",
      username: "ⓉⓞⓉⓐ",
      action: "أعجب بالفيديو الخاص بك",
      time: "18 أغسطس",
      type: "like",
      thumbnail: null,
    },
    {
      id: "5",
      username: "User123",
      action: "أعجب بالفيديو الخاص بك",
      time: "12 أغسطس",
      type: "like",
      thumbnail: null,
    },
    {
      id: "6",
      username: "اعجاز شوركوت آلا❤️ و جاريم",
      action: "أعجب بالفيديو الخاص بك",
      time: "12 أغسطس",
      type: "like",
      thumbnail: null,
    },
    {
      id: "7",
      username: "جاريم",
      action: "أضاف الفيديو الخاص بك إلى المفضلات",
      time: "12 أغسطس",
      type: "favorite",
      thumbnail: null,
    },
    {
      id: "8",
      username: "الدولي 🦅🧿",
      action: "أعجب بالفيديو الخاص بك",
      time: "12 أغسطس",
      type: "like",
      thumbnail: null,
    },
    {
      id: "9",
      username: "الدولي 🦅🧿",
      action: "أجاب على تعليقك: 🥰🥰🥰🥰",
      time: "12 أغسطس",
      type: "comment",
      thumbnail: null,
    },
  ]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <View style={styles.leftContent}>
        <View style={styles.avatarContainer}>
          {item.type === "profile_view" ? (
            <View style={styles.multiAvatar}>
              <View style={[styles.avatarPlaceholder, styles.avatarOverlap1]}>
                <Ionicons name="person" size={20} color="#CCC" />
              </View>
              <View style={[styles.avatarPlaceholder, styles.avatarOverlap2]}>
                <Ionicons name="person" size={20} color="#CCC" />
              </View>
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#CCC" />
            </View>
          )}

          {/* Icon Badge */}
          {item.type === "profile_view" && (
            <View style={styles.iconBadge}>
              <Ionicons name="eye" size={10} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.username}>
            {item.users ? item.users.join(", ") : item.username}
          </Text>
          <Text style={styles.actionText}>
            {item.action} <Text style={styles.time}>. {item.time}</Text>
          </Text>
        </View>
      </View>

      {item.thumbnail !== undefined && (
        <View style={styles.thumbnailPlaceholder}>{/* Video Thumbnail */}</View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>النشاط</Text>
          <Ionicons name="chevron-down" size={16} color="#000" />
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={activities}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
    width: 56,
    height: 56,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  multiAvatar: {
    width: 56,
    height: 56,
    position: "relative",
  },
  avatarOverlap1: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    zIndex: 1,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  avatarOverlap2: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 4,
    textAlign: "left",
  },
  actionText: {
    color: "#666",
    fontSize: 13,
    textAlign: "left",
    lineHeight: 18,
  },
  time: {
    color: "#999",
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 64,
    backgroundColor: "#333",
    borderRadius: 4,
  },
});

export default ActivityScreen;
