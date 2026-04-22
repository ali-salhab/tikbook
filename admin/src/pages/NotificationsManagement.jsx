import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../config/api";
import AdminLayout from "../components/AdminLayout";

/* ── Notification type definitions ─────────────────────────────────────── */
const NOTIF_TYPES = [
  { value: "admin",        label: "إشعار إداري",    color: "#818cf8", icon: "👤" },
  { value: "system",       label: "رسالة النظام",    color: "#22d3ee", icon: "🔔" },
  { value: "announcement", label: "إعلان",           color: "#fbbf24", icon: "📢" },
  { value: "promo",        label: "عرض خاص",         color: "#f472b6", icon: "🎁" },
  { value: "update",       label: "تحديث التطبيق",   color: "#34d399", icon: "⬆️" },
];

const DEFAULT_TEMPLATES = [
  { title: "مرحبا بك! 👋",     body: "نشكرك على انضمامك إلى TikBook. استمتع بتجربتك!",                   type: "system" },
  { title: "تحديث مهم 📱",     body: "تحديث جديد متاح الآن! قم بالتحديث للحصول على أحدث الميزات.",    type: "update" },
  { title: "عرض خاص 🎁",       body: "احصل على عملات مجانية الآن! عرض لفترة محدودة.",                  type: "promo" },
  { title: "إعلان هام 📢",     body: "إعلان مهم من إدارة TikBook. يرجى الاطلاع على التفاصيل.",         type: "announcement" },
];

/* ─────────── shared style helpers ──────────────────────────────────────── */
const card = {
  background: "linear-gradient(160deg,#0e0a1e 0%,#161030 60%,#0a0818 100%)",
  border: "1px solid #2d2b55",
  borderRadius: 18,
  padding: 28,
  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
};

const inputS = {
  width: "100%",
  padding: "11px 14px",
  border: "1px solid #2d2b55",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  background: "#12102a",
  color: "#e2e8f0",
  direction: "rtl",
  fontFamily: "inherit",
  transition: "border-color .2s",
};

const labelS = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#a5b4fc",
  marginBottom: 7,
  letterSpacing: ".3px",
};

