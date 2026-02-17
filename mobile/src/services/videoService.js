import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../config/api";

const API_URL = `${BASE_URL}/videos`;

// Get auth token
const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

const videoService = {
  // Save/Unsave a video
  saveVideo: async (videoId) => {
    try {
      const token = await getToken();
      const response = await axios.put(
        `${API_URL}/${videoId}/save`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Save video error:", error);
      throw error;
    }
  },

  // Get saved videos
  getSavedVideos: async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Get saved videos error:", error);
      throw error;
    }
  },
};

export default videoService;
