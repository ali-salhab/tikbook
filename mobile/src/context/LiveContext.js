import React, { createContext, useContext, useRef, useState } from "react";

const LiveContext = createContext({});

export const useLive = () => useContext(LiveContext);

export const LiveProvider = ({ children }) => {
  const engineRef = useRef(null);
  const socketRef = useRef(null);

  const [isInLive, setIsInLive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);

  const minimize = () => setIsMinimized(true);
  const restore = () => setIsMinimized(false);

  const releaseEngine = () => {
    try {
      socketRef.current?.disconnect();
      socketRef.current = null;
    } catch (_) {}
    try {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      engineRef.current = null;
    } catch (_) {}
    setIsInLive(false);
    setIsMinimized(false);
    setRemoteUsers([]);
    setViewerCount(0);
    setChannelName("");
    setIsBroadcaster(false);
  };

  return (
    <LiveContext.Provider
      value={{
        engineRef,
        socketRef,
        isInLive,
        setIsInLive,
        isMinimized,
        minimize,
        restore,
        releaseEngine,
        channelName,
        setChannelName,
        isBroadcaster,
        setIsBroadcaster,
        remoteUsers,
        setRemoteUsers,
        viewerCount,
        setViewerCount,
      }}
    >
      {children}
    </LiveContext.Provider>
  );
};
