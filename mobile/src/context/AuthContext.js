import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  getFCMToken,
  saveTokenToBackend,
} from "../services/notificationService";
import versionService from "../services/versionService";
import { BASE_URL } from "../config/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const checkVersionAndInit = async () => {
      console.log("🚀 Starting app initialization...");
      console.log("📡 API URL:", BASE_URL);

      // Global safety timeout to ensure isLoading is always set to false
      const safetyTimeout = setTimeout(() => {
        console.log(
          "⚠️ Auth initialization taking too long, clearing loading state...",
        );
        setIsLoading(false);
      }, 5000); // Reduced to 5 seconds

      try {
        // Check version with timeout (skip if network error)
        const versionCheckPromise = versionService.checkVersion(BASE_URL);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Version check timeout")), 5000),
        );

        try {
          const versionCheck = await Promise.race([
            versionCheckPromise,
            timeoutPromise,
          ]);
          if (versionCheck.needsUpdate) {
            versionService.showUpdateDialog(
              versionCheck.message,
              versionCheck.isForced,
              versionCheck.updateUrl,
            );
          }
        } catch (versionError) {
          console.log("⚠️ Version check skipped:", versionError.message);
        }

        // Load stored user data
        console.log("📂 Loading stored user data...");
        const token = await AsyncStorage.getItem("userToken");
        const info = await AsyncStorage.getItem("userInfo");

        if (token && info) {
          console.log("✅ User data found, logging in...");
          setUserToken(token);
          setUserInfo(JSON.parse(info));

          // Register for push notifications with a timeout
          try {
            const tokenPromise = getFCMToken();
            const tokenTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("FCM token timeout")), 3000),
            );

            const fcmToken = await Promise.race([tokenPromise, tokenTimeout]);
            if (fcmToken) {
              await saveTokenToBackend(token, fcmToken, BASE_URL);
            }
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

    checkVersionAndInit();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
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
      if (e.code === "ECONNABORTED" || e.message.includes("timeout")) {
        throw new Error(
          "انتهت المهلة. تحقق من اتصال الشبكة والتأكد من تشغيل الخادم.",
        );
      } else if (e.message === "Network Error") {
        throw new Error(
          "خطأ في الاتصال. تأكد من:\n1. تشغيل الخادم على المنفذ 5000\n2. اتصال الهاتف والكمبيوتر بنفس الشبكة\n3. عنوان IP صحيح: " +
            BASE_URL,
        );
      }
      throw new Error(
        e.response?.data?.message ||
          "فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username, email, password, otp) => {
    setIsLoading(true);
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
      throw new Error(e.response?.data?.message || "فشل إنشاء الحساب");
    } finally {
      setIsLoading(false);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
