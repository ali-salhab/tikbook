import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../config/api";
import AdminLayout from "../components/AdminLayout";

/* ── Notification type definitions ─────────────────────────────────────── */
const NOTIF_TYPES = [
  { value: "admin",         label: "إشعار إداري",       color: "#6366f1", icon: "👤" },
  { value: "system",        label: "رسالة النظام",       color: "#06b6d4", icon: "🔔" },
  { value: "announcement",  label: "إعلان",              color: "#f59e0b", icon: "📢" },
  { value: "promo",         label: "عرض خاص",            color: "#ec4899", icon: "🎁" },
  { value: "update",        label: "تحديث التطبيق",      color: "#10b981", icon: "⬆️" },
];

/* ── Default templates ──────────────────────────────────────────────────── */
const DEFAULT_TEMPLATES = [
  {
    title: "مرحبا بك! 👋",
    body: "نشكرك على انضمامك إلى TikBook. استمتع بتجربتك!",
    type: "system",
  },
  {
    title: "تحديث مهم 📱",
    body: "تحديث جديد متاح الآن! قم بالتحديث للحصول على أحدث الميزات.",
    type: "update",
  },
  {
    title: "عرض خاص 🎁",
    body: "احصل على عملات مجانية الآن! عرض لفترة محدودة.",
    type: "promo",
  },
  {
    title: "إعلان هام 📢",
    body: "إعلان مهم من إدارة TikBook. يرجى الاطلاع على التفاصيل.",
    type: "announcement",
  },
];

/* ── Small shared input style ───────────────────────────────────────────── */
const inputStyle = {
  width: "100%", padding: "10px 14px",
  border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#f8fafc", direction: "rtl",
  fontFamily: "inherit",
};
const labelStyle = {
  display: "block", fontSize: 13, fontWeight: 700,
  color: "#374151", marginBottom: 6,
};
const sectionStyle = {
  background: "#fff", borderRadius: 16, padding: 28,
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid #f1f5f9",
};

