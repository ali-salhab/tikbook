import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.1.4:5000/api/videos";

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
