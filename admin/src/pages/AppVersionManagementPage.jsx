import React, { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../config/api";
import "../styles/AppVersionManagement.css";

const AppVersionManagementPage = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    version: "",
    platform: "android",
    priority: "optional",
    url: "",
    description: "",
    isActive: true,
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${api}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      const versionsArray = Array.isArray(data) ? data : data?.versions || [];
      setVersions(versionsArray);
    } catch (error) {
      console.error("Error fetching versions:", error);
      alert("Failed to fetch versions");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.version || !formData.url) {
      alert("Version and URL are required");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        // Update version
        await axios.put(`${api}/versions/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Version updated successfully");
      } else {
        // Create new version
        await axios.post(`${api}/versions`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Version created successfully");
      }
      fetchVersions();
      resetForm();
    } catch (error) {
      console.error("Error saving version:", error);
      alert("Failed to save version: " + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (version) => {
    setEditingId(version._id);
    setFormData({
      version: version.version,
      platform: version.platform,
      priority: version.priority,
      url: version.url,
      description: version.description,
      isActive: version.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this version?")) {
      setLoading(true);
      try {
        await axios.delete(`${api}/versions/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Version deleted successfully");
        fetchVersions();
      } catch (error) {
        console.error("Error deleting version:", error);
        alert("Failed to delete version");
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      version: "",
      platform: "android",
      priority: "optional",
      url: "",
      description: "",
      isActive: true,
    });
    setEditingId(null);
    setShowModal(false);
  };

  return (
    <div className="app-version-management">
      <div className="version-header">
        <h1>📱 App Version Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + New Version
        </button>
      </div>

      {/* Versions Table */}
      <div className="versions-table-container">
        {loading && versions.length === 0 ? (
          <p className="loading">Loading versions...</p>
        ) : versions.length === 0 ? (
          <p className="no-data">
            No versions found. Create one to get started!
          </p>
        ) : (
          <table className="versions-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Platform</th>
                <th>Priority</th>
                <th>Status</th>
                <th>URL</th>
                <th>Description</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v._id} className={!v.isActive ? "inactive" : ""}>
                  <td className="version-number">
                    <strong>{v.version}</strong>
                  </td>
                  <td>
                    <span className={`platform-badge ${v.platform}`}>
                      {v.platform.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`priority-badge ${v.priority}`}
                      title={
                        v.priority === "force"
                          ? "Users MUST upgrade"
                          : "Users can skip upgrade"
                      }
                    >
                      {v.priority === "force" ? "🔴 FORCED" : "🟡 OPTIONAL"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        v.isActive ? "active" : "inactive"
                      }`}
                    >
                      {v.isActive ? "✓ Active" : "✗ Inactive"}
                    </span>
                  </td>
                  <td className="url-cell">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="url-link"
                    >
                      Download
                    </a>
                  </td>
                  <td className="description-cell">{v.description || "—"}</td>
                  <td className="date-cell">
                    {new Date(v.createdAt).toLocaleDateString()}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-small btn-edit"
                      onClick={() => handleEdit(v)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-delete"
                      onClick={() => handleDelete(v._id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "Edit Version" : "Create New Version"}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="version-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Version Number *</label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    placeholder="e.g., 1.0.0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Platform *</label>
                  <select
                    name="platform"
                    value={formData.platform}
                    onChange={handleInputChange}
                  >
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority *</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="optional">Optional (Users can skip)</option>
                    <option value="force">Forced (Users must upgrade)</option>
                  </select>
                  <small className="help-text">
                    Forced updates will prompt users to upgrade and block access
                    until they do.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label>Download URL *</label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="What's new in this version?"
                  rows="4"
                />
              </div>

              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  name="isActive"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                <label htmlFor="isActive">
                  Active (This version is available to users)
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : editingId
                    ? "Update Version"
                    : "Create Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppVersionManagementPage;
