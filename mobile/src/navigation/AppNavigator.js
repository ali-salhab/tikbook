import React, { useContext, useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext";
import VersionChecker from "../components/VersionChecker";
import OnboardingScreen from "../screens/OnboardingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import UploadScreen from "../screens/UploadScreen";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import UsersScreen from "../screens/UsersScreen";
import FriendsScreen from "../screens/FriendsScreen";
import InboxScreen from "../screens/InboxScreen";
import ChatScreen from "../screens/ChatScreen";
import LiveScreen from "../screens/LiveScreen";
import WalletScreen from "../screens/WalletScreen";
import NewFollowersScreen from "../screens/NewFollowersScreen";
import ActivityScreen from "../screens/ActivityScreen";
import SystemNotificationsScreen from "../screens/SystemNotificationsScreen";
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
  const { userInfo } = React.useContext(AuthContext);

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
          marginTop: -4,
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
              badgeCount={13}
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
              badgeCount={92}
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
  const { isLoading, userToken } = useContext(AuthContext);
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");
      setShowOnboarding(hasSeenOnboarding === null);
    } catch (error) {
      console.error("Error checking onboarding:", error);
      setShowOnboarding(false);
    }
  };

  if (isLoading || showOnboarding === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#FE2C55" />
      </View>
    );
  }

  return (
    <VersionChecker>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {showOnboarding ? (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ gestureEnabled: false }}
            />
          ) : null}
          {userToken ? (
            <>
              <Stack.Screen name="HomeTabs" component={HomeTabs} />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="Users" component={UsersScreen} />
              <Stack.Screen name="Upload" component={UploadScreen} />
              <Stack.Screen name="Live" component={LiveScreen} />
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
            </>
          ) : (
            <>
              <Stack.Screen name="Auth">
                {(props) => <LoginScreen {...props} />}
              </Stack.Screen>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </VersionChecker>
  );
};

export default AppNavigator;
