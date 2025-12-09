import React from "react";
import Sidebar from "./Sidebar";
import "../styles/AdminLayout.css";

const AdminLayout = ({ children, onLogout }) => {
  return (
    <div className="admin-layout">
      <Sidebar onLogout={onLogout} />
      <main className="admin-main-content">{children}</main>
    </div>
  );
};

export default AdminLayout;
