import React, { createContext, useContext, useState, useRef } from "react";

export const UploadContext = createContext(null);

export const UploadProvider = ({ children }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDone, setUploadDone] = useState(false); // brief success flash

  const startUpload = () => {
    setUploading(true);
    setUploadProgress(0);
    setUploadDone(false);
  };

  const updateProgress = (percent) => {
    setUploadProgress(percent);
  };

  const finishUpload = (success = true) => {
    setUploadProgress(100);
    if (success) {
      setUploadDone(true);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadDone(false);
      }, 2000);
    } else {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <UploadContext.Provider
      value={{
        uploading,
        uploadProgress,
        uploadDone,
        startUpload,
        updateProgress,
        finishUpload,
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
