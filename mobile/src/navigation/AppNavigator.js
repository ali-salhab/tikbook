import React, { useContext, useState, useEffect, useRef } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext";
import { notificationListener } from "../services/notificationService";
import * as Notifications from "expo-notifications";
import VersionChecker from "../components/VersionChecker";
import OnboardingScreen from "../screens/OnboardingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import OTPScreen from "../screens/OTPScreen";
import HomeScreen from "../screens/HomeScreen";
import UploadScreen from "../screens/UploadScreen";
import PostEditScreen from "../screens/PostEditScreen";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import UsersScreen from "../screens/UsersScreen";
import FriendsScreen from "../screens/FriendsScreen";
import InboxScreen from "../screens/InboxScreen";
import ChatScreen from "../screens/ChatScreen";
import LiveScreen from "../screens/LiveScreen";
import LiveStreamsListScreen from "../screens/LiveStreamsListScreen";
import WalletScreen from "../screens/WalletScreen";
import NewFollowersScreen from "../screens/NewFollowersScreen";
import ActivityScreen from "../screens/ActivityScreen";
import SystemNotificationsScreen from "../screens/SystemNotificationsScreen";
import MapScreen from "../screens/MapScreen";
import SplashScreen from "../screens/SplashScreen";
import { ActivityIndicator, View, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabIconWithBadge = ({ name, color, size, badgeCount }) => (
  <View
    style={{
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Ionicons name={name} size={size} color={color} />
    {badgeCount > 0 && (
      <View
        style={{
          position: "absolute",
          right: -4,
          top: -4,
          backgroundColor: "#FE2C55",
          borderRadius: 9,
          minWidth: 18,
          height: 18,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 3,
          borderWidth: 2,
          borderColor: "#000",
        }}
      >
        <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "bold" }}>
          {badgeCount}
        </Text>
      </View>
    )}
  </View>
);

const HomeTabs = () => {
  const insets = useSafeAreaInsets();
  const { userInfo, notificationCount } = React.useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopWidth: 0.5,
          borderTopColor: "#1a1a1a",
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 5,
          paddingTop: 5,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: "#FFF",
        tabBarInactiveTintColor: "#666",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarLabel: "الأصدقاء",
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              name={focused ? "people" : "people-outline"}
              size={26}
              color={color}
              badgeCount={0}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarIcon: () => (
            <View
              style={{
                width: 45,
                height: 27,
                backgroundColor: "transparent",
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
                marginTop: 4,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  width: 27,
                  height: 27,
                  backgroundColor: "#00F2EA",
                  borderRadius: 8,
                  left: 0,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: 27,
                  height: 27,
                  backgroundColor: "#FE2C55",
                  borderRadius: 8,
                  right: 0,
                }}
              />
              <View
                style={{
                  width: 33,
                  height: 27,
                  backgroundColor: "#FFF",
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1,
                }}
              >
                <Ionicons name="add" size={20} color="#000" />
              </View>
            </View>
          ),
          tabBarLabel: "",
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarLabel: "صندوق الوارد",
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              name={
                focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
              }
              size={24}
              color={color}
              badgeCount={notificationCount}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "الملف الشخصي",
          tabBarIcon: ({ color, focused }) =>
            userInfo?.profileImage ? (
              <Image
                source={{ uri: userInfo.profileImage }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: color,
                }}
              />
            ) : (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={color}
              />
            ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isLoading, userToken, fetchNotificationCount } = useContext(AuthContext);
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    checkOnboarding();
  }, [userToken]); // Re-check when userToken changes

  const checkOnboarding = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");
      // Only show onboarding if user hasn't seen it AND is not logged in
      setShowOnboarding(hasSeenOnboarding === null && !userToken);
    } catch (error) {
      console.error("Error checking onboarding:", error);
      setShowOnboarding(false);
    }
  };

  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Setup notification listener handling
    const unsubscribe = notificationListener(navigationRef);

    // Handle cold start (App launched from notification)
    const checkInitialNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification?.request?.content?.data?.screen) {
          const { screen, params } = response.notification.request.content.data;
          console.log("🚀 Cold start notification:", screen, params);
          // Wait for navigation to be ready
          const interval = setInterval(() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate(screen, params);
              clearInterval(interval);
            }
          }, 100);
          // Timeout after 5s
          setTimeout(() => clearInterval(interval), 5000);
        }
      } catch (e) {
        console.error("Failed to check initial notification:", e);
      }
    };

    checkInitialNotification();
    return unsubscribe;
  }, []);

  // Poll for notification count every 30 seconds when user is logged in
  useEffect(() => {
    if (userToken && fetchNotificationCount) {
      // Fetch immediately
      fetchNotificationCount();
      // Then poll every 30 seconds
      const interval = setInterval(() => {
        fetchNotificationCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [userToken, fetchNotificationCount]);

  // Safety fallback for showOnboarding
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showOnboarding === null) {
        console.log("⚠️ Onboarding check timed out, defaulting to false");
        setShowOnboarding(false);
      }
    }, 3000); // Increased timeout slightly to allow for splash animation
    return () => clearTimeout(timer);
  }, [showOnboarding]);

  const [isSplashAnimationFinished, setIsSplashAnimationFinished] =
    useState(false);

  // While checking auth state or onboarding status, or if splash animation isn't done
  if (isLoading || showOnboarding === null || !isSplashAnimationFinished) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Show SplashScreen and wait for it to signal completion */}
        <SplashScreen onFinish={() => setIsSplashAnimationFinished(true)} />
      </View>
    );
  }

  console.log("🗺️ Rendering main navigation Stack", { userToken: !!userToken });

  return (
    <VersionChecker>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showOnboarding ? (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ gestureEnabled: false }}
            />
          ) : userToken ? (
            <>
              <Stack.Screen name="MainTabs" component={HomeTabs} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="Users" component={UsersScreen} />
              <Stack.Screen name="Upload" component={UploadScreen} />
              <Stack.Screen name="PostEdit" component={PostEditScreen} />
              <Stack.Screen name="Live" component={LiveScreen} />
              <Stack.Screen
                name="LiveStreamsList"
                component={LiveStreamsListScreen}
              />
              <Stack.Screen name="Wallet" component={WalletScreen} />
              <Stack.Screen
                name="NewFollowers"
                component={NewFollowersScreen}
              />
              <Stack.Screen name="Activity" component={ActivityScreen} />
              <Stack.Screen
                name="SystemNotifications"
                component={SystemNotificationsScreen}
              />
              <Stack.Screen name="Map" component={MapScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Auth">
                {(props) => <LoginScreen {...props} />}
              </Stack.Screen>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="OTP" component={OTPScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </VersionChecker>
  );
};

export default AppNavigator;
