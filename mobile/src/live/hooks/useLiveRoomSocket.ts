import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { BASE_URL } from "../../config/api";
import {
  CHAT_SEND_THROTTLE_MS,
  GIFT_SEND_THROTTLE_MS,
  LIVE_CHAT_MAX_MESSAGES,
} from "../constants";
import type {
  GiftCatalogItem,
  GiftEventPayload,
  LiveChatMessage,
  LiveRoomUser,
} from "../types";

const SOCKET_URL = BASE_URL.replace(/\/api\/?$/, "");

type AckResponse = {
  ok?: boolean;
  error?: string;
};

interface UseLiveRoomSocketArgs {
  roomId: string;
  currentUser: LiveRoomUser;
  enabled?: boolean;
}

interface UseLiveRoomSocketResult {
  connected: boolean;
  viewerCount: number;
  messages: LiveChatMessage[];
  giftEvents: GiftEventPayload[];
  latestJoinUser: LiveRoomUser | null;
  sendChatMessage: (text: string, frameAnimationUrl?: string) => Promise<boolean>;
  sendGiftEvent: (
    gift: GiftCatalogItem,
    quantity?: number,
    receiver?: LiveRoomUser | null,
  ) => Promise<boolean>;
  clearGiftEvents: () => void;
  hydrateMessages: (history: LiveChatMessage[]) => void;
}

export const useLiveRoomSocket = ({
  roomId,
  currentUser,
  enabled = true,
}: UseLiveRoomSocketArgs): UseLiveRoomSocketResult => {
  const socketRef = useRef<Socket | null>(null);
  const lastChatSentAt = useRef(0);
  const lastGiftSentAt = useRef(0);

  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [giftEvents, setGiftEvents] = useState<GiftEventPayload[]>([]);
  const [latestJoinUser, setLatestJoinUser] = useState<LiveRoomUser | null>(null);

  useEffect(() => {
    if (!enabled || !roomId || !currentUser?._id) {
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 500,
      timeout: 10000,
    });

    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit("live:room:join", {
        roomId,
        user: {
          _id: currentUser._id,
          username: currentUser.username,
          avatar: currentUser.avatar || currentUser.profileImage,
          vipLevel: currentUser.vipLevel || 0,
          frameAnimationUrl: currentUser.frameAnimationUrl || "",
          joinAnimationLottieUrl: currentUser.joinAnimationLottieUrl || "",
        },
      });
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("live:room:viewers", (payload: { viewerCount?: number }) => {
      setViewerCount(payload?.viewerCount || 0);
    });

    socket.on("live:room:user-joined", (payload: { user?: LiveRoomUser }) => {
      const joinedUser = payload?.user;
      if (!joinedUser?._id || joinedUser._id === currentUser._id) return;
      setLatestJoinUser(joinedUser);
    });

    socket.on("live:chat:new", (payload: LiveChatMessage) => {
      if (!payload?.id || !payload?.roomId) return;
      setMessages((prev) => {
        if (prev.some((item) => item.id === payload.id)) {
          return prev;
        }
        const next = [...prev, payload];
        if (next.length <= LIVE_CHAT_MAX_MESSAGES) {
          return next;
        }
        return next.slice(next.length - LIVE_CHAT_MAX_MESSAGES);
      });
    });

    socket.on("live:gift:batch", (payload: GiftEventPayload[] | GiftEventPayload) => {
      const batch = Array.isArray(payload) ? payload : [payload];
      if (!batch.length) return;
      setGiftEvents((prev) => {
        const next = [...prev, ...batch];
        if (next.length <= 120) return next;
        return next.slice(next.length - 120);
      });
    });

    return () => {
      try {
        socket.emit("live:room:leave", { roomId });
      } catch (_) {}

      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, roomId, currentUser?._id]);

  const hydrateMessages = useCallback((history: LiveChatMessage[]) => {
    if (!Array.isArray(history) || history.length === 0) return;

    setMessages((prev) => {
      const merged = [...history, ...prev];
      const byId = new Map<string, LiveChatMessage>();
      for (const item of merged) {
        byId.set(item.id, item);
      }
      const deduped = Array.from(byId.values()).sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      if (deduped.length <= LIVE_CHAT_MAX_MESSAGES) {
        return deduped;
      }
      return deduped.slice(deduped.length - LIVE_CHAT_MAX_MESSAGES);
    });
  }, []);

  const sendChatMessage = useCallback(
    async (text: string, frameAnimationUrl = "") => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        return false;
      }

      const now = Date.now();
      if (now - lastChatSentAt.current < CHAT_SEND_THROTTLE_MS) {
        return false;
      }

      const message = text.trim();
      if (!message) {
        return false;
      }

      lastChatSentAt.current = now;

      const payload: LiveChatMessage = {
        id: `msg_${now}_${Math.random().toString(36).slice(2, 6)}`,
        roomId,
        userId: currentUser._id,
        username: currentUser.username,
        avatar: currentUser.avatar || currentUser.profileImage,
        message,
        vipLevel: currentUser.vipLevel || 0,
        frameAnimationUrl,
        createdAt: new Date().toISOString(),
      };

      return await new Promise<boolean>((resolve) => {
        socket.emit("live:chat:send", payload, (ack: AckResponse) => {
          resolve(Boolean(ack?.ok));
        });
      });
    },
    [roomId, currentUser],
  );

  const sendGiftEvent = useCallback(
    async (
      gift: GiftCatalogItem,
      quantity = 1,
      receiver: LiveRoomUser | null = null,
    ) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected || !gift?.id) {
        return false;
      }

      const now = Date.now();
      if (now - lastGiftSentAt.current < GIFT_SEND_THROTTLE_MS) {
        return false;
      }
      lastGiftSentAt.current = now;

      return await new Promise<boolean>((resolve) => {
        socket.emit(
          "live:gift:send",
          {
            roomId,
            quantity,
            gift,
            sender: currentUser,
            receiver,
          },
          (ack: AckResponse) => {
            resolve(Boolean(ack?.ok));
          },
        );
      });
    },
    [roomId, currentUser],
  );

  const clearGiftEvents = useCallback(() => {
    setGiftEvents([]);
  }, []);

  return useMemo(
    () => ({
      connected,
      viewerCount,
      messages,
      giftEvents,
      latestJoinUser,
      sendChatMessage,
      sendGiftEvent,
      clearGiftEvents,
      hydrateMessages,
    }),
    [
      connected,
      viewerCount,
      messages,
      giftEvents,
      latestJoinUser,
      sendChatMessage,
      sendGiftEvent,
      clearGiftEvents,
      hydrateMessages,
    ],
  );
};
