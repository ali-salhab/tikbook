import axios from "axios";

// Use environment variable or default to localhost
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Named exports for specific endpoints (legacy support)
export const apiEndpoints = {
  admin: `${API_URL}/api/admin`,
  auth: `${API_URL}/api/auth`,
  videos: `${API_URL}/api/videos`,
};
