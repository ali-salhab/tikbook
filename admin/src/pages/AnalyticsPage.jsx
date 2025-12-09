import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AnalyticsPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard since analytics is part of dashboard
    navigate("/dashboard");
  }, [navigate]);

  return null;
};

export default AnalyticsPage;
