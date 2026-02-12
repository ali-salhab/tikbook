import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../config/api";
import AdminLayout from "../components/AdminLayout";

const NotificationsManagement = ({ onLogout }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("send");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Notification form state
  const [notificationData, setNotificationData] = useState({
    title: "",
    body: "",
    type: "admin",
  });

  const notificationTypes = [
    { value: "admin", label: "Admin Notification" },
    { value: "system", label: "System Message" },
    { value: "announcement", label: "Announcement" },
    { value: "promo", label: "Promotion" },
    { value: "update", label: "App Update" },
  ];

  useEffect(() => {
    fetchUsers();

    // Check for URL parameters to pre-select a user
    const params = new URLSearchParams(location.search);
    const userId = params.get("userId");
    const username = params.get("username");

    if (userId) {
      setSelectedUser(userId);
      setActiveTab("send");
      if (username) {
        showMessage("info", `Sending notification to: ${username}`);
      }
    }
  }, [location]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await api.get("/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      showMessage("error", "Failed to fetch users");
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleSendToUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      showMessage("error", "Please select a user");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await api.post(
        `/admin/notify/${selectedUser}`,
        notificationData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showMessage("success", `Notification sent to ${response.data.user}`);
      setNotificationData({ title: "", body: "", type: "admin" });
      setSelectedUser("");
    } catch (error) {
      console.error("Error sending notification:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to send notification",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (
      !confirm("Are you sure you want to send this notification to ALL users?")
    ) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await api.post("/admin/notify/all", notificationData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showMessage(
        "success",
        `Broadcast sent successfully! Total users: ${response.data.totalUsers}, Push notifications: ${response.data.pushNotifications.successCount} success, ${response.data.pushNotifications.failureCount} failed`,
      );
      setNotificationData({ title: "", body: "", type: "admin_broadcast" });
    } catch (error) {
      console.error("Error sending broadcast:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to send broadcast",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const notificationTemplates = [
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

  return (
    <AdminLayout onLogout={onLogout}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "30px", color: "#333" }}>
          📬 Notifications Management
        </h1>

        {/* Message Alert */}
        {message.text && (
          <div
            style={{
              padding: "15px 20px",
              marginBottom: "20px",
              borderRadius: "8px",
              backgroundColor:
                message.type === "success" ? "#d4edda" : "#f8d7da",
              color: message.type === "success" ? "#155724" : "#721c24",
              border: `1px solid ${
                message.type === "success" ? "#c3e6cb" : "#f5c6cb"
              }`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            borderBottom: "2px solid #ddd",
          }}
        >
          <button
            onClick={() => setActiveTab("send")}
            style={{
              padding: "12px 24px",
              border: "none",
              borderBottom: activeTab === "send" ? "3px solid #007bff" : "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === "send" ? "bold" : "normal",
              color: activeTab === "send" ? "#007bff" : "#666",
            }}
          >
            Send to User
          </button>
          <button
            onClick={() => setActiveTab("broadcast")}
            style={{
              padding: "12px 24px",
              border: "none",
              borderBottom:
                activeTab === "broadcast" ? "3px solid #007bff" : "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === "broadcast" ? "bold" : "normal",
              color: activeTab === "broadcast" ? "#007bff" : "#666",
            }}
          >
            Broadcast to All
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            style={{
              padding: "12px 24px",
              border: "none",
              borderBottom:
                activeTab === "templates" ? "3px solid #007bff" : "none",
              backgroundColor: "transparent",
              cursor: "pointer",
              fontWeight: activeTab === "templates" ? "bold" : "normal",
              color: activeTab === "templates" ? "#007bff" : "#666",
            }}
          >
            Templates
          </button>
        </div>

        {/* Send to User Tab */}
        {activeTab === "send" && (
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ marginBottom: "20px", color: "#333" }}>
              Send Notification to User
            </h2>
            <form onSubmit={handleSendToUser}>
              {/* User Selection */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  Select User *
                </label>
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    marginBottom: "10px",
                  }}
                />
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                  }}
                >
                  <option value="">-- Select User --</option>
                  {filteredUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notification Type */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  Notification Type
                </label>
                <select
                  value={notificationData.type}
                  onChange={(e) =>
                    setNotificationData({
                      ...notificationData,
                      type: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                  }}
                >
                  {notificationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  Title *
                </label>
                <input
                  type="text"
                  value={notificationData.title}
                  onChange={(e) =>
                    setNotificationData({
                      ...notificationData,
                      title: e.target.value,
                    })
                  }
                  required
                  placeholder="Enter notification title..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  Message *
                </label>
                <textarea
                  value={notificationData.body}
                  onChange={(e) =>
                    setNotificationData({
                      ...notificationData,
                      body: e.target.value,
                    })
                  }
                  required
                  placeholder="Enter notification message..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px 30px",
                  backgroundColor: loading ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                {loading ? "Sending..." : "Send Notification"}
              </button>
            </form>
          </div>
        )}

        {/* Broadcast Tab */}
        {activeTab === "broadcast" && (
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ marginBottom: "20px", color: "#333" }}>
              Broadcast to All Users
            </h2>
            <div
              style={{
                padding: "15px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffeaa7",
                borderRadius: "6px",
                marginBottom: "20px",
                color: "#856404",
              }}
            >
              ⚠️ This will send a notification to ALL users in the system!
            </div>
            <form onSubmit={handleBroadcast}>
              {/* Notification Type */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  Notification Type
                </label>
                <select
                  value={notificationData.type}
                  onChange={(e) =>
                    setNotificationData({
                      ...notificationData,
                      type: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                  }}
                >
                  {notificationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  Title *
                </label>
                <input
                  type="text"
                  value={notificationData.title}
                  onChange={(e) =>
                    setNotificationData({
                      ...notificationData,
                      title: e.target.value,
                    })
                  }
                  required
                  placeholder="Enter notification title..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "bold",
                    color: "#555",
                  }}
                >
                  Message *
                </label>
                <textarea
                  value={notificationData.body}
                  onChange={(e) =>
                    setNotificationData({
                      ...notificationData,
                      body: e.target.value,
                    })
                  }
                  required
                  placeholder="Enter broadcast message..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px 30px",
                  backgroundColor: loading ? "#ccc" : "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                {loading ? "Broadcasting..." : "Send Broadcast"}
              </button>
            </form>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ marginBottom: "20px", color: "#333" }}>
              Notification Templates
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "20px",
              }}
            >
              {notificationTemplates.map((template, index) => (
                <div
                  key={index}
                  style={{
                    padding: "20px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <h3 style={{ marginBottom: "10px", color: "#333" }}>
                    {template.title}
                  </h3>
                  <p
                    style={{
                      marginBottom: "10px",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    {template.body}
                  </p>
                  <div
                    style={{
                      marginBottom: "15px",
                      fontSize: "12px",
                      color: "#888",
                    }}
                  >
                    Type: <strong>{template.type}</strong>
                  </div>
                  <button
                    onClick={() => {
                      setNotificationData(template);
                      setActiveTab("send");
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                      marginRight: "10px",
                    }}
                  >
                    Use Template
                  </button>
                  <button
                    onClick={() => {
                      setNotificationData(template);
                      setActiveTab("broadcast");
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Broadcast
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default NotificationsManagement;
