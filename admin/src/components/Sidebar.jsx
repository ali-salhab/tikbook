import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Sidebar.css";
import {
  FiHome,
  FiUsers,
  FiVideo,
  FiMessageSquare,
  FiCreditCard,
  FiGift,
  FiBarChart2,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    {
      id: "dashboard",
      label: "لوحة التحكم",
      icon: FiHome,
      path: "/dashboard",
    },
    {
      id: "users",
      label: "المستخدمون",
      icon: FiUsers,
      path: "/users",
    },
    {
      id: "videos",
      label: "الفيديوهات",
      icon: FiVideo,
      path: "/videos",
    },
    {
      id: "comments",
      label: "التعليقات",
      icon: FiMessageSquare,
      path: "/comments",
    },
    {
      id: "payments",
      label: "المدفوعات",
      icon: FiCreditCard,
      path: "/payments",
    },
    {
      id: "rewards",
      label: "المكافآت والعملات",
      icon: FiGift,
      path: "/rewards",
    },
    {
      id: "analytics",
      label: "التحليلات",
      icon: FiBarChart2,
      path: "/analytics",
    },
    {
      id: "app-versions",
      label: "إدارة الإصدارات",
      icon: FiVideo,
      path: "/app-versions",
    },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavigate = (path) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`sidebar ${isOpen ? "open" : "collapsed"} ${
          isMobileOpen ? "mobile-open" : ""
        }`}
      >
        {/* Header */}
        <div className="sidebar-header">
          <h1 className="sidebar-title">TikBook</h1>
          <button
            className="sidebar-toggle"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "أغلق" : "افتح"}
          >
            {isOpen ? "❮" : "❯"}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`menu-item ${isActive(item.path) ? "active" : ""}`}
                onClick={() => handleNavigate(item.path)}
                title={isOpen ? "" : item.label}
              >
                <Icon className="menu-icon" size={20} />
                {isOpen && <span className="menu-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={onLogout}
            title={isOpen ? "" : "تسجيل الخروج"}
          >
            <FiLogOut size={20} />
            {isOpen && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
