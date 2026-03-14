import React, { memo, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LottieView, { type AnimationObject } from "lottie-react-native";
import type { GiftCatalogItem } from "../types";
import { fetchLottieJson, getCachedLottieJson } from "../services/lottieCache";

type Props = {
  visible: boolean;
  gifts: GiftCatalogItem[];
  balance: number;
  onClose: () => void;
  onSendGift: (gift: GiftCatalogItem) => void;
};

type GiftCardProps = {
  item: GiftCatalogItem;
  onPress: (gift: GiftCatalogItem) => void;
  shouldAnimate: boolean;
  disabled: boolean;
};

const GiftCard = memo(({ item, onPress, shouldAnimate, disabled }: GiftCardProps) => {
  const [json, setJson] = useState<unknown | null>(() =>
    getCachedLottieJson(item.lottieUrl || item.animationUrl),
  );

  useEffect(() => {
    let mounted = true;
    const url = item.lottieUrl || item.animationUrl;

    if (!url || !shouldAnimate) {
      return () => {
        mounted = false;
      };
    }

    fetchLottieJson(url).then((payload) => {
      if (!mounted) return;
      setJson(payload);
    });

    return () => {
      mounted = false;
    };
  }, [item.lottieUrl, item.animationUrl, shouldAnimate]);

  return (
    <TouchableOpacity
      style={[styles.giftCard, disabled && styles.giftCardDisabled]}
      onPress={() => onPress(item)}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.previewBox}>
        {json ? (
          <LottieView source={json as AnimationObject} autoPlay loop style={styles.lottie} />
        ) : item.previewImage ? (
          <Image source={{ uri: item.previewImage }} style={styles.previewImage} />
        ) : (
          <Text style={styles.previewFallback}>{item.name.slice(0, 1)}</Text>
        )}
      </View>

      <Text numberOfLines={1} style={styles.giftName}>
        {item.name}
      </Text>
      <Text style={styles.priceLabel}>{item.coinPrice} coins</Text>
      <Text style={styles.rarity}>{item.rarity}</Text>
    </TouchableOpacity>
  );
});

const GiftSelector = ({
  visible,
  gifts,
  balance,
  onClose,
  onSendGift,
}: Props) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Choose Gift</Text>
            <Text style={styles.balance}>Balance: {balance}</Text>
          </View>

          <FlatList
            data={gifts}
            keyExtractor={(item) => item.id}
            numColumns={4}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.listRow}
            renderItem={({ item, index }) => (
              <GiftCard
                item={item}
                onPress={onSendGift}
                shouldAnimate={index < 12}
                disabled={balance < item.coinPrice}
              />
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.56)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0E1322",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    minHeight: 320,
    maxHeight: "72%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "800",
  },
  balance: {
    color: "#FDBA74",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 8,
  },
  listRow: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  giftCard: {
    width: "23.5%",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  giftCardDisabled: {
    opacity: 0.36,
  },
  previewBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
  previewFallback: {
    color: "#E5E7EB",
    fontWeight: "800",
    fontSize: 18,
  },
  giftName: {
    color: "#F3F4F6",
    fontSize: 11,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
  priceLabel: {
    color: "#FCD34D",
    fontSize: 10,
    marginTop: 2,
  },
  rarity: {
    marginTop: 2,
    color: "#A5B4FC",
    fontSize: 9,
    textTransform: "uppercase",
  },
});

export default GiftSelector;
