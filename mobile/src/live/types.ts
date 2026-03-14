export type SupportedVipLevel = 0 | 1 | 2 | 3 | 5 | 7 | 10;

export type GiftRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export interface LiveRoomUser {
  _id: string;
  username: string;
  avatar?: string;
  profileImage?: string;
  vipLevel?: SupportedVipLevel | number;
  frameAnimationUrl?: string;
  usernameColor?: string;
  joinAnimationLottieUrl?: string;
}

export interface LiveChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  vipLevel?: SupportedVipLevel | number;
  frameAnimationUrl?: string;
  createdAt: string;
}

export interface GiftCatalogItem {
  id: string;
  name: string;
  coinPrice: number;
  rarity: GiftRarity;
  animationUrl?: string;
  lottieUrl?: string;
  previewImage?: string;
  soundUrl?: string;
  duration?: number;
}

export interface GiftEventPayload {
  id: string;
  roomId: string;
  sender?: LiveRoomUser | null;
  receiver?: LiveRoomUser | null;
  quantity: number;
  gift: GiftCatalogItem;
  timestamp: string;
}

export interface VipTierConfig {
  level: SupportedVipLevel | number;
  code: string;
  name: string;
  nameAr?: string;
  usernameColor: string;
  badgeImageUrl?: string;
  commentFrameLottieUrl?: string;
  joinAnimationLottieUrl?: string;
  specialJoinText?: string;
}
