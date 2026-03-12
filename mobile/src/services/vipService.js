import axios from "axios";
import { BASE_URL } from "../config/api";

export const vipService = {
  getAllLevels: async () => {
    const res = await axios.get(`${BASE_URL}/vip/levels`);
    return res.data;
  },
  getMyVip: async (token) => {
    const res = await axios.get(`${BASE_URL}/vip/my-vip`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
  purchaseLevel: async (token, level) => {
    const res = await axios.post(
      `${BASE_URL}/vip/purchase/${level}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },
  // Admin
  adminGetAllLevels: async (token) => {
    const res = await axios.get(`${BASE_URL}/vip/admin/levels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
  adminCreateLevel: async (token, data) => {
    const res = await axios.post(`${BASE_URL}/vip/admin/levels`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
  adminUpdateLevel: async (token, level, data) => {
    const res = await axios.put(`${BASE_URL}/vip/admin/levels/${level}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
  adminDeleteLevel: async (token, level) => {
    const res = await axios.delete(`${BASE_URL}/vip/admin/levels/${level}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
  adminAssignVip: async (token, userId, level) => {
    const res = await axios.post(
      `${BASE_URL}/vip/admin/assign`,
      { userId, level },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
  },
};
