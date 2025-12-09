import React, { useState, useRef, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, {
  Path,
  Circle,
  Rect,
  G,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { AuthContext } from "../context/AuthContext";

const { width, height } = Dimensions.get("window");

const OnboardingScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { userToken } = useContext(AuthContext);
  const slidesRef = useRef(null);

  const slides = [
    {
      id: "1",
      title: "اكتشف عالم الفيديو",
      description:
        "شاهد ملايين الفيديوهات القصيرة المبدعة من جميع أنحاء العالم",
      Icon: VideoIcon,
      backgroundColor: "#FF006E",
    },
    {
      id: "2",
      title: "أنشئ محتوى مذهل",
      description: "سجل وحرر ومشارك فيديوهاتك مع ملايين المستخدمين",
      Icon: CreateIcon,
      backgroundColor: "#8338EC",
    },
    {
      id: "3",
      title: "تواصل مع الأصدقاء",
      description: "تابع أصدقائك وتفاعل مع محتواهم المميز",
      Icon: ConnectIcon,
      backgroundColor: "#3A86FF",
    },
    {
      id: "4",
      title: "ابدأ رحلتك الآن",
      description: "انضم إلى مجتمعنا وكن جزءاً من التجربة",
      Icon: StartIcon,
      backgroundColor: "#06D6A0",
    },
  ];

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    setCurrentIndex(viewableItems[0]?.index || 0);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = async () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      navigateAfterOnboarding();
    }
  };

  const skip = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    navigateAfterOnboarding();
  };

  const navigateAfterOnboarding = () => {
    if (userToken) {
      navigation.replace("HomeTabs");
    } else {
      navigation.replace("Auth");
    }
  };
  const renderItem = ({ item, index }) => {
    const Icon = item.Icon;
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: "clamp",
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.slide,
          {
            backgroundColor: item.backgroundColor,
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Icon />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />

      {/* Skip Button */}
      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={skip}>
          <Text style={styles.skipText}>تخطي</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
          }
        )}
        scrollEventThrottle={32}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
        showsHorizontalScrollIndicator={false}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Pagination */}
        <View style={styles.pagination}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 30, 10],
              extrapolate: "clamp",
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                style={[styles.dot, { width: dotWidth, opacity }]}
                key={i.toString()}
              />
            );
          })}
        </View>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={scrollTo}>
          <Ionicons name="arrow-forward" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// SVG Icons
const VideoIcon = () => (
  <Svg width="200" height="200" viewBox="0 0 200 200">
    <Defs>
      <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFE5EC" stopOpacity="1" />
        <Stop offset="100%" stopColor="#FFB3C6" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Circle cx="100" cy="100" r="80" fill="url(#grad1)" />
    <Path d="M75 60 L140 100 L75 140 Z" fill="#FFF" />
  </Svg>
);

const CreateIcon = () => (
  <Svg width="200" height="200" viewBox="0 0 200 200">
    <Defs>
      <LinearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#E5E5FF" stopOpacity="1" />
        <Stop offset="100%" stopColor="#B8B8FF" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Rect x="40" y="40" width="120" height="120" rx="20" fill="url(#grad2)" />
    <Circle cx="100" cy="80" r="15" fill="#FFF" />
    <Rect x="85" y="105" width="30" height="40" rx="15" fill="#FFF" />
  </Svg>
);

const ConnectIcon = () => (
  <Svg width="200" height="200" viewBox="0 0 200 200">
    <Defs>
      <LinearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#E5F4FF" stopOpacity="1" />
        <Stop offset="100%" stopColor="#B3DBFF" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Circle cx="70" cy="70" r="25" fill="url(#grad3)" />
    <Circle cx="130" cy="70" r="25" fill="url(#grad3)" />
    <Circle cx="100" cy="130" r="25" fill="url(#grad3)" />
    <Path d="M70 70 L100 130" stroke="#FFF" strokeWidth="4" />
    <Path d="M130 70 L100 130" stroke="#FFF" strokeWidth="4" />
  </Svg>
);

const StartIcon = () => (
  <Svg width="200" height="200" viewBox="0 0 200 200">
    <Defs>
      <LinearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#E5FFF4" stopOpacity="1" />
        <Stop offset="100%" stopColor="#B3FFD9" stopOpacity="1" />
      </LinearGradient>
    </Defs>
    <Path
      d="M100 20 L120 80 L180 80 L130 120 L150 180 L100 140 L50 180 L70 120 L20 80 L80 80 Z"
      fill="url(#grad4)"
    />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  slide: {
    width,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  iconContainer: {
    flex: 0.6,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 0.4,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.9,
  },
  skipButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  skipText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    height: 100,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: "row",
    height: 40,
    alignItems: "center",
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFF",
    marginHorizontal: 4,
  },
  nextButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default OnboardingScreen;
