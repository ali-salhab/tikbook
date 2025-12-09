import React, { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
} from "chart.js";
import "../styles/Dashboard.css";
import {
  FiUsers,
  FiVideo,
  FiMessageSquare,
  FiTrendingUp,
} from "react-icons/fi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    videos: 0,
    comments: 0,
    revenue: 0,
  });
  const [topUsers, setTopUsers] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    const checkAuth = () => {
      if (!token) {
        navigate("/");
      }
    };
    checkAuth();
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, videosRes] = await Promise.all([
        axios.get(`${api}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${api}/videos`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const users = usersRes.data;
      const videos = Array.isArray(videosRes.data) ? videosRes.data : [];

      // Calculate stats
      setStats({
        users: users.length,
        videos: videos.length,
        comments: videos.reduce((sum, v) => sum + (v.comments?.length || 0), 0),
        revenue: users.reduce((sum, u) => sum + (u.wallet?.balance || 0), 0),
      });

      // Get top users (by followers/activity)
      const sortedUsers = [...users]
        .sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0))
        .slice(0, 5);
      setTopUsers(sortedUsers);

      // Get top videos (by likes)
      const sortedVideos = [...videos]
        .sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))
        .slice(0, 5);
      setTopVideos(sortedVideos);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  return (
    <AdminLayout onLogout={handleLogout}>
      <div className="dashboard">
        <h1 className="dashboard-title">لوحة التحكم</h1>

        {/* Stats Cards */}
        <div className="stats-grid">
          <StatCard
            icon={<FiUsers />}
            label="المستخدمون"
            value={stats.users}
            color="#3b82f6"
          />
          <StatCard
            icon={<FiVideo />}
            label="الفيديوهات"
            value={stats.videos}
            color="#10b981"
          />
          <StatCard
            icon={<FiMessageSquare />}
            label="التعليقات"
            value={stats.comments}
            color="#f59e0b"
          />
          <StatCard
            icon={<FiTrendingUp />}
            label="الإيرادات"
            value={`${stats.revenue} جنيه`}
            color="#ef4444"
          />
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>نمو المستخدمين</h3>
            <Line
              data={{
                labels: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"],
                datasets: [
                  {
                    label: "مستخدمون جدد",
                    data: [10, 15, 20, 25, 30, 35],
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    tension: 0.4,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: true, labels: { rtl: true } },
                },
              }}
            />
          </div>

          <div className="chart-card">
            <h3>توزيع النشاط</h3>
            <Doughnut
              data={{
                labels: ["متصل", "غير متصل"],
                datasets: [
                  {
                    data: [65, 35],
                    backgroundColor: ["#10b981", "#e5e7eb"],
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { rtl: true } },
                },
              }}
            />
          </div>
        </div>

        {/* Top Items Grid */}
        <div className="top-items-grid">
          <div className="top-card">
            <h3>أفضل المستخدمين</h3>
            <div className="top-list">
              {topUsers.map((user, idx) => (
                <div key={user._id} className="top-item">
                  <span className="rank">{idx + 1}</span>
                  <div className="item-info">
                    <p className="item-name">@{user.username}</p>
                    <p className="item-meta">
                      {user.followers?.length || 0} متابعون
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="top-card">
            <h3>الفيديوهات الشهيرة</h3>
            <div className="top-list">
              {topVideos.map((video, idx) => (
                <div key={video._id} className="top-item">
                  <span className="rank">{idx + 1}</span>
                  <div className="item-info">
                    <p className="item-name">
                      {video.description?.substring(0, 30)}...
                    </p>
                    <p className="item-meta">
                      {video.likes?.length || 0} إعجاب
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-icon" style={{ color }}>
      {icon}
    </div>
    <div className="stat-content">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  </div>
);

export default Dashboard;
