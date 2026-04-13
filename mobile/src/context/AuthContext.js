import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  getFCMToken,
  saveTokenToBackend,
} from "../services/notificationService";
import { BASE_URL } from "../config/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      console.log("🚀 Starting app initialization...");
      console.log("📡 API URL:", BASE_URL);

      // Safety timeout — only token loading should happen here, it's fast
      const safetyTimeout = setTimeout(() => {
        console.log("⚠️ Auth init safety timeout, clearing loading state...");
        setIsLoading(false);
      }, 4000);

      try {
        // Load stored user data (fast — AsyncStorage only)
        console.log("📂 Loading stored user data...");
        const token = await AsyncStorage.getItem("userToken");
        const info = await AsyncStorage.getItem("userInfo");

        if (token && info) {
          console.log("✅ User data found, logging in...");
          setUserToken(token);
          setUserInfo(JSON.parse(info));

          // Register for push notifications — fire and forget, never block startup
          try {
            const tokenPromise = getFCMToken();
            const tokenTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("FCM token timeout")), 3000),
            );

            Promise.race([tokenPromise, tokenTimeout])
              .then((fcmToken) => {
                if (fcmToken) saveTokenToBackend(token, fcmToken, BASE_URL);
              })
              .catch((fcmError) => {
                console.log("⚠️ FCM registration skipped:", fcmError.message);
              });
          } catch (fcmError) {
            console.log("⚠️ FCM registration skipped:", fcmError.message);
          }
        } else {
          console.log("ℹ️ No stored user data found");
        }
      } catch (error) {
        console.error("❌ Initialization error:", error);
      } finally {
        console.log("✅ Initialization complete, hiding splash...");
        clearTimeout(safetyTimeout);
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      console.log("🔐 Attempting login...", {
        email,
        url: `${BASE_URL}/auth/login`,
      });
      const res = await axios.post(
        `${BASE_URL}/auth/login`,
        {
          email,
          password,
        },
        {
          timeout: 60000, // 60 second timeout for cold starts
        },
      );
      console.log("✅ Login successful:", res.data);
      setUserInfo(res.data);
      setUserToken(res.data.token);
      await AsyncStorage.setItem("userToken", res.data.token);
      await AsyncStorage.setItem("userInfo", JSON.stringify(res.data));

      // Register for push notifications
      const fcmToken = await getFCMToken();
      if (fcmToken) {
        await saveTokenToBackend(res.data.token, fcmToken, BASE_URL);
      }
    } catch (e) {
      console.log("❌ Login error:", e.response?.data || e.message);
      // Re-throw original error so LoginScreen can categorize it properly
      throw e;
    }
  };

  const register = async (username, email, password, otp) => {
    try {
      console.log("📝 Attempting registration...", { username, email });
      const res = await axios.post(
        `${BASE_URL}/auth/register`,
        {
          username,
          email,
          password,
          otp,
        },
        {
          timeout: 60000, // 60 second timeout for cold starts
        },
      );
      console.log("✅ Registration successful:", res.data);
      setUserInfo(res.data);
      setUserToken(res.data.token);
      await AsyncStorage.setItem("userToken", res.data.token);
      await AsyncStorage.setItem("userInfo", JSON.stringify(res.data));
      // Mark onboarding as seen for new users to skip onboarding screen
      await AsyncStorage.setItem("hasSeenOnboarding", "true");

      // Register for push notifications
      const fcmToken = await getFCMToken();
      if (fcmToken) {
        await saveTokenToBackend(res.data.token, fcmToken, BASE_URL);
      }
    } catch (e) {
      console.log("❌ Register error:", e.response?.data || e.message);
      // Re-throw original error so RegisterScreen can categorize it properly
      throw e;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    setUserInfo(null);
    setNotificationCount(0);
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userInfo");
    setIsLoading(false);
  };

  const fetchNotificationCount = async () => {
    if (!userToken) return;
    try {
      const res = await axios.get(`${BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setNotificationCount(res.data.count || 0);
    } catch (error) {
      console.log("Error fetching notification count:", error.message);
    }
  };
  const refreshUserInfo = async () => {
    if (!userToken || !userInfo?._id) return;
    try {
      const res = await axios.get(`${BASE_URL}/users/${userInfo._id}`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 10000,
      });
      const fresh = { ...userInfo, ...res.data, token: userToken };
      setUserInfo(fresh);
      await AsyncStorage.setItem("userInfo", JSON.stringify(fresh));
    } catch (error) {
      console.log("refreshUserInfo error:", error.message);
    }
  };
  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        register,
        isLoading,
        userToken,
        userInfo,
        BASE_URL,
        notificationCount,
        setNotificationCount,
        fetchNotificationCount,
        refreshUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
