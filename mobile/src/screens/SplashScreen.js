import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

const SplashScreen = ({ navigation, onFinish }) => {
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withSequence(
            withTiming(1.2, { duration: 800 }),
            withSpring(1, { damping: 10, stiffness: 100 }, (finished) => {
                if (finished && onFinish) {
                    runOnJS(onFinish)();
                }
            })
        );
        opacity.value = withTiming(1, { duration: 800 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: opacity.value,
        };
    });

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Animated.View style={[styles.iconContainer, animatedStyle]}>
                {/* TikTok-style Icon simulation using Ionicons and layering */}
                <View style={[styles.iconLayer, styles.cyanLayer]}>
                    <Ionicons name="musical-notes" size={100} color="#00F2EA" />
                </View>
                <View style={[styles.iconLayer, styles.redLayer]}>
                    <Ionicons name="musical-notes" size={100} color="#FE2C55" />
                </View>
                <View style={styles.iconLayer}>
                    <Ionicons name="musical-notes" size={100} color="#FFFFFF" />
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000000",
        justifyContent: "center",
        alignItems: "center",
    },
    iconContainer: {
        width: 150,
        height: 150,
        justifyContent: "center",
        alignItems: "center",
    },
    iconLayer: {
        position: "absolute",
    },
    cyanLayer: {
        transform: [{ translateX: -4 }, { translateY: -4 }],
    },
    redLayer: {
        transform: [{ translateX: 4 }, { translateY: 4 }],
    },
});

export default SplashScreen;
