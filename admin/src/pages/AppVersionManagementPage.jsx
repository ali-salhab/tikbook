import React, { useEffect, useState } from "react";
import { api } from "../config/api";
import "../styles/AppVersionManagement.css";

const AppVersionManagementPage = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({
    version: "",
    platform: "android",
    priority: "optional",
    url: "",
    description: "",
    isActive: true,
  });

  const token = localStorage.getItem("adminToken");

  useEffect(() => { fetchVersions(); }, []);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await api.get("/versions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      setVersions(Array.isArray(data) ? data : data?.versions || []);
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.version || !formData.url) return;
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/versions/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post("/versions", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    if (!window.confirm("Delete this version?")) return;
    setLoading(true);
    try {
      await api.delete(`/versions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchVersions();
    } catch (error) {
      alert("Failed to delete version");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (v) => {
    try {
      await api.put(`/versions/${v._id}`, { ...v, isActive: !v.isActive }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchVersions();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setFormData({ version: "", platform: "android", priority: "optional", url: "", description: "", isActive: true });
    setEditingId(null);
    setShowModal(false);
  };

  // Stats
  const activeCount = versions.filter(v => v.isActive).length;
  const forcedCount = versions.filter(v => v.priority === "force").length;
  const androidCount = versions.filter(v => v.platform === "android").length;
  const iosCount = versions.filter(v => v.platform === "ios").length;
  const latest = versions[0];

  return (
    <div className="avm-page">
      {/* ── Header ── */}
      <div className="avm-header">
        <div className="avm-header-left">
          <div className="avm-header-icon">📱</div>
          <div>
            <h1>App Version Management</h1>
            <p>Manage APK/IPA releases and control update prompts</p>
          </div>
        </div>
        <div className="avm-header-actions">
          <button className="avm-btn avm-btn-guide" onClick={() => setShowGuide(true)}>
            📖 Expo EAS Guide
          </button>
          <button className="avm-btn avm-btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            + New Version
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="avm-stats">
        <div className="avm-stat-card">
          <div className="avm-stat-icon" style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>📦</div>
          <div>
            <div className="avm-stat-value">{versions.length}</div>
            <div className="avm-stat-label">Total Versions</div>
          </div>
        </div>
        <div className="avm-stat-card">
          <div className="avm-stat-icon" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>✅</div>
          <div>
            <div className="avm-stat-value">{activeCount}</div>
            <div className="avm-stat-label">Active</div>
          </div>
        </div>
        <div className="avm-stat-card">
          <div className="avm-stat-icon" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>🔴</div>
          <div>
            <div className="avm-stat-value">{forcedCount}</div>
            <div className="avm-stat-label">Forced Updates</div>
          </div>
        </div>
        <div className="avm-stat-card">
          <div className="avm-stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>🤖</div>
          <div>
            <div className="avm-stat-value">{androidCount}</div>
            <div className="avm-stat-label">Android</div>
          </div>
        </div>
        <div className="avm-stat-card">
          <div className="avm-stat-icon" style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" }}>🍎</div>
          <div>
            <div className="avm-stat-value">{iosCount}</div>
            <div className="avm-stat-label">iOS</div>
          </div>
        </div>
        {latest && (
          <div className="avm-stat-card avm-stat-latest">
            <div className="avm-stat-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>🏷️</div>
            <div>
              <div className="avm-stat-value">{latest.version}</div>
              <div className="avm-stat-label">Latest Version</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="avm-table-card">
        <div className="avm-table-header">
          <h2>Release History</h2>
          <span className="avm-badge-count">{versions.length} releases</span>
        </div>

        {loading && versions.length === 0 ? (
          <div className="avm-empty">
            <div className="avm-spinner" />
            <p>Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="avm-empty">
            <div className="avm-empty-icon">📭</div>
            <h3>No versions yet</h3>
            <p>Create your first version to get started</p>
            <button className="avm-btn avm-btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
              + Create First Version
            </button>
          </div>
        ) : (
          <div className="avm-table-wrap">
            <table className="avm-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Platform</th>
                  <th>Update Type</th>
                  <th>Status</th>
                  <th>Download URL</th>
                  <th>Release Notes</th>
                  <th>Released</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v, idx) => (
                  <tr key={v._id} className={!v.isActive ? "avm-row-inactive" : idx === 0 ? "avm-row-latest" : ""}>
                    <td>
                      <div className="avm-version-cell">
                        {idx === 0 && <span className="avm-latest-tag">LATEST</span>}
                        <span className="avm-version-num">{v.version}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`avm-platform-badge avm-platform-${v.platform}`}>
                        {v.platform === "android" ? "🤖" : "🍎"} {v.platform}
                      </span>
                    </td>
                    <td>
                      <span className={`avm-priority-badge avm-priority-${v.priority}`}>
                        {v.priority === "force" ? "🔴 Forced" : "🟡 Optional"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`avm-toggle ${v.isActive ? "avm-toggle-on" : "avm-toggle-off"}`}
                        onClick={() => handleToggleActive(v)}
                        title="Click to toggle"
                      >
                        <span className="avm-toggle-dot" />
                        {v.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td>
                      <div className="avm-url-cell">
                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="avm-download-btn">
                          ⬇ Download
                        </a>
                        <button
                          className="avm-copy-btn"
                          onClick={() => handleCopyUrl(v.url, v._id)}
                          title="Copy URL"
                        >
                          {copiedId === v._id ? "✅" : "📋"}
                        </button>
                      </div>
                    </td>
                    <td className="avm-desc-cell">{v.description || <span className="avm-muted">—</span>}</td>
                    <td className="avm-date-cell">
                      {new Date(v.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td>
                      <div className="avm-actions">
                        <button className="avm-action-btn avm-edit-btn" onClick={() => handleEdit(v)} disabled={loading}>
                          ✏️
                        </button>
                        <button className="avm-action-btn avm-del-btn" onClick={() => handleDelete(v._id)} disabled={loading}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="avm-overlay" onClick={resetForm}>
          <div className="avm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="avm-modal-header">
              <div className="avm-modal-title">
                <span>{editingId ? "✏️" : "🆕"}</span>
                <h2>{editingId ? "Edit Version" : "New Version"}</h2>
              </div>
              <button className="avm-close" onClick={resetForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="avm-form">
              <div className="avm-form-row">
                <div className="avm-form-group">
                  <label>Version Number <span className="avm-required">*</span></label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    placeholder="e.g.  1.2.3"
                    required
                  />
                </div>
                <div className="avm-form-group">
                  <label>Platform <span className="avm-required">*</span></label>
                  <select name="platform" value={formData.platform} onChange={handleInputChange}>
                    <option value="android">🤖 Android</option>
                    <option value="ios">🍎 iOS</option>
                  </select>
                </div>
              </div>

              <div className="avm-form-group">
                <label>Update Type <span className="avm-required">*</span></label>
                <div className="avm-priority-picker">
                  <label className={`avm-priority-option ${formData.priority === "optional" ? "selected" : ""}`}>
                    <input type="radio" name="priority" value="optional" checked={formData.priority === "optional"} onChange={handleInputChange} />
                    <div className="avm-priority-content">
                      <span className="avm-priority-icon">🟡</span>
                      <div>
                        <strong>Optional</strong>
                        <small>Users can skip the update</small>
                      </div>
                    </div>
                  </label>
                  <label className={`avm-priority-option ${formData.priority === "force" ? "selected" : ""}`}>
                    <input type="radio" name="priority" value="force" checked={formData.priority === "force"} onChange={handleInputChange} />
                    <div className="avm-priority-content">
                      <span className="avm-priority-icon">🔴</span>
                      <div>
                        <strong>Forced</strong>
                        <small>App blocks until updated</small>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="avm-form-group">
                <label>Download URL <span className="avm-required">*</span></label>
                <input
                  type="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  placeholder="https://expo.dev/artifacts/eas/... or Google Drive link"
                  required
                />
                <small className="avm-hint">💡 Paste your Expo EAS build URL or any direct APK/IPA download link</small>
              </div>

              <div className="avm-form-group">
                <label>Release Notes</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="What's new in this version?&#10;- Bug fixes&#10;- New features&#10;- Performance improvements"
                  rows="4"
                />
              </div>

              <div className="avm-form-group avm-checkbox-group">
                <label className="avm-checkbox-label">
                  <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} />
                  <span className="avm-checkmark" />
                  <div>
                    <strong>Active</strong>
                    <small>Make this version visible to users immediately</small>
                  </div>
                </label>
              </div>

              <div className="avm-form-actions">
                <button type="button" className="avm-btn avm-btn-cancel" onClick={resetForm} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="avm-btn avm-btn-primary" disabled={loading}>
                  {loading ? "⏳ Saving..." : editingId ? "💾 Save Changes" : "🚀 Publish Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Expo EAS Guide Modal ── */}
      {showGuide && (
        <div className="avm-overlay" onClick={() => setShowGuide(false)}>
          <div className="avm-modal avm-guide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="avm-modal-header">
              <div className="avm-modal-title">
                <span>📖</span>
                <h2>How to use Expo EAS with this page</h2>
              </div>
              <button className="avm-close" onClick={() => setShowGuide(false)}>✕</button>
            </div>
            <div className="avm-guide-body">

              <div className="avm-guide-section avm-guide-intro">
                <h3>🎯 What is EAS Build?</h3>
                <p>
                  <strong>EAS (Expo Application Services)</strong> is a cloud service that builds your APK and IPA files automatically.
                  After building, you get a direct download URL — paste it here and your users will always get the latest version.
                </p>
              </div>

              <div className="avm-guide-steps">
                <h3>🚀 Step-by-step workflow</h3>

                <div className="avm-step">
                  <div className="avm-step-num">1</div>
                  <div className="avm-step-content">
                    <strong>Install EAS CLI</strong>
                    <code>npm install -g eas-cli</code>
                  </div>
                </div>

                <div className="avm-step">
                  <div className="avm-step-num">2</div>
                  <div className="avm-step-content">
                    <strong>Login to Expo</strong>
                    <code>eas login</code>
                  </div>
                </div>

                <div className="avm-step">
                  <div className="avm-step-num">3</div>
                  <div className="avm-step-content">
                    <strong>Build APK for Android</strong>
                    <code>eas build --platform android --profile preview</code>
                    <small>Use <em>preview</em> profile to get a direct APK (not AAB)</small>
                  </div>
                </div>

                <div className="avm-step">
                  <div className="avm-step-num">4</div>
                  <div className="avm-step-content">
                    <strong>Get the download URL</strong>
                    <p>After build completes, go to <strong>expo.dev → your project → Builds</strong> and copy the artifact URL:</p>
                    <code>https://expo.dev/artifacts/eas/xxxx.apk</code>
                  </div>
                </div>

                <div className="avm-step">
                  <div className="avm-step-num">5</div>
                  <div className="avm-step-content">
                    <strong>Add version here</strong>
                    <p>Click <strong>+ New Version</strong>, enter the version number (e.g. <em>1.2.0</em>), paste the URL, and publish.</p>
                  </div>
                </div>

                <div className="avm-step">
                  <div className="avm-step-num">6</div>
                  <div className="avm-step-content">
                    <strong>App auto-notifies users</strong>
                    <p>Your mobile app calls <code>GET /api/versions/latest?platform=android</code> on startup and shows an update prompt if the version is newer.</p>
                  </div>
                </div>
              </div>

              <div className="avm-guide-section avm-guide-tip">
                <h3>💡 Recommended eas.json setup</h3>
                <pre>{`{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}`}</pre>
                <small>Use <strong>preview</strong> (APK) for direct download distribution. Use <strong>production</strong> (AAB) for Google Play Store.</small>
              </div>

              <div className="avm-guide-section avm-guide-tip avm-guide-tip-orange">
                <h3>⚡ OTA Updates (bonus)</h3>
                <p>For <strong>JS-only changes</strong> (no native code), use <strong>EAS Update</strong> to push updates instantly without a new APK:</p>
                <code>eas update --branch production --message "Fix checkout bug"</code>
                <small>OTA updates don't need version management here — they're delivered silently in the background.</small>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppVersionManagementPage;

