import React, { useState, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { AuthContext } from "../context/AuthContext";
import { wp, ms, fs } from "../utils/responsive";

const { width, height } = Dimensions.get("window");

const OnboardingScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const x = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      id: "1",
      title: "اكتشف ما حولك",
      description: "فيديوهات قصيرة وحصرية من مجتمعك والعالم.",
      icon: "earth",
    },
    {
      id: "2",
      title: "عبر عن نفسك",
      description: "أدوات تصوير وتحرير احترافية في جيبك.",
      icon: "videocam",
    },
    {
      id: "3",
      title: "تواصل واستمتع",
      description: "دردشة، تعليقات، وتفاعل مباشر مع من تحب.",
      icon: "chatbubbles",
    },
    {
      id: "4",
      title: "ابدأ الآن",
      description: "انضم لأكبر مجتمع مبدع اليوم.",
      icon: "rocket",
    },
  ];

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      x.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      // Force a small delay to ensure AsyncStorage write completes
      setTimeout(() => {
        if (userToken) {
          navigation.replace("MainTabs");
        } else {
          navigation.replace("Auth");
        }
      }, 100);
    } catch (error) {
      console.error("Error finishing onboarding:", error);
      // Fallback: navigate anyway
      if (userToken) {
        navigation.replace("MainTabs");
      } else {
        navigation.replace("Auth");
      }
    }
  };

  const RenderItem = ({ item, index }) => {
    const animatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        x.value,
        [(index - 1) * width, index * width, (index + 1) * width],
        [0.5, 1, 0.5],
        Extrapolate.CLAMP,
      );
      const opacity = interpolate(
        x.value,
        [(index - 1) * width, index * width, (index + 1) * width],
        [0, 1, 0],
        Extrapolate.CLAMP,
      );
      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <View style={[styles.slide, { width }]}>
        <Animated.View style={[styles.iconContainer, animatedStyle]}>
          <LinearGradient
            colors={["#00F2EA33", "#FF2D9233"]} // Transparent Cyan and Red
            style={styles.iconCircle}
          >
            {/* Layered Icons for Glitch Effect */}
            <Ionicons
              name={item.icon}
              size={100}
              color="#00F2EA"
              style={{
                position: "absolute",
                transform: [{ translateX: -2 }, { translateY: -2 }],
                opacity: 0.7,
              }}
            />
            <Ionicons
              name={item.icon}
              size={100}
              color="#FF2D92"
              style={{
                position: "absolute",
                transform: [{ translateX: 2 }, { translateY: 2 }],
                opacity: 0.7,
              }}
            />
            <Ionicons
              name={item.icon}
              size={100}
              color="#FFF"
              style={{ zIndex: 10 }}
            />
          </LinearGradient>
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const Pagination = () => {
    return (
      <View style={styles.paginationContainer}>
        {slides.map((_, i) => {
          const animatedDotStyle = useAnimatedStyle(() => {
            const widthAnim = interpolate(
              x.value,
              [(i - 1) * width, i * width, (i + 1) * width],
              [8, 24, 8],
              Extrapolate.CLAMP,
            );
            const opacityAnim = interpolate(
              x.value,
              [(i - 1) * width, i * width, (i + 1) * width],
              [0.4, 1, 0.4],
              Extrapolate.CLAMP,
            );
            const colorAnim = interpolate(
              x.value,
              [(i - 1) * width, i * width, (i + 1) * width],
              [0, 1, 0],
              Extrapolate.CLAMP,
            );
            return {
              width: widthAnim,
              opacity: opacityAnim,
              backgroundColor: colorAnim > 0.5 ? "#FF2D92" : "#888",
            };
          });
          return (
            <Animated.View key={i} style={[styles.dot, animatedDotStyle]} />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background Gradient Elements for ambiance */}
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item, index }) => (
          <RenderItem item={item} index={index} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      {/* Safe Area controls */}
      <SafeAreaView style={styles.safeFooter} edges={["bottom"]}>
        <Pagination />

        <LinearGradient
          colors={["#FF2D92", "#FF0050"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextButtonGradient}
        >
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? "ابدأ" : "التالي"}
            </Text>
            <Ionicons
              name={
                currentIndex === slides.length - 1
                  ? "checkmark"
                  : "arrow-forward"
              }
              size={20}
              color="#FFF"
            />
          </TouchableOpacity>
        </LinearGradient>

        {currentIndex < slides.length - 1 && (
          <TouchableOpacity
            onPress={finishOnboarding}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>تخطي</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -ms(100),
    left: -ms(50),
    width: ms(300),
    height: ms(300),
    borderRadius: ms(150),
    backgroundColor: "#00F2EA",
    opacity: 0.1,
    transform: [{ scale: 1.5 }],
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -ms(100),
    right: -ms(50),
    width: ms(300),
    height: ms(300),
    borderRadius: ms(150),
    backgroundColor: "#FF2D92",
    opacity: 0.1,
    transform: [{ scale: 1.5 }],
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ms(20),
  },
  iconContainer: {
    marginBottom: ms(50),
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: ms(180),
    height: ms(180),
    borderRadius: ms(90),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  textContainer: {
    alignItems: "center",
    maxWidth: "80%",
  },
  title: {
    fontSize: fs(28),
    fontWeight: "800",
    color: "#FFF",
    textAlign: "center",
    marginBottom: ms(16),
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fs(16),
    color: "#AAA",
    textAlign: "center",
    lineHeight: ms(24),
    fontWeight: "400",
  },
  safeFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: ms(30),
    paddingBottom: ms(20),
    alignItems: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    height: ms(40),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ms(20),
  },
  dot: {
    height: ms(8),
    borderRadius: ms(4),
    marginHorizontal: ms(4),
  },
  nextButtonGradient: {
    borderRadius: ms(30),
    width: "100%",
    marginBottom: ms(15),
  },
  nextButton: {
    flexDirection: "row",
    height: ms(56),
    justifyContent: "center",
    alignItems: "center",
    gap: ms(10),
  },
  nextButtonText: {
    color: "#FFF",
    fontSize: fs(18),
    fontWeight: "bold",
  },
  skipButton: {
    padding: ms(10),
  },
  skipButtonText: {
    color: "#666",
    fontSize: fs(14),
    fontWeight: "600",
  },
});

export default OnboardingScreen;
