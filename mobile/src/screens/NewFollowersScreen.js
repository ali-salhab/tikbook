import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  FlatList as RNFlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NewFollowersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // Mock data based on screenshot
  const [followers, setFollowers] = useState([
    {
      id: "1",
      username: "user3703226950703",
      action: "بدأ في متابعتك",
      time: "الآن",
      avatar: null,
      isFollowingBack: false,
    },
    {
      id: "2",
      username: "user5386237398167",
      action: "بدأ في متابعتك",
      time: "الآن",
      avatar: null,
      isFollowingBack: false,
    },
    {
      id: "3",
      username: "pahezosalitotte",
      action: "بدأ في متابعتك",
      time: "الآن",
      avatar: null,
      isFollowingBack: false,
    },
    {
      id: "4",
      username: "gehiweinatihafef",
      action: "بدأ في متابعتك",
      time: "الآن",
      avatar: null,
      isFollowingBack: false,
    },
    {
      id: "5",
      username: "metuxucotoxetiranah",
      action: "بدأ في متابعتك",
      time: "الآن",
      avatar: null,
      isFollowingBack: false,
    },
    {
      id: "6",
      username: "miyullonnoqoruce",
      action: "بدأ في متابعتك",
      time: "الآن",
      avatar: null,
      isFollowingBack: false,
    },
  ]);

  const suggested = [
    { id: "s1", username: "user_a", reason: "مقترح لك" },
    { id: "s2", username: "user_b", reason: "مشتركين" },
    { id: "s3", username: "user_c", reason: "نشط الآن" },
    { id: "s4", username: "user_d", reason: "الأصدقاء" },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color="#CCC" />
            </View>
          )}
          <View style={styles.newBadge} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.actionText}>
            {item.action} <Text style={styles.time}>. {item.time}</Text>
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          item.isFollowingBack && styles.followingButton,
        ]}
      >
        <Text
          style={[
            styles.followButtonText,
            item.isFollowingBack && styles.followingButtonText,
          ]}
        >
          {item.isFollowingBack ? "أصدقاء" : "رد المتابعة"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-forward" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>متابعون جدد</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={followers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
      />

      <View style={styles.suggestedSection}>
        <Text style={styles.suggestedTitle}>حسابات مقترحة ⓘ</Text>
        <RNFlatList
          data={suggested}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestedList}
          renderItem={({ item }) => (
            <View style={styles.suggestedCard}>
              <View style={styles.suggestedAvatar}>
                <Ionicons name="person" size={20} color="#CCC" />
              </View>
              <Text style={styles.suggestedName}>{item.username}</Text>
              <Text style={styles.suggestedReason}>{item.reason}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  newBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#25F4EE",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  textContainer: {
    flex: 1,
  },
  username: {
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 4,
    textAlign: "right",
  },
  actionText: {
    color: "#666",
    fontSize: 13,
    textAlign: "right",
  },
  time: {
    color: "#999",
  },
  followButton: {
    backgroundColor: "#FE2C55",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#E5E5E5",
  },
  followButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  followingButtonText: {
    color: "#000",
  },
  suggestedSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  suggestedTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#666",
    textAlign: "right",
  },
  suggestedList: {
    paddingVertical: 12,
    gap: 12,
  },
  suggestedCard: {
    width: 110,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  suggestedAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EAEAEA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  suggestedName: {
    fontWeight: "700",
    fontSize: 13,
    color: "#111",
  },
  suggestedReason: {
    fontSize: 11,
    color: "#777",
    marginTop: 4,
    textAlign: "center",
  },
});

export default NewFollowersScreen;
