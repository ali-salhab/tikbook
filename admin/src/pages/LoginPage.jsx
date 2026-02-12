import React, { useState } from "react";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      if (res.data.isAdmin) {
        localStorage.setItem("adminToken", res.data.token);
        navigate("/dashboard");
      } else {
        setError(
          "Not authorized as admin. This account does not have admin privileges.",
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(
        error.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="p-10 bg-white rounded-lg shadow-xl w-96">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.jpg"
            alt="TikBook Logo"
            className="w-24 h-24 object-contain rounded-full shadow-md"
          />
        </div>

        <h2 className="mb-2 text-2xl font-bold text-center text-gray-800">
          TikBook Admin
        </h2>
        <p className="mb-6 text-sm text-center text-gray-600">
          Admin Panel Login
        </p>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-400 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Email
            </label>
            <input
              type="email"
              className="w-full p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 text-sm font-bold text-gray-700">
              Password
            </label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-sm text-center text-gray-600">
          <p className="mb-1">Default credentials:</p>
          <p className="font-mono text-xs">admin@tikbook.com / 123456</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
