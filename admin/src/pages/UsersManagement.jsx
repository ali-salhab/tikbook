import React, { useEffect, useState, useMemo } from "react";
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
  FiTrendingUp,
  FiDollarSign,
  FiPlusCircle,
  FiTrash2,
} from "react-icons/fi";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [levelEditId, setLevelEditId] = useState(null);
  const [levelEditValue, setLevelEditValue] = useState(0);
  const [levelUpdating, setLevelUpdating] = useState(false);
  const [vipLevelUpdating, setVipLevelUpdating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [availableVipLevels, setAvailableVipLevels] = useState([]);
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
    else {
      fetchUsers();
      fetchVipLevels();
    }
  }, []);

  const fetchVipLevels = async () => {
    try {
      const res = await api.get("/vip/admin/levels", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableVipLevels(res.data.levels || res.data || []);
    } catch {
      // fallback: will use numeric input
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, sortBy, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users", {
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

  const updateUserLevel = async (userId, newLevel) => {
    setLevelUpdating(true);
    try {
      const response = await api.put(`/admin/users/${userId}/level`, { level: Number(newLevel) }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, level: Number(newLevel) } : u));
        if (selectedUser?._id === userId) setSelectedUser((prev) => ({ ...prev, level: Number(newLevel) }));
        setLevelEditId(null);
        alert("تم تحديث المستوى بنجاح");
      }
    } catch (error) {
      alert("حدث خطأ أثناء تحديث المستوى");
      console.error("Update level error:", error);
    } finally {
      setLevelUpdating(false);
    }
  };

  const deleteUser = async (userId, username) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب @${username}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setDeletingUserId(userId);
    try {
      await api.delete(`/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      if (selectedUser?._id === userId) setSelectedUser(null);
    } catch (error) {
      alert("حدث خطأ أثناء حذف المستخدم");
      console.error("Delete user error:", error);
    } finally {
      setDeletingUserId(null);
    }
  };

  const updateUserVipLevel = async (userId, newVipLevel) => {
    setVipLevelUpdating(true);
    try {
      const v = Number(newVipLevel);
      if (!Number.isFinite(v) || v < 0 || v > 15) {
        alert("مستوى VIP يجب أن يكون بين 0 و 15");
        return;
      }
      const response = await api.put(`/admin/users/${userId}/vip-level`, { vipLevel: v }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, vipLevel: v } : u));
        if (selectedUser?._id === userId) setSelectedUser((prev) => ({ ...prev, vipLevel: v }));
        alert("تم تحديث مستوى VIP بنجاح");
      }
    } catch (error) {
      alert("حدث خطأ أثناء تحديث مستوى VIP");
      console.error("Update vipLevel error:", error);
    } finally {
      setVipLevelUpdating(false);
    }
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
                  <th>المستوى</th>
                  <th>VIP</th>
                  <th>إجمالي الإنفاق</th>
                  <th>إجمالي الشحن</th>
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
                      <td className="metric">{user.level || 0}</td>
                      <td className="metric">
                        {user.vipLevel > 0
                          ? <span style={{ color: "#c026d3", fontWeight: 700 }}>VIP{user.vipLevel}</span>
                          : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td className="metric">{(user.totalSpent || 0).toFixed(2)}</td>
                      <td className="metric">{(user.totalRecharged || 0).toFixed(2)}</td>
                      <td className="date-cell">
                        {new Date(user.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn-view"
                            onClick={() => setSelectedUser(user)}
                          >
                            عرض التفاصيل
                          </button>
                          <button
                            className="btn-delete"
                            disabled={deletingUserId === user._id}
                            onClick={() => deleteUser(user._id, user.username)}
                          >
                            {deletingUserId === user._id ? (
                              "..."
                            ) : (
                              <FiTrash2 size={15} />
                            )}
                          </button>
                        </div>
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

                <div className="detail-item">                    <FiTrendingUp size={18} />
                    <div>
                      <p className="label">المستوى</p>
                      <p className="value">{selectedUser.level || 0}</p>
                    </div>
                  </div>

                  <div className="detail-item">
                    <FiDollarSign size={18} />
                    <div>
                      <p className="label">إجمالي الإنفاق</p>
                      <p className="value">{(selectedUser.totalSpent || 0).toFixed(2)} عملة</p>
                    </div>
                  </div>

                  <div className="detail-item">
                    <FiPlusCircle size={18} />
                    <div>
                      <p className="label">إجمالي الشحن</p>
                      <p className="value">{(selectedUser.totalRecharged || 0).toFixed(2)} عملة</p>
                    </div>
                  </div>

                  <div className="detail-item">                  <FiCalendar size={18} />
                  <div>
                    <p className="label">تاريخ الانضمام</p>
                    <p className="value">
                      {new Date(selectedUser.createdAt).toLocaleDateString(
                        "ar-EG",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Level update section */}
              <div style={{ padding: "12px 0", borderTop: "1px solid #eee", marginBottom: "8px" }}>
                <p style={{ fontWeight: "600", marginBottom: "8px" }}>تحديث المستوى يدوياً</p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    defaultValue={selectedUser.level || 0}
                    key={selectedUser._id}
                    id="admin-level-input"
                    style={{ width: "80px", padding: "6px 10px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "14px" }}
                  />
                  <button
                    disabled={levelUpdating}
                    onClick={() => {
                      const val = document.getElementById("admin-level-input").value;
                      updateUserLevel(selectedUser._id, val);
                    }}
                    style={{ padding: "6px 16px", backgroundColor: "#6c3fdb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                  >
                    {levelUpdating ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                </div>
                <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                  المستوى الحالي: {selectedUser.level || 0} | إجمالي الإنفاق: {(selectedUser.totalSpent || 0).toFixed(2)} عملة
                </p>
              </div>

              {/* VIP Level update section */}
              <div style={{ padding: "12px 0", borderTop: "1px solid #eee", marginBottom: "8px" }}>
                <p style={{ fontWeight: "600", marginBottom: "8px" }}>تحديث مستوى VIP يدوياً</p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select
                    defaultValue={selectedUser.vipLevel || 0}
                    key={"vip-" + selectedUser._id}
                    id="admin-vip-level-input"
                    style={{ width: "130px", padding: "6px 10px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "14px" }}
                  >
                    <option value={0}>0 (بدون VIP)</option>
                    {availableVipLevels.map((lvl) => (
                      <option key={lvl.level} value={lvl.level}>
                        VIP {lvl.level} — {lvl.nameAr || lvl.name || ""}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={vipLevelUpdating}
                    onClick={() => {
                      const val = document.getElementById("admin-vip-level-input").value;
                      updateUserVipLevel(selectedUser._id, val);
                    }}
                    style={{ padding: "6px 16px", backgroundColor: "#c026d3", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                  >
                    {vipLevelUpdating ? "جارٍ الحفظ..." : "حفظ VIP"}
                  </button>
                </div>
                <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                  مستوى VIP الحالي: {selectedUser.vipLevel || 0}
                </p>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    marginRight: "10px",
                  }}
                  onClick={() => {
                    navigate(
                      `/notifications?userId=${selectedUser._id}&username=${selectedUser.username}`,
                    );
                  }}
                >
                  📬 إرسال إشعار
                </button>
                <button
                  className="btn-danger"
                  style={{ marginRight: "10px" }}
                  disabled={deletingUserId === selectedUser._id}
                  onClick={() => deleteUser(selectedUser._id, selectedUser.username)}
                >
                  <FiTrash2 size={15} style={{ marginLeft: "4px" }} />
                  {deletingUserId === selectedUser._id ? "جارٍ الحذف..." : "حذف الحساب"}
                </button>
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
