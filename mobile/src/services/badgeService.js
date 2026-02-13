import axios from "axios";
import { BASE_URL } from "../config/api";

export const badgeService = {
  // Get all available badges
  getAllBadges: async (token, type = null) => {
    try {
      const url = type
        ? `${BASE_URL}/badges?type=${type}`
        : `${BASE_URL}/badges`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get user's owned badges
  getMyBadges: async (token) => {
    try {
      const response = await axios.get(`${BASE_URL}/badges/my-badges`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Purchase a badge
  purchaseBadge: async (token, badgeId) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/badges/purchase/${badgeId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Set active badge
  setActiveBadge: async (token, badgeId) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/badges/set-active/${badgeId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Set active background
  setActiveBackground: async (token, badgeId) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/badges/set-active-background/${badgeId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Gift badge to user
  giftBadge: async (token, badgeId, userId) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/badges/gift`,
        { badgeId, userId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin: Create new badge
  createBadge: async (token, badgeData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/badges/create`,
        badgeData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
