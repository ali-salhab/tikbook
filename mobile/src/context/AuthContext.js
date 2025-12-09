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

  useEffect(() => {
    const checkVersionAndInit = async () => {
      console.log("🚀 Starting app initialization...");
      console.log("📡 API URL:", BASE_URL);

      try {
        // Check version with timeout (skip if network error)
        const versionCheckPromise = versionService.checkVersion(BASE_URL);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Version check timeout")), 5000)
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
              versionCheck.updateUrl
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

          // Register for push notifications
          const fcmToken = await getFCMToken();
          if (fcmToken) {
            await saveTokenToBackend(token, fcmToken, BASE_URL);
          }
        } else {
          console.log("ℹ️ No stored user data found");
        }
      } catch (error) {
        console.error("❌ Initialization error:", error);
      } finally {
        console.log("✅ Initialization complete, hiding splash...");
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
          timeout: 10000, // 10 second timeout
        }
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
        alert("انتهت المهلة. تحقق من اتصال الشبكة والتأكد من تشغيل الخادم.");
      } else if (e.message === "Network Error") {
        alert(
          "خطأ في الاتصال. تأكد من:\n1. تشغيل الخادم على المنفذ 5000\n2. اتصال الهاتف والكمبيوتر بنفس الشبكة\n3. عنوان IP صحيح: " +
            BASE_URL
        );
      } else {
        alert(
          e.response?.data?.message ||
            "فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username, email, password, otp) => {
    setIsLoading(true);
    try {
      console.log("📝 Attempting registration...", { username, email });
      const res = await axios.post(`${BASE_URL}/auth/register`, {
        username,
        email,
        password,
        otp,
      });
      console.log("✅ Registration successful:", res.data);
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
      console.log("❌ Register error:", e.response?.data || e.message);
      alert(e.response?.data?.message || "فشل إنشاء الحساب");
    } finally {
      setIsLoading(false);
    }
  };

  const dummyLogin = async () => {
    setIsLoading(true);
    const dummyUser = {
      _id: "guest123",
      username: "ضيف",
      email: "guest@tikbook.com",
      token: "dummy-token-for-testing",
    };
    setUserInfo(dummyUser);
    setUserToken(dummyUser.token);
    await AsyncStorage.setItem("userToken", dummyUser.token);
    await AsyncStorage.setItem("userInfo", JSON.stringify(dummyUser));
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    setUserInfo(null);
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userInfo");
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        register,
        dummyLogin,
        isLoading,
        userToken,
        userInfo,
        BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
