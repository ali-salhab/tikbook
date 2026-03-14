import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LiveVideoPlayer from "./LiveVideoPlayer";
import LiveChat from "./LiveChat";
import GiftOverlay from "./GiftOverlay";
import GiftButton from "./GiftButton";
import GiftSelector from "./GiftSelector";
import JoinAnimation from "./JoinAnimation";
import { useLiveRoomSocket } from "../hooks/useLiveRoomSocket";
import {
  getGiftCatalog,
  getRoomChatHistory,
  getVipLevels,
} from "../services/liveEngagementApi";
import type { GiftCatalogItem, LiveRoomUser, VipTierConfig } from "../types";

type Props = {
  roomId: string;
  roomTitle?: string;
  hostName?: string;
  coverImage?: string;
  currentUser: LiveRoomUser;
  userToken?: string;
  initialBalance?: number;
  onExit?: () => void;
  onSendGiftTransaction?: (
    gift: GiftCatalogItem,
    quantity: number,
  ) => Promise<{ ok: boolean; balance?: number }>;
};

const LiveRoomScreen = ({
  roomId,
  roomTitle,
  hostName,
  coverImage,
  currentUser,
  userToken,
  initialBalance = 0,
  onExit,
  onSendGiftTransaction,
}: Props) => {
  const [vipTiers, setVipTiers] = useState<VipTierConfig[]>([]);
  const [gifts, setGifts] = useState<GiftCatalogItem[]>([]);
  const [giftSelectorVisible, setGiftSelectorVisible] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const {
    connected,
    viewerCount,
    messages,
    giftEvents,
    latestJoinUser,
    sendChatMessage,
    sendGiftEvent,
    hydrateMessages,
  } = useLiveRoomSocket({
    roomId,
    currentUser,
    enabled: Boolean(roomId && currentUser?._id),
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingCatalog(true);
      try {
        const [vipLevels, giftCatalog, chatHistory] = await Promise.all([
          getVipLevels(),
          getGiftCatalog(userToken),
          getRoomChatHistory(roomId),
        ]);

        if (!mounted) return;
        setVipTiers(vipLevels);
        setGifts(giftCatalog);
        hydrateMessages(chatHistory);
      } catch (error) {
        console.error("Load live room catalog failed:", error);
      } finally {
        if (mounted) {
          setLoadingCatalog(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [roomId, userToken]);

  const userTier = useMemo(() => {
    return vipTiers.find((tier) => Number(tier.level) === Number(currentUser.vipLevel || 0));
  }, [vipTiers, currentUser.vipLevel]);

  const activeFrameUrl = useMemo(() => {
    return currentUser.frameAnimationUrl || userTier?.commentFrameLottieUrl || "";
  }, [currentUser.frameAnimationUrl, userTier?.commentFrameLottieUrl]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      return await sendChatMessage(text, activeFrameUrl);
    },
    [sendChatMessage, activeFrameUrl],
  );

  const handleOpenGiftSelector = useCallback(() => {
    setGiftSelectorVisible(true);
  }, []);

  const handleGiftSelected = useCallback(
    async (gift: GiftCatalogItem) => {
      if (balance < gift.coinPrice) {
        return;
      }

      let transactionAllowed = true;

      if (onSendGiftTransaction) {
        const result = await onSendGiftTransaction(gift, 1);
        transactionAllowed = Boolean(result?.ok);
        if (result?.balance !== undefined) {
          setBalance(result.balance);
        }
      }

      if (!transactionAllowed) {
        return;
      }

      const sent = await sendGiftEvent(gift, 1, null);
      if (sent && !onSendGiftTransaction) {
        setBalance((prev) => Math.max(prev - gift.coinPrice, 0));
      }

      if (sent) {
        setGiftSelectorVisible(false);
      }
    },
    [balance, onSendGiftTransaction, sendGiftEvent],
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
      <LiveVideoPlayer
        title={roomTitle || "Live Audio Room"}
        hostName={hostName || "Host"}
        coverImage={coverImage}
      >
        <View style={styles.topActions}>
          <View style={styles.connectionChip}>
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: connected ? "#10B981" : "#F59E0B" },
              ]}
            />
            <Text style={styles.connectionText}>{connected ? "Live" : "Reconnecting"}</Text>
          </View>

          <Text style={styles.viewerCount}>{viewerCount} watching</Text>

          <TouchableOpacity onPress={onExit} style={styles.exitButton}>
            <Text style={styles.exitLabel}>Exit</Text>
          </TouchableOpacity>
        </View>

        <JoinAnimation user={latestJoinUser} />
        <GiftOverlay giftEvents={giftEvents} />

        <View style={styles.bottomArea}>
          <View style={styles.toolbarRow}>
            <GiftButton onPress={handleOpenGiftSelector} disabled={!connected || gifts.length === 0} />
            <Text style={styles.balanceText}>{balance} coins</Text>
          </View>

          <View style={styles.chatWrap}>
            {loadingCatalog ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#FB923C" />
                <Text style={styles.loadingText}>Loading room assets...</Text>
              </View>
            ) : (
              <LiveChat
                messages={messages}
                onSendMessage={handleSendMessage}
                sendingDisabled={!connected}
              />
            )}
          </View>
        </View>
      </LiveVideoPlayer>

      <GiftSelector
        visible={giftSelectorVisible}
        gifts={gifts}
        balance={balance}
        onClose={() => setGiftSelectorVisible(false)}
        onSendGift={handleGiftSelected}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#02030A",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  connectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(8, 12, 24, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    color: "#ECF0FF",
    fontSize: 11,
    fontWeight: "700",
  },
  viewerCount: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: "auto",
    marginRight: 10,
  },
  exitButton: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(239, 68, 68, 0.78)",
  },
  exitLabel: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomArea: {
    marginTop: "auto",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  balanceText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "700",
  },
  chatWrap: {
    height: 300,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default LiveRoomScreen;
