import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const CommentItem = ({ comment, onComplete }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(4000), // Show for 4 seconds
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete(comment.id));
  }, []);

  return (
    <Animated.View
      style={[
        styles.commentContainer,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.userInfo}>
        <Image
          source={{
            uri:
              comment.user?.profileImage ||
              comment.user?.avatar ||
              "https://i.pravatar.cc/100",
          }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.username}>{comment.user?.username}</Text>
          <Text style={styles.message}>{comment.message}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const FloatingComments = ({ comments, removeComment }) => {
  return (
    <View style={styles.container} pointerEvents="none">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onComplete={removeComment}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100, // Above bottom bar
    left: 20,
    width: width * 0.7,
    height: 200,
    justifyContent: "flex-end",
  },
  commentContainer: {
    marginBottom: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    maxWidth: "100%",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  username: {
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  message: {
    color: "#FFF",
    fontSize: 14,
  },
});

export default FloatingComments;
