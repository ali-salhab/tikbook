import axios from "axios";
import { BASE_URL } from "../../config/api";
import type { GiftCatalogItem, LiveChatMessage, VipTierConfig } from "../types";

const API_URL = `${BASE_URL}/live-engagement`;

const authHeaders = (token?: string) => {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const getVipLevels = async (): Promise<VipTierConfig[]> => {
  const response = await axios.get(`${API_URL}/vip-levels`);
  return response.data?.levels || [];
};

export const getGiftCatalog = async (token?: string): Promise<GiftCatalogItem[]> => {
  const response = await axios.get(`${API_URL}/gifts`, {
    headers: authHeaders(token),
  });
  return response.data?.gifts || [];
};

export const getRoomChatHistory = async (
  roomId: string,
  limit = 80,
): Promise<LiveChatMessage[]> => {
  if (!roomId) return [];

  const response = await axios.get(`${API_URL}/rooms/${roomId}/messages`, {
    params: { limit },
  });

  return response.data?.messages || [];
};
