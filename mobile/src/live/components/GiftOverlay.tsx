import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  GIFT_OVERLAY_MAX_SIMULTANEOUS,
  GIFT_OVERLAY_QUEUE_LIMIT,
} from "../constants";
import type { GiftEventPayload } from "../types";
import LiveGiftAnimation from "./LiveGiftAnimation";

type Props = {
  giftEvents: GiftEventPayload[];
};

const GiftOverlay = ({ giftEvents }: Props) => {
  const [activeGifts, setActiveGifts] = useState<GiftEventPayload[]>([]);
  const pendingQueueRef = useRef<GiftEventPayload[]>([]);
  const lastProcessedIndexRef = useRef(0);

  const drainQueue = useCallback(() => {
    setActiveGifts((current) => {
      if (current.length >= GIFT_OVERLAY_MAX_SIMULTANEOUS) {
        return current;
      }

      const next = [...current];
      while (
        next.length < GIFT_OVERLAY_MAX_SIMULTANEOUS &&
        pendingQueueRef.current.length > 0
      ) {
        const item = pendingQueueRef.current.shift();
        if (item) {
          next.push(item);
        }
      }

      return next;
    });
  }, []);

  useEffect(() => {
    const start = lastProcessedIndexRef.current;
    if (giftEvents.length <= start) return;

    const incoming = giftEvents.slice(start);
    lastProcessedIndexRef.current = giftEvents.length;

    pendingQueueRef.current.push(...incoming);
    if (pendingQueueRef.current.length > GIFT_OVERLAY_QUEUE_LIMIT) {
      pendingQueueRef.current = pendingQueueRef.current.slice(
        pendingQueueRef.current.length - GIFT_OVERLAY_QUEUE_LIMIT,
      );
    }

    drainQueue();
  }, [giftEvents, drainQueue]);

  const handleGiftComplete = useCallback(
    (id: string) => {
      setActiveGifts((current) => current.filter((gift) => gift.id !== id));
      setTimeout(() => {
        drainQueue();
      }, 40);
    },
    [drainQueue],
  );

  if (activeGifts.length === 0) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="none">
      {activeGifts.map((gift, index) => (
        <LiveGiftAnimation
          key={gift.id}
          event={gift}
          stackIndex={index}
          onComplete={handleGiftComplete}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
});

export default GiftOverlay;