/* ─────────────────────────────────────────────────────────────────────── */
const NotificationsManagement = ({ onLogout }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("send");
  const [users, setUsers]         = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm]     = useState("");
  const [loading, setLoading]           = useState(false);
  const [alert, setAlert]               = useState({ type: "", text: "" });
  const [notifData, setNotifData]       = useState({ title: "", body: "", type: "admin" });

  useEffect(() => {
    fetchUsers();
    const p = new URLSearchParams(location.search);
    const uid = p.get("userId");
    if (uid) {
      setSelectedUser(uid);
      setActiveTab("send");
      const uname = p.get("username");
      if (uname) toast("info", `الإرسال إلى: ${uname}`);
    }
  }, [location]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await api.get("/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch {
      toast("error", "فشل في جلب المستخدمين");
    }
  };

  const toast = (type, text) => {
    setAlert({ type, text });
    setTimeout(() => setAlert({ type: "", text: "" }), 5000);
  };

  const handleSendToUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) { toast("error", "يرجى اختيار مستخدم أولاً"); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await api.post(`/admin/notify/${selectedUser}`, notifData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast("success", `✅ تم إرسال الإشعار بنجاح إلى ${res.data.user}`);
      setNotifData({ title: "", body: "", type: "admin" });
      setSelectedUser("");
    } catch (err) {
      toast("error", err.response?.data?.message || "فشل إرسال الإشعار");
    } finally {
      setLoading(false);
    }
  };

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
      toast("success",
        `تم الإرسال! المستخدمون: ${totalUsers} | نجح: ${pushNotifications?.successCount ?? 0} | فشل: ${pushNotifications?.failureCount ?? 0}`
      );
      setNotifData({ title: "", body: "", type: "admin_broadcast" });
    } catch (err) {
      toast("error", err.response?.data?.message || "فشل الإرسال العام");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const activeType = NOTIF_TYPES.find((t) => t.value === notifData.type) || NOTIF_TYPES[0];

  /* ── inline NotifForm ─────────────────────────────────────────────────── */
  const NotifForm = ({ onSubmit, submitLabel, accentColor }) => (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Type pills */}
      <div>
        <label style={labelS}>نوع الإشعار</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {NOTIF_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setNotifData((d) => ({ ...d, type: t.value }))}
              style={{
                padding: "7px 15px",
                borderRadius: 20,
                border: `1.5px solid ${notifData.type === t.value ? t.color : "#2d2b55"}`,
                background: notifData.type === t.value ? t.color + "22" : "#12102a",
                color: notifData.type === t.value ? t.color : "#7c7ca8",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all .15s",
                boxShadow: notifData.type === t.value ? `0 0 12px ${t.color}44` : "none",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={labelS}>العنوان *</label>
        <input
          type="text"
          style={inputS}
          value={notifData.title}
          onChange={(e) => setNotifData((d) => ({ ...d, title: e.target.value }))}
          placeholder="أدخل عنوان الإشعار..."
          required
          onFocus={(e) => (e.target.style.borderColor = accentColor)}
          onBlur={(e) => (e.target.style.borderColor = "#2d2b55")}
        />
      </div>

      {/* Message */}
      <div>
        <label style={labelS}>نص الرسالة *</label>
        <textarea
          style={{ ...inputS, resize: "vertical", minHeight: 110, lineHeight: 1.6 }}
          value={notifData.body}
          onChange={(e) => setNotifData((d) => ({ ...d, body: e.target.value }))}
          placeholder="أدخل نص الإشعار..."
          required
          rows={4}
          onFocus={(e) => (e.target.style.borderColor = accentColor)}
          onBlur={(e) => (e.target.style.borderColor = "#2d2b55")}
        />
      </div>

      {/* Live preview */}
      {(notifData.title || notifData.body) && (
        <div>
          <label style={{ ...labelS, color: "#64748b", fontSize: 12 }}>معاينة الإشعار</label>
          <div style={{
            background: "#0a0818",
            border: `1px solid ${activeType.color}44`,
            borderRadius: 14,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 13,
            boxShadow: `0 0 20px ${activeType.color}1a`,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              flexShrink: 0,
              background: activeType.color + "22",
              border: `1.5px solid ${activeType.color}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}>
              {activeType.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {notifData.title || "العنوان"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
                {notifData.body || "نص الإشعار..."}
              </div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 8,
                fontSize: 11,
                color: activeType.color,
                background: activeType.color + "18",
                border: `1px solid ${activeType.color}33`,
                borderRadius: 20,
                padding: "2px 9px",
                fontWeight: 700,
              }}>
                {activeType.icon} {activeType.label}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "13px 32px",
          background: loading ? "#2d2b55" : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          color: "#fff",
          border: "none",
          borderRadius: 12,
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: 15,
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 9,
          boxShadow: loading ? "none" : `0 4px 20px ${accentColor}55`,
          transition: "all .2s",
          letterSpacing: ".3px",
        }}
      >
        {loading ? "⏳ جاري الإرسال..." : submitLabel}
      </button>
    </form>
  );

  const TABS = [
    { id: "send",       label: "📨 إرسال لمستخدم", color: "#818cf8" },
    { id: "broadcast",  label: "📡 إرسال للجميع",  color: "#f87171" },
    { id: "templates",  label: "📋 القوالب",        color: "#34d399" },
  ];

  return (
    <AdminLayout onLogout={onLogout}>
      <div style={{ maxWidth: 860, margin: "0 auto", direction: "rtl", fontFamily: "inherit" }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(135deg,#818cf8,#6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: "0 4px 20px #6366f155",
            }}>
              📬
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#e2e8f0", letterSpacing: "-.3px" }}>
                إدارة الإشعارات
              </h1>
              <p style={{ margin: "3px 0 0", color: "#6b7280", fontSize: 13 }}>
                أرسل إشعارات مخصصة للمستخدمين أو أعلن للجميع
              </p>
            </div>
          </div>
        </div>

        {/* ── Alert banner ────────────────────────────────────────────────── */}
        {alert.text && (
          <div style={{
            padding: "13px 18px",
            marginBottom: 22,
            borderRadius: 12,
            background:
              alert.type === "success" ? "#052e16cc" :
              alert.type === "info"    ? "#0c1a3acc" : "#2d0d0dcc",
            color:
              alert.type === "success" ? "#4ade80" :
              alert.type === "info"    ? "#93c5fd" : "#f87171",
            border: `1px solid ${
              alert.type === "success" ? "#16a34a55" :
              alert.type === "info"    ? "#3b82f655" : "#ef444455"
            }`,
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}>
            {alert.type === "success" ? "✅" : alert.type === "info" ? "ℹ️" : "❌"}
            {alert.text}
          </div>
        )}

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          gap: 6,
          marginBottom: 26,
          background: "#0a0818",
          border: "1px solid #2d2b55",
          borderRadius: 14,
          padding: 6,
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "11px 16px",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 10,
                background: activeTab === tab.id
                  ? `linear-gradient(135deg, ${tab.color}22, ${tab.color}11)`
                  : "transparent",
                color: activeTab === tab.id ? tab.color : "#4b5563",
                boxShadow: activeTab === tab.id ? `0 0 16px ${tab.color}33, inset 0 0 0 1px ${tab.color}44` : "none",
                transition: "all .2s",
                letterSpacing: ".3px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── إرسال لمستخدم ──────────────────────────────────────────────── */}
        {activeTab === "send" && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <span style={{ fontSize: 22 }}>📨</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>
                إرسال إشعار لمستخدم محدد
              </h2>
            </div>

            {/* User picker */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelS}>اختيار المستخدم *</label>
              <input
                type="text"
                style={{ ...inputS, marginBottom: 10 }}
                placeholder="ابحث باسم المستخدم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                style={{ ...inputS, appearance: "none", cursor: "pointer" }}
                required
              >
                <option value="">-- اختر مستخدماً --</option>
                {filteredUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.username} — {u.email}
                  </option>
                ))}
              </select>

              {selectedUser && (
                <div style={{
                  marginTop: 10,
                  padding: "9px 14px",
                  background: "#052e16cc",
                  border: "1px solid #16a34a55",
                  borderRadius: 10,
                  color: "#4ade80",
                  fontWeight: 700,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}>
                  ✅ تم اختيار: {filteredUsers.find((u) => u._id === selectedUser)?.username}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #2d2b55", marginBottom: 24 }} />

            <NotifForm
              onSubmit={handleSendToUser}
              submitLabel="📨 إرسال الإشعار"
              accentColor="#818cf8"
            />
          </div>
        )}

        {/* ── إرسال للجميع ───────────────────────────────────────────────── */}
        {activeTab === "broadcast" && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 22 }}>📡</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>
                إرسال لجميع المستخدمين
              </h2>
            </div>

            <div style={{
              padding: "13px 16px",
              background: "#2d1200cc",
              border: "1px solid #f59e0b55",
              borderRadius: 12,
              color: "#fbbf24",
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}>
              ⚠️ سيتم إرسال هذا الإشعار لجميع المستخدمين في النظام!
            </div>

            <NotifForm
              onSubmit={handleBroadcast}
              submitLabel="📡 إرسال للجميع"
              accentColor="#f87171"
            />
          </div>
        )}

        {/* ── القوالب ────────────────────────────────────────────────────── */}
        {activeTab === "templates" && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>
                قوالب الإشعارات الجاهزة
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {DEFAULT_TEMPLATES.map((tpl, i) => {
                const tInfo = NOTIF_TYPES.find((t) => t.value === tpl.type) || NOTIF_TYPES[0];
                return (
                  <div
                    key={i}
                    style={{
                      background: "#12102a",
                      border: `1px solid ${tInfo.color}33`,
                      borderRadius: 16,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      boxShadow: `0 4px 20px ${tInfo.color}0d`,
                      transition: "box-shadow .2s",
                    }}
                  >
                    {/* Badge */}
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 800,
                      color: tInfo.color,
                      background: tInfo.color + "18",
                      border: `1px solid ${tInfo.color}44`,
                      borderRadius: 20,
                      padding: "4px 11px",
                      alignSelf: "flex-start",
                      letterSpacing: ".4px",
                    }}>
                      {tInfo.icon} {tInfo.label}
                    </span>

                    <div style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0" }}>
                      {tpl.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                      {tpl.body}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => { setNotifData(tpl); setActiveTab("send"); }}
                        style={{
                          flex: 1,
                          padding: "9px 0",
                          background: "linear-gradient(135deg,#818cf8,#6366f1)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: 13,
                          boxShadow: "0 3px 12px #6366f144",
                        }}
                      >
                        📨 لمستخدم
                      </button>
                      <button
                        onClick={() => { setNotifData(tpl); setActiveTab("broadcast"); }}
                        style={{
                          flex: 1,
                          padding: "9px 0",
                          background: "linear-gradient(135deg,#f87171,#ef4444)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: 13,
                          boxShadow: "0 3px 12px #ef444444",
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
