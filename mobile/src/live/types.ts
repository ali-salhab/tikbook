export type SupportedVipLevel = 0 | 1 | 2 | 3 | 5 | 7 | 10;

export type GiftRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export interface LiveRoomUser {
  _id: string;
  username: string;
  avatar?: string;
  profileImage?: string;
  vipLevel?: SupportedVipLevel | number;
  frameAnimationUrl?: string;
  profileFrameLottieUrl?: string;
  usernameColor?: string;
  joinAnimationLottieUrl?: string;
  joinSoundUrl?: string;
  isVerified?: boolean;
  activeBadge?: { imageUrl?: string; name?: string; _id?: string } | null;
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
  webmUrl?: string;
  animationType?: string;
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
  color?: string;
  badgeImageUrl?: string;
  badgeLottieUrl?: string;
  commentFrameLottieUrl?: string;
  commentTextColor?: string;
  commentBorderWidth?: number;
  commentBubbleShape?: "classic" | "rounded" | "square" | "pill";
  profileFrameLottieUrl?: string;
  joinAnimationLottieUrl?: string;
  joinSoundUrl?: string;
  specialJoinText?: string;
  joinDisplayDurationMs?: number;
  joinVideoUrl?: string;
  joinCardFrameImageUrl?: string;
  joinLayoutStyle?: "card" | "ticker" | "video-fullscreen";
  joinEffectPreset?: "none" | "glow" | "pulse" | "aurora" | "ring";
  joinConfigPendingReview?: boolean;
}
