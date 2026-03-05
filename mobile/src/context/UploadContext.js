import React, { createContext, useContext, useState, useRef } from "react";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { Alert } from "react-native";

export const UploadContext = createContext(null);

export const UploadProvider = ({ children }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [error, setError] = useState(null);

  const startUpload = async (formData, token, uploadUrl = null) => {
    const targetUrl = uploadUrl || `${BASE_URL}/videos`;
    setUploading(true);
    setUploadProgress(0);
    setUploadDone(false);
    setError(null);

    try {
      console.log("📤 Uploading from Context to:", targetUrl);

      const response = await axios.post(targetUrl, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.min(
            100,
            Math.round((progressEvent.loaded * 100) / progressEvent.total),
          );
          setUploadProgress(percentCompleted);
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
        timeout: 180000,
      });

      console.log("✅ Upload successful:", response.data);
      setUploadProgress(100);
      setUploadDone(true);

      // Auto hide after success
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadDone(false);
      }, 3000);

      return true;
    } catch (err) {
      console.error("❌ Upload error:", err);
      setError(err);

      let errorMessage = "فشل الرفع. الرجاء المحاولة مرة أخرى.";
      if (err.response) {
        errorMessage = err.response.data.message || errorMessage;
      } else if (err.message.includes("timeout")) {
        errorMessage = "انتهت مهلة الرفع. تحقق من اتصالك بالإنترنت.";
      }

      setUploading(false);
      return false;
    }
  };

  const resetUpload = () => {
    setUploading(false);
    setUploadProgress(0);
    setUploadDone(false);
    setError(null);
  };

  // Deprecated/Legacy helper if needed, but startUpload now takes args
  const updateProgress = (percent) => {
    setUploadProgress(percent);
  };

  const finishUpload = (success = true) => {
    // Legacy support if anything else calls this
    if (success) {
      setUploadProgress(100);
      setUploadDone(true);
      setTimeout(() => {
        setUploading(false);
      }, 3000);
    } else {
      setUploading(false);
    }
  };

  return (
    <UploadContext.Provider
      value={{
        uploading,
        uploadProgress,
        uploadDone,
        error,
        startUpload,
        updateProgress,
        finishUpload,
        resetUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
};
