import React, { useContext, useState, useEffect, useRef } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import {
  notificationListener,
  handleInitialNotification,
  setupAndroidChannel,
} from "../services/notificationService";
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
import LiveRoomsListScreen from "../screens/LiveRoomsListScreen";
import LiveRoomScreen from "../screens/LiveRoomScreen";
import CreateLiveRoomScreen from "../screens/CreateLiveRoomScreen";
import InboxScreen from "../screens/InboxScreen";
import ChatScreen from "../screens/ChatScreen";
import LiveScreen from "../screens/LiveScreen";
import LiveStreamsListScreen from "../screens/LiveStreamsListScreen";
import WalletScreen from "../screens/WalletScreen";
import WithdrawalsTrackingScreen from "../screens/WithdrawalsTrackingScreen";
import NewFollowersScreen from "../screens/NewFollowersScreen";
import ActivityScreen from "../screens/ActivityScreen";
import SystemNotificationsScreen from "../screens/SystemNotificationsScreen";
import VerificationRequestScreen from "../screens/VerificationRequestScreen";
import MapScreen from "../screens/MapScreen";
import SplashScreen from "../screens/SplashScreen";
import BadgeShopScreen from "../screens/BadgeShopScreen";
import MyBadgesScreen from "../screens/MyBadgesScreen";
import VipStoreScreen from "../screens/VipStoreScreen";
import VipProfileScreen from "../screens/VipProfileScreen";
import LevelScreen from "../screens/LevelScreen";
import CreateStatusScreen from "../screens/CreateStatusScreen";
import StatusViewerScreen from "../screens/StatusViewerScreen";
import AllStatusesScreen from "../screens/AllStatusesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import FriendsScreen from "../screens/FriendsScreen";
import { LiveProvider } from "../context/LiveContext";
import FloatingLivePlayer from "../components/FloatingLivePlayer";
import { ActivityIndicator, View, Image, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

// Parse a tikbook://video/:videoId URL and return the videoId, or null
const parseDeepLink = (url) => {
  if (!url) return null;
  try {
    // matches tikbook://video/SOME_ID
    const match = url.match(/tikbook:\/\/video\/([^/?#]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// Navigate to the video — waits until navigation is ready
const navigateToVideo = (navigationRef, videoId) => {
  if (!videoId) return;
  // navigationRef.isReady() may be false on cold start → retry
  const attempt = (retries = 8) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("MainTabs", {
        screen: "Home",
        params: { videoId },
      });
    } else if (retries > 0) {
      setTimeout(() => attempt(retries - 1), 250);
    }
  };
  attempt();
};

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabIconWithBadge = ({ name, color, size, badgeCount, tabBarBg = "#000" }) => (
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
          borderColor: tabBarBg,
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
  const { theme, t } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 5,
          paddingTop: 5,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={theme.id === "dark" ? ["#080614", "#0E0B1E", "#130F24"] : ["#EEE8F8", "#E8E0F5", "#EBF0F8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, borderTopWidth: 0.5, borderTopColor: theme.id === "dark" ? "rgba(160,140,255,0.12)" : "rgba(100,80,180,0.12)" }}
          />
        ),
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textMuted,
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
        name="LiveRooms"
        component={LiveRoomsListScreen}
        options={{
          tabBarLabel: "البث المباشر",
          tabBarIcon: ({ color, focused }) => (
            <TabIconWithBadge
              name={focused ? "radio" : "radio-outline"}
              size={26}
              color={color}
              badgeCount={0}
              tabBarBg={theme.tabBar}
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
              tabBarBg={theme.tabBar}
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
      {/* Hidden tab — zero-width so it takes no space in the bar */}
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          tabBarButton: () => <View style={{ width: 0, overflow: "hidden" }} />,
          tabBarItemStyle: {
            width: 0,
            minWidth: 0,
            maxWidth: 0,
            padding: 0,
            margin: 0,
            overflow: "hidden",
          },
          tabBarLabel: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isLoading, userToken, fetchNotificationCount } =
    useContext(AuthContext);
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
    // Setup notification listeners (foreground + background tap)
    const unsubscribe = notificationListener(navigationRef);
    // Setup Android channel
    setupAndroidChannel();
    // Handle cold start (app opened from killed state via notification)
    handleInitialNotification(navigationRef);

    // --- Deep link handling ---
    // Cold start: app was killed, opened via tikbook:// link
    Linking.getInitialURL().then((url) => {
      const videoId = parseDeepLink(url);
      if (videoId) navigateToVideo(navigationRef, videoId);
    });
    // Warm start: app is in background/foreground, link tapped
    const linkingSub = Linking.addEventListener("url", ({ url }) => {
      const videoId = parseDeepLink(url);
      if (videoId) navigateToVideo(navigationRef, videoId);
    });

    return () => {
      unsubscribe();
      linkingSub.remove();
    };
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
    }, 2000); // Increased timeout slightly to allow for splash animation
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
    <LiveProvider>
      <VersionChecker>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {showOnboarding ? (
              <>
                <Stack.Screen
                  name="Onboarding"
                  component={OnboardingScreen}
                  options={{ gestureEnabled: false }}
                />
                {/* Add Auth screens so onboarding can navigate to them */}
                <Stack.Screen name="Auth">
                  {(props) => <LoginScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="OTP" component={OTPScreen} />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                />
                {/* Add MainTabs in case user is logged in */}
                <Stack.Screen name="MainTabs" component={HomeTabs} />
              </>
            ) : userToken ? (
              <>
                <Stack.Screen name="MainTabs" component={HomeTabs} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen
                  name="UserProfile"
                  component={UserProfileScreen}
                />
                <Stack.Screen
                  name="EditProfile"
                  component={EditProfileScreen}
                />
                <Stack.Screen name="Users" component={UsersScreen} />
                <Stack.Screen name="Upload" component={UploadScreen} />
                <Stack.Screen name="PostEdit" component={PostEditScreen} />
                <Stack.Screen name="Live" component={LiveScreen} />
                <Stack.Screen
                  name="LiveStreamsList"
                  component={LiveStreamsListScreen}
                />
                <Stack.Screen name="LiveRoom" component={LiveRoomScreen} />
                <Stack.Screen
                  name="CreateLiveRoom"
                  component={CreateLiveRoomScreen}
                />
                <Stack.Screen name="Wallet" component={WalletScreen} />
                <Stack.Screen
                  name="WithdrawalsTracking"
                  component={WithdrawalsTrackingScreen}
                />
                <Stack.Screen
                  name="NewFollowers"
                  component={NewFollowersScreen}
                />
                <Stack.Screen name="Activity" component={ActivityScreen} />
                <Stack.Screen
                  name="SystemNotifications"
                  component={SystemNotificationsScreen}
                />
                <Stack.Screen
                  name="VerificationRequest"
                  component={VerificationRequestScreen}
                />
                <Stack.Screen name="Map" component={MapScreen} />
                <Stack.Screen name="BadgeShop" component={BadgeShopScreen} />
                <Stack.Screen name="MyBadges" component={MyBadgesScreen} />
                <Stack.Screen name="VipStore" component={VipStoreScreen} />
                <Stack.Screen name="VipProfile" component={VipProfileScreen} />
                <Stack.Screen name="Levels" component={LevelScreen} />
                <Stack.Screen
                  name="CreateStatus"
                  component={CreateStatusScreen}
                />
                <Stack.Screen
                  name="StatusViewer"
                  component={StatusViewerScreen}
                  options={{ headerShown: false, animation: "fade" }}
                />
                <Stack.Screen
                  name="AllStatuses"
                  component={AllStatusesScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Auth">
                  {(props) => <LoginScreen {...props} />}
                </Stack.Screen>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="OTP" component={OTPScreen} />
                <Stack.Screen
                  name="ForgotPassword"
                  component={ForgotPasswordScreen}
                />
              </>
            )}
          </Stack.Navigator>
          <FloatingLivePlayer navigationRef={navigationRef} />
        </NavigationContainer>
      </VersionChecker>
    </LiveProvider>
  );
};

export default AppNavigator;