const NotificationsManagement = ({ onLogout }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("send");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [notifData, setNotifData] = useState({ title: "", body: "", type: "admin" });

  /* ── On mount / URL params ─────────────────────────────────────────────── */
  useEffect(() => {
    fetchUsers();
    const params = new URLSearchParams(location.search);
    const userId   = params.get("userId");
    const username = params.get("username");
    if (userId) {
      setSelectedUser(userId);
      setActiveTab("send");
      if (username) showMsg("info", `الإرسال إلى: ${username}`);
    }
  }, [location]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await api.get("/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch {
      showMsg("error", "فشل في جلب المستخدمين");
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  /* ── Send to one user ──────────────────────────────────────────────────── */
  const handleSendToUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) { showMsg("error", "يرجى اختيار مستخدم أولاً"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await api.post(`/admin/notify/${selectedUser}`, notifData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showMsg("success", `تم إرسال الإشعار بنجاح إلى ${res.data.user}`);
      setNotifData({ title: "", body: "", type: "admin" });
      setSelectedUser("");
    } catch (err) {
      showMsg("error", err.response?.data?.message || "فشل إرسال الإشعار");
    } finally {
      setLoading(false);
    }
  };

  /* ── Broadcast ─────────────────────────────────────────────────────────── */
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!window.confirm("هل أنت متأكد من إرسال هذا الإشعار لجميع المستخدمين؟")) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await api.post("/admin/notify/all", notifData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { totalUsers, pushNotifications } = res.data;
      showMsg(
        "success",
        `تم الإرسال بنجاح! المستخدمون: ${totalUsers} | إشعارات Push: ${pushNotifications?.successCount ?? 0} نجح، ${pushNotifications?.failureCount ?? 0} فشل`,
      );
      setNotifData({ title: "", body: "", type: "admin_broadcast" });
    } catch (err) {
      showMsg("error", err.response?.data?.message || "فشل الإرسال العام");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  /* ── Notification form (reused in both send & broadcast) ──────────────── */
  const NotifForm = ({ onSubmit, submitLabel, submitColor }) => (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Type */}
      <div>
        <label style={labelStyle}>نوع الإشعار</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {NOTIF_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setNotifData({ ...notifData, type: t.value })}
              style={{
                padding: "7px 14px", borderRadius: 20,
                border: `2px solid ${notifData.type === t.value ? t.color : "#e2e8f0"}`,
                background: notifData.type === t.value ? t.color + "18" : "#f8fafc",
                color: notifData.type === t.value ? t.color : "#64748b",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all .15s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={labelStyle}>العنوان *</label>
        <input
          type="text"
          style={inputStyle}
          value={notifData.title}
          onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
          placeholder="أدخل عنوان الإشعار..."
          required
        />
      </div>

      {/* Message */}
      <div>
        <label style={labelStyle}>الرسالة *</label>
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
          value={notifData.body}
          onChange={(e) => setNotifData({ ...notifData, body: e.target.value })}
          placeholder="أدخل نص الإشعار..."
          required
          rows={4}
        />
      </div>

      {/* Preview */}
      {(notifData.title || notifData.body) && (
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: (NOTIF_TYPES.find(t => t.value === notifData.type)?.color || "#6366f1") + "22",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            {NOTIF_TYPES.find(t => t.value === notifData.type)?.icon || "🔔"}
          </div>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
              {notifData.title || "العنوان"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>
              {notifData.body || "نص الإشعار..."}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "12px 28px",
          background: loading ? "#cbd5e1" : submitColor,
          color: "#fff", border: "none", borderRadius: 10,
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700, fontSize: 15,
          alignSelf: "flex-start",
          display: "flex", alignItems: "center", gap: 8,
          transition: "opacity .15s",
        }}
      >
        {loading ? "⏳ جاري الإرسال..." : submitLabel}
      </button>
    </form>
  );

  /* ── Tabs config ───────────────────────────────────────────────────────── */
  const TABS = [
    { id: "send",      label: "📨 إرسال لمستخدم",    color: "#6366f1" },
    { id: "broadcast", label: "📡 إرسال للجميع",      color: "#ef4444" },
    { id: "templates", label: "📋 القوالب",            color: "#10b981" },
  ];

  return (
    <AdminLayout onLogout={onLogout}>
      <div style={{ maxWidth: 900, margin: "0 auto", direction: "rtl" }}>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
            📬 إدارة الإشعارات
          </h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
            أرسل إشعارات مخصصة للمستخدمين أو أرسل إعلاناً للجميع
          </p>
        </div>

        {/* Alert message */}
        {message.text && (
          <div style={{
            padding: "14px 18px", marginBottom: 20, borderRadius: 10,
            backgroundColor: message.type === "success" ? "#f0fdf4" : message.type === "info" ? "#eff6ff" : "#fef2f2",
            color: message.type === "success" ? "#166534" : message.type === "info" ? "#1e40af" : "#991b1b",
            border: `1px solid ${message.type === "success" ? "#bbf7d0" : message.type === "info" ? "#bfdbfe" : "#fecaca"}`,
            fontWeight: 600, fontSize: 14,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {message.type === "success" ? "✅" : message.type === "info" ? "ℹ️" : "❌"} {message.text}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px", border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 14, borderRadius: "10px 10px 0 0",
                background: activeTab === tab.id ? "#fff" : "transparent",
                color: activeTab === tab.id ? tab.color : "#64748b",
                borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : "3px solid transparent",
                transition: "all .15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── إرسال لمستخدم ─────────────────────────────────────────────── */}
        {activeTab === "send" && (
          <div style={sectionStyle}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              📨 إرسال إشعار لمستخدم محدد
            </h2>

            {/* User search */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>اختيار المستخدم *</label>
              <input
                type="text"
                style={{ ...inputStyle, marginBottom: 8 }}
                placeholder="البحث باسم المستخدم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">-- اختر مستخدماً --</option>
                {filteredUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
              {selectedUser && (
                <div style={{ marginTop: 8, color: "#16a34a", fontWeight: 600, fontSize: 13 }}>
                  ✅ تم اختيار: {filteredUsers.find(u => u._id === selectedUser)?.username}
                </div>
              )}
            </div>

            <NotifForm
              onSubmit={handleSendToUser}
              submitLabel="📨 إرسال الإشعار"
              submitColor="#6366f1"
            />
          </div>
        )}

        {/* ── إرسال للجميع ────────────────────────────────────────────────── */}
        {activeTab === "broadcast" && (
          <div style={sectionStyle}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              📡 إرسال لجميع المستخدمين
            </h2>
            <div style={{
              padding: "12px 16px", background: "#fff7ed",
              border: "1px solid #fed7aa", borderRadius: 10,
              color: "#9a3412", fontWeight: 600, fontSize: 14, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              ⚠️ سيتم إرسال هذا الإشعار لجميع المستخدمين في النظام!
            </div>
            <NotifForm
              onSubmit={handleBroadcast}
              submitLabel="📡 إرسال للجميع"
              submitColor="#ef4444"
            />
          </div>
        )}

        {/* ── القوالب ─────────────────────────────────────────────────────── */}
        {activeTab === "templates" && (
          <div style={sectionStyle}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
              📋 قوالب الإشعارات
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {DEFAULT_TEMPLATES.map((tpl, i) => {
                const tInfo = NOTIF_TYPES.find(t => t.value === tpl.type) || NOTIF_TYPES[0];
                return (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${tInfo.color}33`,
                      borderRadius: 14, padding: 18,
                      background: tInfo.color + "08",
                      display: "flex", flexDirection: "column", gap: 10,
                    }}
                  >
                    {/* Type chip */}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 700,
                      color: tInfo.color,
                      background: tInfo.color + "18",
                      border: `1px solid ${tInfo.color}44`,
                      borderRadius: 20, padding: "3px 10px",
                      alignSelf: "flex-start",
                    }}>
                      {tInfo.icon} {tInfo.label}
                    </span>

                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                      {tpl.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                      {tpl.body}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => { setNotifData(tpl); setActiveTab("send"); }}
                        style={{
                          flex: 1, padding: "8px 0", background: "#6366f1",
                          color: "#fff", border: "none", borderRadius: 8,
                          cursor: "pointer", fontWeight: 600, fontSize: 13,
                        }}
                      >
                        📨 لمستخدم
                      </button>
                      <button
                        onClick={() => { setNotifData(tpl); setActiveTab("broadcast"); }}
                        style={{
                          flex: 1, padding: "8px 0", background: "#ef4444",
                          color: "#fff", border: "none", borderRadius: 8,
                          cursor: "pointer", fontWeight: 600, fontSize: 13,
                        }}
                      >
                        📡 للجميع
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default NotificationsManagement;
