import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import Dashboard from "./pages/Dashboard";
import UsersManagement from "./pages/UsersManagement";
import VideosManagement from "./pages/VideosManagement";
import CommentsManagement from "./pages/CommentsManagement";
import PaymentsManagement from "./pages/PaymentsManagement";
import RewardsManagement from "./pages/RewardsManagement";
import AppVersionManagementPage from "./pages/AppVersionManagementPage";
import AnalyticsPage from "./pages/AnalyticsPage";

// Wrapper component to handle logout
const PageWrapper = ({ Component }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  return <Component onLogout={handleLogout} />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/old-dashboard" element={<DashboardPage />} />
        <Route
          path="/dashboard"
          element={<PageWrapper Component={Dashboard} />}
        />
        <Route
          path="/users"
          element={<PageWrapper Component={UsersManagement} />}
        />
        <Route
          path="/videos"
          element={<PageWrapper Component={VideosManagement} />}
        />
        <Route
          path="/comments"
          element={<PageWrapper Component={CommentsManagement} />}
        />
        <Route
          path="/payments"
          element={<PageWrapper Component={PaymentsManagement} />}
        />
        <Route
          path="/rewards"
          element={<PageWrapper Component={RewardsManagement} />}
        />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/app-versions" element={<AppVersionManagementPage />} />
      </Routes>
    </Router>
  );
}

export default App;
