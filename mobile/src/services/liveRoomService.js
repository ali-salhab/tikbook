import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/live-rooms`;

const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

const liveRoomService = {
  // Kick user from room
  kickUser: async (roomId, userId) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/${roomId}/kick`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error) {
      console.error("Kick user error:", error);
      throw error;
    }
  },

  // Ban user from room
  banUser: async (roomId, userId, reason) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/${roomId}/ban`,
        { userId, reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error) {
      console.error("Ban user error:", error);
      throw error;
    }
  },

  // Unban user
  unbanUser: async (roomId, userId) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/${roomId}/unban`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error) {
      console.error("Unban user error:", error);
      throw error;
    }
  },

  // Assign moderator
  assignModerator: async (roomId, userId) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/${roomId}/assign-moderator`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error) {
      console.error("Assign moderator error:", error);
      throw error;
    }
  },

  // Remove moderator
  removeModerator: async (roomId, userId) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/${roomId}/remove-moderator`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return response.data;
    } catch (error) {
      console.error("Remove moderator error:", error);
      throw error;
    }
  },

  // Control music player
  controlMusic: async (roomId, data) => {
    try {
      const token = await getToken();
      const response = await axios.post(`${API_URL}/${roomId}/music`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Control music error:", error);
      throw error;
    }
  },
};

export default liveRoomService;
