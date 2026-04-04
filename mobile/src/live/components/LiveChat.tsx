import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import {
  LIVE_CHAT_BATCH_RENDER,
  LIVE_CHAT_INITIAL_RENDER,
  LIVE_CHAT_WINDOW_SIZE,
} from "../constants";
import type { LiveChatMessage, VipTierConfig } from "../types";
import VipCommentMessage from "./VipCommentMessage";

type Props = {
  messages: LiveChatMessage[];
  onSendMessage: (message: string) => Promise<boolean> | boolean;
  sendingDisabled?: boolean;
  animatedFrameBudget?: number;
  vipTiers?: VipTierConfig[];
};

const LiveChat = ({
  messages,
  onSendMessage,
  sendingDisabled = false,
  animatedFrameBudget = 8,
  vipTiers = [],
}: Props) => {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList<LiveChatMessage>>(null);

  const handleSend = useCallback(async () => {
    if (sendingDisabled || isSending) return;

    const text = inputValue.trim();
    if (!text) return;

    setIsSending(true);
    try {
      const ok = await onSendMessage(text);
      if (ok) {
        setInputValue("");
      }
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, onSendMessage, sendingDisabled]);

  const keyExtractor = useCallback((item: LiveChatMessage) => item.id, []);

  const renderItem: ListRenderItem<LiveChatMessage> = useCallback(
    ({ item, index }) => {
      const shouldAnimateFrame = index >= Math.max(messages.length - animatedFrameBudget, 0);
      const tierConfig = vipTiers.find((t) => Number(t.level) === Number(item.vipLevel || 0));

      return (
        <VipCommentMessage
          avatar={item.avatar}
          username={item.username}
          message={item.message}
          vipLevel={Number(item.vipLevel || 0)}
          frameAnimationUrl={item.frameAnimationUrl || tierConfig?.commentFrameLottieUrl}
          usernameColor={tierConfig?.usernameColor}
          shouldAnimateFrame={shouldAnimateFrame}
        />
      );
    },
    [animatedFrameBudget, messages.length, vipTiers],
  );

  const listFooter = useMemo(() => <View style={{ height: 8 }} />, []);

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={LIVE_CHAT_INITIAL_RENDER}
        maxToRenderPerBatch={LIVE_CHAT_BATCH_RENDER}
        windowSize={LIVE_CHAT_WINDOW_SIZE}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={listFooter}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Say something..."
          placeholderTextColor="#6B7280"
          editable={!sendingDisabled}
          multiline
          maxLength={280}
        />

        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.sendButton,
            (sendingDisabled || isSending || inputValue.trim().length === 0) && styles.sendButtonDisabled,
          ]}
          disabled={sendingDisabled || isSending || inputValue.trim().length === 0}
        >
          <Text style={styles.sendLabel}>{isSending ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#F9FAFB",
    backgroundColor: "rgba(17, 24, 39, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    fontSize: 14,
  },
  sendButton: {
    height: 38,
    minWidth: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F97316",
    paddingHorizontal: 12,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});

export default memo(LiveChat);
