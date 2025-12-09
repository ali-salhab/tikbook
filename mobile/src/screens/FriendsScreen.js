import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { Video } from "expo-av";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const { width, height } = Dimensions.get("window");

const FriendsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Mock Data for Friends Feed
  const friendsVideos = [
    {
      id: "1",
      username: "ahmed_ali",
      userAvatar:
        "https://ui-avatars.com/api/?name=Ahmed+Ali&background=random",
      description: "يوم جميل مع الأصدقاء! ☀️ #friends #fun",
      videoUrl:
        "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // Sample video
      likes: "12K",
      comments: "340",
      shares: "1.2K",
      isLiked: true,
      time: "منذ 2 ساعة",
    },
    {
      id: "2",
      username: "sara_design",
      userAvatar:
        "https://ui-avatars.com/api/?name=Sara+Design&background=random",
      description: "تصميمي الجديد 🎨 رأيكم؟",
      videoUrl:
        "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      likes: "8.5K",
      comments: "120",
      shares: "500",
      isLiked: false,
      time: "منذ 5 ساعات",
    },
    {
      id: "3",
      username: "mohamed_dev",
      userAvatar:
        "https://ui-avatars.com/api/?name=Mohamed+Dev&background=random",
      description: "Coding life 💻☕️",
      videoUrl:
        "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      likes: "20K",
      comments: "800",
      shares: "2K",
      isLiked: true,
      time: "الأمس",
    },
  ];

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = ({ item, index }) => {
    const isActive = index === activeVideoIndex;

    return (
      <View style={[styles.videoContainer, { height: height - tabBarHeight }]}>
        <Video
          source={{ uri: item.videoUrl }}
          style={styles.video}
          resizeMode="cover"
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />

        {/* Overlay Content */}
        <View style={styles.overlay}>
          {/* Right Side Actions */}
          <View style={styles.rightContainer}>
            <View style={styles.profileContainer}>
              <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
              <View style={styles.followBadge}>
                <Ionicons name="add" size={12} color="#FFF" />
              </View>
            </View>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons
                name="heart"
                size={35}
                color={item.isLiked ? "#FE2C55" : "#FFF"}
              />
              <Text style={styles.actionText}>{item.likes}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-ellipses" size={35} color="#FFF" />
              <Text style={styles.actionText}>{item.comments}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="bookmark" size={35} color="#FFF" />
              <Text style={styles.actionText}>حفظ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-social" size={35} color="#FFF" />
              <Text style={styles.actionText}>{item.shares}</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Content */}
          <View style={styles.bottomContainer}>
            <Text style={styles.username}>@{item.username}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.addFriendButton}>
          <View>
            <Ionicons name="people-outline" size={28} color="#FFF" />
            <View style={styles.plusBadge}>
              <Ionicons name="add" size={10} color="#FFF" />
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>الأصدقاء</Text>

        <TouchableOpacity>
          <Ionicons name="search" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={friendsVideos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height - tabBarHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  addFriendButton: {
    // padding: 5,
  },
  plusBadge: {
    position: "absolute",
    top: -2,
    left: -4,
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  videoContainer: {
    width: width,
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.1)", // Slight overlay for text readability
  },
  rightContainer: {
    position: "absolute",
    right: 10,
    bottom: 100,
    alignItems: "center",
  },
  profileContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  followBadge: {
    position: "absolute",
    bottom: -10,
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    marginBottom: 15,
    alignItems: "center",
  },
  actionText: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "600",
  },
  bottomContainer: {
    marginBottom: 20,
    marginLeft: 10,
    width: "75%",
  },
  username: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "left",
  },
  description: {
    color: "#FFF",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "left",
  },
  time: {
    color: "#ccc",
    fontSize: 12,
    textAlign: "left",
  },
});

export default FriendsScreen;
