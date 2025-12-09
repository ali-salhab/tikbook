import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const AdminNav = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">TikBook Admin</h1>
        </div>

        <div className="flex items-center space-x-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => navigate("/dashboard")}
              className={`px-4 py-2 rounded-lg transition font-semibold ${
                isActive("/dashboard")
                  ? "bg-white text-pink-600"
                  : "hover:bg-white hover:bg-opacity-20"
              }`}
            >
              لوحة التحكم
            </button>
            <button
              onClick={() => navigate("/app-versions")}
              className={`px-4 py-2 rounded-lg transition font-semibold ${
                isActive("/app-versions")
                  ? "bg-white text-pink-600"
                  : "hover:bg-white hover:bg-opacity-20"
              }`}
            >
              إدارة الإصدارات
            </button>
          </nav>

          <button
            onClick={onLogout}
            className="bg-white text-pink-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminNav;
