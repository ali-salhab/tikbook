import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/gifts`;

// Get auth token
const getToken = async () => {
  return await AsyncStorage.getItem("userToken");
};

const giftService = {
  // Get all available gifts
  getGifts: async () => {
    try {
      const token = await getToken();
      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Get gifts error:", error);
      throw error;
    }
  },

  // Send a gift
  sendGift: async (giftData) => {
    try {
      const token = await getToken();
      const response = await axios.post(`${API_URL}/send`, giftData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Send gift error:", error);
      throw error;
    }
  },

  // Get gift history
  getGiftHistory: async (type = "all", page = 1, limit = 20) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/history`, {
        params: { type, page, limit },
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Get gift history error:", error);
      throw error;
    }
  },
};

export default giftService;
