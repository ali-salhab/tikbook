export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = {
  admin: `${API_URL}/api/admin`,
  auth: `${API_URL}/api/auth`,
  videos: `${API_URL}/api/videos`,
};
