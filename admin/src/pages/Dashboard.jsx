import React, { useEffect, useState } from "react";
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
  Filler,
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
  PointElement,
  Filler,
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
  const [recentActivity, setRecentActivity] = useState({
    labels: [],
    data: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    setError(null);
    try {
      const [usersRes, videosRes] = await Promise.all([
        api.get("/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get("/admin/videos", {
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

      // Calculate monthly user growth from actual data
      const monthlyData = calculateMonthlyGrowth(users);
      setRecentActivity(monthlyData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load dashboard data. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyGrowth = (users) => {
    const months = [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];
    const now = new Date();
    const last6Months = [];
    const counts = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      last6Months.push(monthName);

      const count = users.filter((user) => {
        const userDate = new Date(user.createdAt);
        return (
          userDate.getMonth() === date.getMonth() &&
          userDate.getFullYear() === date.getFullYear()
        );
      }).length;
      counts.push(count);
    }

    return { labels: last6Months, data: counts };
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  return (
    <AdminLayout onLogout={handleLogout}>
      <div className="dashboard">
        <h1 className="dashboard-title">لوحة التحكم</h1>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                border: "4px solid #f3f4f6",
                borderTop: "4px solid #FE2C55",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <p style={{ color: "#6b7280", fontSize: "16px" }}>
              جاري تحميل البيانات من الخادم...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
              color: "#991B1B",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>
              ⚠️ خطأ في تحميل البيانات
            </p>
            <p style={{ margin: "8px 0 0 0", fontSize: "14px" }}>{error}</p>
            <button
              onClick={fetchDashboardData}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "#FE2C55",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && !error && (
          <>
            {/* Stats Cards */}
            <div className="stats-grid">
              <StatCard
                icon={<FiUsers />}
                label="المستخدمون"
                value={stats.users}
                color="#FE2C55"
              />
              <StatCard
                icon={<FiVideo />}
                label="الفيديوهات"
                value={stats.videos}
                color="#25F4EE"
              />
              <StatCard
                icon={<FiMessageSquare />}
                label="التعليقات"
                value={stats.comments}
                color="#FE2C55"
              />
              <StatCard
                icon={<FiTrendingUp />}
                label="الإيرادات"
                value={`${stats.revenue} جنيه`}
                color="#25F4EE"
              />
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3>نمو المستخدمين</h3>
                <Line
                  data={{
                    labels: recentActivity.labels || [
                      "يناير",
                      "فبراير",
                      "مارس",
                      "أبريل",
                      "مايو",
                      "يونيو",
                    ],
                    datasets: [
                      {
                        label: "مستخدمون جدد",
                        data: recentActivity.data || [0, 0, 0, 0, 0, 0],
                        borderColor: "#FE2C55",
                        backgroundColor: "rgba(254, 44, 85, 0.1)",
                        tension: 0.4,
                        fill: true,
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
                        data: [
                          stats.users > 0 ? Math.round(stats.users * 0.3) : 0,
                          stats.users > 0 ? Math.round(stats.users * 0.7) : 0,
                        ],
                        backgroundColor: ["#FE2C55", "#e5e7eb"],
                        borderWidth: 0,
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
                  {topUsers.length > 0 ? (
                    topUsers.map((user, idx) => (
                      <div key={user._id} className="top-item">
                        <span className="rank">{idx + 1}</span>
                        <div className="item-info">
                          <p className="item-name">@{user.username}</p>
                          <p className="item-meta">
                            {user.followers?.length || 0} متابعون
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "#9ca3af",
                      }}
                    >
                      <p>لا يوجد مستخدمون حتى الآن</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="top-card">
                <h3>الفيديوهات الشهيرة</h3>
                <div className="top-list">
                  {topVideos.length > 0 ? (
                    topVideos.map((video, idx) => (
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
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "#9ca3af",
                      }}
                    >
                      <p>لا توجد فيديوهات حتى الآن</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
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
