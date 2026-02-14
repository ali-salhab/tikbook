import React, { useEffect, useState } from "react";
import { api, API_URL } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "../styles/BadgeManagement.css";
import {
  FiUpload,
  FiEdit,
  FiTrash2,
  FiGift,
  FiX,
  FiCheck,
  FiImage,
  FiPackage,
} from "react-icons/fi";

const BadgeManagement = ({ onLogout }) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // all, frames, backgrounds
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageFile: null,
    imageUrl: "",
    type: "frame",
    rarity: "common",
    price: 0,
    isExclusive: false,
    sortOrder: 0,
    properties: {
      animation: "none",
      glowEffect: false,
      particleEffect: "none",
    },
  });

  // Gift form state
  const [giftData, setGiftData] = useState({
    userId: "",
    username: "",
  });

  useEffect(() => {
    if (!token) navigate("/");
    else fetchBadges();
  }, []);

  const fetchBadges = async () => {
    setLoading(true);
    try {
      const response = await api.get("/badges", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBadges(response.data.badges || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
      alert("Failed to load badges");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, imageFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToCloudinary = async (file) => {
    // Using your Cloudinary account: dah8ui33p
    const cloudName = "dah8ui33p";
    const uploadPreset = "badges_preset"; // ✅ Preset created and ready!
    
    const cloudinaryData = new FormData();
    cloudinaryData.append("file", file);
    cloudinaryData.append("upload_preset", uploadPreset);
    cloudinaryData.append("folder", "tikbook/badges");

    try {
      setUploadProgress(10);
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: cloudinaryData,
        },
      );
      
      setUploadProgress(80);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "Upload failed");
      }
      
      setUploadProgress(100);
      
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  };

  const handleCreateBadge = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.imageUrl.trim();

      // If file is selected, try to upload to Cloudinary
      if (formData.imageFile && !imageUrl) {
        try {
          imageUrl = await uploadImageToCloudinary(formData.imageFile);
        } catch (uploadError) {
          alert(
            `Image upload failed: ${uploadError.message}\n\n` +
            "SOLUTION:\n" +
            "1. Create an unsigned upload preset named 'badges_preset' in Cloudinary\n" +
            "   (See CLOUDINARY_SETUP.md for instructions)\n\n" +
            "OR\n\n" +
            "2. Upload your image manually to Cloudinary and paste the URL in 'Image URL' field\n" +
            "   • Login to Cloudinary: https://cloudinary.com/console\n" +
            "   • Upload to Media Library\n" +
            "   • Copy image URL and paste it below"
          );
          setLoading(false);
          return;
        }
      }

      if (!imageUrl) {
        alert(
          "Please provide an image!\n\n" +
          "OPTION 1: Upload File\n" +
          "• Click 'Choose Image' button\n" +
          "• Select your badge PNG file\n" +
          "• Requires Cloudinary preset setup (see CLOUDINARY_SETUP.md)\n\n" +
          "OPTION 2: Use Image URL (Recommended)\n" +
          "• Upload your badge to Cloudinary manually\n" +
          "• Login: https://console.cloudinary.com/console/dah8ui33p/media_library\n" +
          "• Upload to Media Library → tikbook/badges folder\n" +
          "• Copy the image URL and paste it in 'Image URL' field\n\n" +
          "Your Cloudinary account: dah8ui33p"
        );
        setLoading(false);
        return;
      }
          "• ImgBB: https://imgbb.com\n" +
          "• Imgur: https://imgur.com\n\n" +
          "Then paste the direct image URL in the 'Image URL' field."
        );
        setLoading(false);
        return;
      }

      // Validate image URL format
      if (!imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i)) {
        alert("Please provide a valid image URL ending with .jpg, .png, .gif, or .webp");
        setLoading(false);
        return;
      }

      const badgeData = {
        name: formData.name,
        description: formData.description,
        imageUrl: imageUrl,
        type: formData.type,
        rarity: formData.rarity,
        price: Number(formData.price),
        isExclusive: formData.isExclusive,
        sortOrder: Number(formData.sortOrder),
        properties: formData.properties,
      };

      await api.post("/badges/create", badgeData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Badge created successfully!");
      setShowCreateModal(false);
      resetForm();
      fetchBadges();
    } catch (error) {
      console.error("Error creating badge:", error);
      alert(error.response?.data?.message || "Failed to create badge");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBadge = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.imageUrl.trim();

      // If new file is selected, try to upload to Cloudinary
      if (formData.imageFile) {
        try {
          imageUrl = await uploadImageToCloudinary(formData.imageFile);
        } catch (uploadError) {
          alert(
            uploadError.message || 
            "Image upload failed. Please use the Image URL field instead."
          );
          setLoading(false);
          return;
        }
      }

      if (!imageUrl) {
        alert("Please provide an image URL");
        setLoading(false);
        return;
      }

      const badgeData = {
        name: formData.name,
        description: formData.description,
        imageUrl: imageUrl,
        type: formData.type,
        rarity: formData.rarity,
        price: Number(formData.price),
        isExclusive: formData.isExclusive,
        sortOrder: Number(formData.sortOrder),
        properties: formData.properties,
      };

      await api.put(`/badges/${selectedBadge._id}`, badgeData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Badge updated successfully!");
      setShowEditModal(false);
      resetForm();
      fetchBadges();
    } catch (error) {
      console.error("Error updating badge:", error);
      alert(error.response?.data?.message || "Failed to update badge");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBadge = async (badgeId) => {
    if (!confirm("Are you sure you want to delete this badge?")) return;

    try {
      await api.delete(`/badges/${badgeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Badge deleted successfully!");
      fetchBadges();
    } catch (error) {
      console.error("Error deleting badge:", error);
      alert(error.response?.data?.message || "Failed to delete badge");
    }
  };

  const handleGiftBadge = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(
        "/badges/gift",
        {
          badgeId: selectedBadge._id,
          userId: giftData.userId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert(`Badge gifted successfully to user!`);
      setShowGiftModal(false);
      setGiftData({ userId: "", username: "" });
    } catch (error) {
      console.error("Error gifting badge:", error);
      alert(error.response?.data?.message || "Failed to gift badge");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (badge) => {
    setSelectedBadge(badge);
    setFormData({
      name: badge.name,
      description: badge.description,
      imageFile: null,
      imageUrl: badge.imageUrl,
      type: badge.type,
      rarity: badge.rarity,
      price: badge.price,
      isExclusive: badge.isExclusive,
      sortOrder: badge.sortOrder || 0,
      properties: badge.properties || {
        animation: "none",
        glowEffect: false,
        particleEffect: "none",
      },
    });
    setImagePreview(badge.imageUrl);
    setShowEditModal(true);
  };

  const openGiftModal = (badge) => {
    setSelectedBadge(badge);
    setShowGiftModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      imageFile: null,
      imageUrl: "",
      type: "frame",
      rarity: "common",
      price: 0,
      isExclusive: false,
      sortOrder: 0,
      properties: {
        animation: "none",
        glowEffect: false,
        particleEffect: "none",
      },
    });
    setImagePreview(null);
    setSelectedBadge(null);
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: "#95A5A6",
      rare: "#3498DB",
      epic: "#9B59B6",
      legendary: "#FFD700",
    };
    return colors[rarity] || "#95A5A6";
  };

  const filteredBadges = badges.filter((badge) => {
    if (activeTab === "all") return true;
    if (activeTab === "frames") return badge.type === "frame";
    if (activeTab === "backgrounds") return badge.type === "background";
    return true;
  });

  return (
    <AdminLayout onLogout={onLogout}>
      <div className="badge-management">
        <div className="page-header">
          <div>
            <h1>Badge Management</h1>
            <p>Manage profile frames and backgrounds</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FiUpload /> Create New Badge
          </button>
        </div>

        {/* Tabs */}
        <div className="badge-tabs">
          <button
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <FiPackage /> All Badges ({badges.length})
          </button>
          <button
            className={`tab ${activeTab === "frames" ? "active" : ""}`}
            onClick={() => setActiveTab("frames")}
          >
            <FiImage /> Frames (
            {badges.filter((b) => b.type === "frame").length})
          </button>
          <button
            className={`tab ${activeTab === "backgrounds" ? "active" : ""}`}
            onClick={() => setActiveTab("backgrounds")}
          >
            <FiImage /> Backgrounds (
            {badges.filter((b) => b.type === "background").length})
          </button>
        </div>

        {/* Badges Grid */}
        {loading && <div className="loading">Loading badges...</div>}

        <div className="badges-grid">
          {filteredBadges.map((badge) => (
            <div key={badge._id} className="badge-card">
              <div className="badge-image-container">
                <img src={badge.imageUrl} alt={badge.name} />
                {badge.isExclusive && (
                  <span className="exclusive-badge">EXCLUSIVE</span>
                )}
                <div
                  className="rarity-indicator"
                  style={{ backgroundColor: getRarityColor(badge.rarity) }}
                >
                  {badge.rarity.toUpperCase()}
                </div>
              </div>

              <div className="badge-info">
                <h3>{badge.name}</h3>
                <p className="badge-description">{badge.description}</p>
                <div className="badge-meta">
                  <span className="badge-type">{badge.type}</span>
                  <span className="badge-price">
                    {badge.isExclusive
                      ? "Gift Only"
                      : badge.price === 0
                        ? "FREE"
                        : `${badge.price} 💎`}
                  </span>
                </div>

                {badge.properties?.glowEffect && (
                  <span className="property-tag">✨ Glow</span>
                )}
                {badge.properties?.animation !== "none" && (
                  <span className="property-tag">
                    🎬 {badge.properties.animation}
                  </span>
                )}
              </div>

              <div className="badge-actions">
                <button
                  className="btn-icon btn-edit"
                  onClick={() => openEditModal(badge)}
                  title="Edit Badge"
                >
                  <FiEdit />
                </button>
                <button
                  className="btn-icon btn-gift"
                  onClick={() => openGiftModal(badge)}
                  title="Gift to User"
                >
                  <FiGift />
                </button>
                <button
                  className="btn-icon btn-delete"
                  onClick={() => handleDeleteBadge(badge._id)}
                  title="Delete Badge"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredBadges.length === 0 && !loading && (
          <div className="empty-state">
            <FiPackage size={64} />
            <h3>No badges found</h3>
            <p>Create your first badge to get started</p>
          </div>
        )}

        {/* Create Badge Modal */}
        {showCreateModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowCreateModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Badge</h2>
                <button onClick={() => setShowCreateModal(false)}>
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleCreateBadge} className="badge-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="badge-name">Badge Name *</label>
                    <input
                      id="badge-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder="e.g., Golden Crown Frame"
                    />
                  </div>

                  <div className="form-group">
                    <label>Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                    >
                      <option value="frame">Profile Frame</option>
                      <option value="background">Live Room Background</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="badge-description">Description</label>
                  <textarea
                    id="badge-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe this badge..."
                    rows="3"
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Image Upload (Optional - Requires Setup)</label>
                  <div className="image-upload-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      id="image-upload"
                      style={{ display: "none" }}
                    />
                    <label htmlFor="image-upload" className="upload-button">
                      <FiUpload /> Choose Image File
                    </label>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="upload-progress">
                        <div 
                          className="upload-progress-bar" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                        <span>{uploadProgress}%</span>
                      </div>
                    )}
                    {imagePreview && (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                      </div>
                    )}
                  </div>
                  <small>⚠️ Requires Cloudinary preset setup. See CLOUDINARY_SETUP.md</small>
                </div>

                <div className="form-group">
                  <label htmlFor="badge-image-url">
                    <strong>Image URL (Recommended) *</strong>
                  </label>
                  <input
                    id="badge-image-url"
                    name="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      // If URL is provided, show preview
                      if (e.target.value) {
                        setImagePreview(e.target.value);
                      }
                    }}
                    placeholder="https://res.cloudinary.com/dah8ui33p/image/upload/..."
                  />
                  <small>
                    💡 <strong>How to get URL:</strong> Upload image to your{" "}
                    <a 
                      href="https://console.cloudinary.com/console/dah8ui33p/media_library" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: "#667eea", textDecoration: "underline" }}
                    >
                      Cloudinary Media Library
                    </a>{" "}
                    → Copy URL
                  </small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="badge-rarity">Rarity *</label>
                    <select
                      id="badge-rarity"
                      name="rarity"
                      value={formData.rarity}
                      onChange={(e) =>
                        setFormData({ ...formData, rarity: e.target.value })
                      }
                    >
                      <option value="common">Common (Gray)</option>
                      <option value="rare">Rare (Blue)</option>
                      <option value="epic">Epic (Purple)</option>
                      <option value="legendary">Legendary (Gold)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="badge-price">Price (Diamonds) *</label>
                    <input
                      id="badge-price"
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sort Order</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, sortOrder: e.target.value })
                      }
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isExclusive}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isExclusive: e.target.checked,
                        })
                      }
                    />
                    <span>Exclusive (Admin Gift Only)</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.properties.glowEffect}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          properties: {
                            ...formData.properties,
                            glowEffect: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Enable Glow Effect</span>
                  </label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Animation</label>
                    <select
                      value={formData.properties.animation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          properties: {
                            ...formData.properties,
                            animation: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="none">None</option>
                      <option value="glow-pulse">Glow Pulse</option>
                      <option value="shimmer">Shimmer</option>
                      <option value="rainbow-shift">Rainbow Shift</option>
                      <option value="neon-pulse">Neon Pulse</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Particle Effect</label>
                    <select
                      value={formData.properties.particleEffect}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          properties: {
                            ...formData.properties,
                            particleEffect: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="none">None</option>
                      <option value="sparkles">Sparkles</option>
                      <option value="stars">Stars</option>
                      <option value="fire-sparks">Fire Sparks</option>
                      <option value="gold-dust">Gold Dust</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create Badge"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Badge Modal */}
        {showEditModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowEditModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Badge</h2>
                <button onClick={() => setShowEditModal(false)}>
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleUpdateBadge} className="badge-form">
                {/* Same form fields as create modal */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Badge Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                    >
                      <option value="frame">Profile Frame</option>
                      <option value="background">Live Room Background</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows="3"
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Current Image</label>
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Current" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    id="image-upload-edit"
                    style={{ display: "none" }}
                  />
                  <label htmlFor="image-upload-edit" className="upload-button">
                    <FiUpload /> Upload New Image
                  </label>
                </div>

                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Rarity *</label>
                    <select
                      value={formData.rarity}
                      onChange={(e) =>
                        setFormData({ ...formData, rarity: e.target.value })
                      }
                    >
                      <option value="common">Common</option>
                      <option value="rare">Rare</option>
                      <option value="epic">Epic</option>
                      <option value="legendary">Legendary</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Price (Diamonds) *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Sort Order</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, sortOrder: e.target.value })
                      }
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isExclusive}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isExclusive: e.target.checked,
                        })
                      }
                    />
                    <span>Exclusive (Admin Gift Only)</span>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Badge"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Gift Badge Modal */}
        {showGiftModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowGiftModal(false)}
          >
            <div
              className="modal-content modal-small"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Gift Badge to User</h2>
                <button onClick={() => setShowGiftModal(false)}>
                  <FiX />
                </button>
              </div>

              <div className="gift-badge-info">
                <img src={selectedBadge?.imageUrl} alt={selectedBadge?.name} />
                <h3>{selectedBadge?.name}</h3>
              </div>

              <form onSubmit={handleGiftBadge} className="gift-form">
                <div className="form-group">
                  <label>User ID *</label>
                  <input
                    type="text"
                    value={giftData.userId}
                    onChange={(e) =>
                      setGiftData({ ...giftData, userId: e.target.value })
                    }
                    required
                    placeholder="Enter user ID"
                  />
                  <small>Enter the MongoDB ObjectId of the user</small>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowGiftModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    <FiGift /> {loading ? "Gifting..." : "Gift Badge"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BadgeManagement;
