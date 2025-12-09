import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "../styles/UsersManagement.css";
import {
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiUser,
  FiMail,
  FiCalendar,
  FiActivity,
} from "react-icons/fi";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "all", // all, active, inactive
    joinDate: "all", // all, today, thisWeek, thisMonth, thisYear
    activityLevel: "all", // all, veryActive, active, inactive
  });

  // Sorting
  const [sortBy, setSortBy] = useState("followers"); // followers, videos, joinDate, activity

  useEffect(() => {
    if (!token) navigate("/");
    else fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, sortBy, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${api}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      const usersArray = Array.isArray(data) ? data : data?.users || [];
      setUsers(usersArray);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const getActivityLevel = (user) => {
    const videosCount = user.videos?.length || 0;
    const followersCount = user.followers?.length || 0;
    const activityScore = videosCount * 2 + followersCount;

    if (activityScore > 100) return "veryActive";
    if (activityScore > 20) return "active";
    return "inactive";
  };

  const getJoinDateCategory = (joinDate) => {
    const date = new Date(joinDate);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays <= 7) return "thisWeek";
    if (diffDays <= 30) return "thisMonth";
    if (diffDays <= 365) return "thisYear";
    return "older";
  };

  const applyFilters = () => {
    const baseUsers = Array.isArray(users) ? users : [];
    let result = baseUsers.filter((user) => {
      // Search filter
      if (
        filters.search &&
        !user.username.toLowerCase().includes(filters.search.toLowerCase()) &&
        !user.email.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filters.status !== "all") {
        const isActive =
          user.lastActive && new Date() - new Date(user.lastActive) < 86400000;
        if (filters.status === "active" && !isActive) return false;
        if (filters.status === "inactive" && isActive) return false;
      }

      // Join date filter
      if (filters.joinDate !== "all") {
        const category = getJoinDateCategory(user.createdAt);
        if (filters.joinDate !== category && filters.joinDate !== "older")
          return false;
      }

      // Activity level filter
      if (filters.activityLevel !== "all") {
        const level = getActivityLevel(user);
        if (filters.activityLevel !== level) return false;
      }

      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "followers":
          return (b.followers?.length || 0) - (a.followers?.length || 0);
        case "videos":
          return (b.videos?.length || 0) - (a.videos?.length || 0);
        case "joinDate":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "activity":
          return getActivityLevel(b) === "veryActive" ? 1 : -1;
        default:
          return 0;
      }
    });

    setFilteredUsers(result);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  const activityLevelColor = (level) => {
    switch (level) {
      case "veryActive":
        return "#10b981";
      case "active":
        return "#f59e0b";
      case "inactive":
        return "#6b7280";
      default:
        return "#3b82f6";
    }
  };

  const activityLevelLabel = (level) => {
    switch (level) {
      case "veryActive":
        return "نشيط جداً";
      case "active":
        return "نشيط";
      case "inactive":
        return "غير نشيط";
      default:
        return "غير معروف";
    }
  };

  return (
    <AdminLayout onLogout={handleLogout}>
      <div className="users-management">
        <div className="page-header">
          <h1>إدارة المستخدمين</h1>
          <div className="header-stats">
            <span>{filteredUsers.length} مستخدم</span>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="filters-bar">
          <div className="search-box">
            <FiSearch size={20} />
            <input
              type="text"
              placeholder="ابحث عن مستخدم..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>

          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter size={18} />
            تصفية
            <FiChevronDown
              size={18}
              style={{ transform: showFilters ? "rotate(180deg)" : "" }}
            />
          </button>

          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="followers">الترتيب: عدد المتابعين</option>
            <option value="videos">الترتيب: عدد الفيديوهات</option>
            <option value="joinDate">الترتيب: تاريخ الانضمام</option>
            <option value="activity">الترتيب: مستوى النشاط</option>
          </select>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>الحالة</label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="all">الكل</option>
                <option value="active">نشيط</option>
                <option value="inactive">غير نشيط</option>
              </select>
            </div>

            <div className="filter-group">
              <label>تاريخ الانضمام</label>
              <select
                value={filters.joinDate}
                onChange={(e) =>
                  setFilters({ ...filters, joinDate: e.target.value })
                }
              >
                <option value="all">كل الفترات</option>
                <option value="today">اليوم</option>
                <option value="thisWeek">هذا الأسبوع</option>
                <option value="thisMonth">هذا الشهر</option>
                <option value="thisYear">هذه السنة</option>
              </select>
            </div>

            <div className="filter-group">
              <label>مستوى النشاط</label>
              <select
                value={filters.activityLevel}
                onChange={(e) =>
                  setFilters({ ...filters, activityLevel: e.target.value })
                }
              >
                <option value="all">الكل</option>
                <option value="veryActive">نشيط جداً</option>
                <option value="active">نشيط</option>
                <option value="inactive">غير نشيط</option>
              </select>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="users-table-container">
          {loading ? (
            <p className="loading">جاري التحميل...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="no-data">لا توجد نتائج</p>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>البريد الإلكتروني</th>
                  <th>المتابعون</th>
                  <th>الفيديوهات</th>
                  <th>النشاط</th>
                  <th>التاريخ</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const activity = getActivityLevel(user);
                  return (
                    <tr key={user._id}>
                      <td className="user-cell">
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="user-name">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td className="metric">{user.followers?.length || 0}</td>
                      <td className="metric">{user.videos?.length || 0}</td>
                      <td>
                        <span
                          className="activity-badge"
                          style={{
                            backgroundColor: activityLevelColor(activity),
                          }}
                        >
                          {activityLevelLabel(activity)}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(user.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td>
                        <button
                          className="btn-view"
                          onClick={() => setSelectedUser(user)}
                        >
                          عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
            <div
              className="modal-content user-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-btn"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>

              <div className="user-detail-header">
                <div className="user-avatar-large">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <h2>@{selectedUser.username}</h2>
              </div>

              <div className="user-details-grid">
                <div className="detail-item">
                  <FiMail size={18} />
                  <div>
                    <p className="label">البريد الإلكتروني</p>
                    <p className="value">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <FiUser size={18} />
                  <div>
                    <p className="label">المتابعون</p>
                    <p className="value">
                      {selectedUser.followers?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="detail-item">
                  <FiActivity size={18} />
                  <div>
                    <p className="label">الفيديوهات</p>
                    <p className="value">{selectedUser.videos?.length || 0}</p>
                  </div>
                </div>

                <div className="detail-item">
                  <FiCalendar size={18} />
                  <div>
                    <p className="label">تاريخ الانضمام</p>
                    <p className="value">
                      {new Date(selectedUser.createdAt).toLocaleDateString(
                        "ar-EG"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-primary"
                  onClick={() => setSelectedUser(null)}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default UsersManagement;
