import React, { useEffect, useState } from "react";
import { api, API_URL } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "../styles/BadgeManagement.css"; // Reuse Badge styles for now
import {
  FiUpload,
  FiEdit,
  FiTrash2,
  FiGift,
  FiX,
  FiCheck,
  FiImage,
} from "react-icons/fi";

const GiftManagement = ({ onLogout }) => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  const [formData, setFormData] = useState({
    name: "",
    price: 10,
    type: "image", // image, lottie, frame
    imageFile: null,
    animationType: "none", // none, lottie, gif
  });

  useEffect(() => {
    if (!token) navigate("/");
    else fetchGifts();
  }, []);

  const fetchGifts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/gifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGifts(response.data.gifts || []);
    } catch (error) {
      console.error("Error fetching gifts:", error);
      alert("Failed to load gifts");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, imageFile: file });
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGift = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.imageFile) {
      alert("Please fill name and upload an image/animation");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("price", formData.price);
    data.append("type", formData.type);
    data.append("image", formData.imageFile);
    data.append(
      "animationType",
      formData.imageFile.name.endsWith("json") ? "lottie" : "image",
    );

    try {
      await api.post("/gifts/admin/create", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Gift created successfully!");
      setShowCreateModal(false);
      fetchGifts();
      setFormData({
        name: "",
        price: 10,
        type: "image",
        imageFile: null,
        animationType: "none",
      });
      setImagePreview(null);
    } catch (error) {
      console.error("Error creating gift:", error);
      alert("Failed to create gift");
    }
  };

  const handleDeleteGift = async (id) => {
    if (!window.confirm("Are you sure you want to delete this gift?")) return;
    try {
      await api.delete(`/gifts/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGifts();
    } catch (error) {
      console.error("Error deleting gift:", error);
      alert("Failed to delete gift");
    }
  };

  return (
    <AdminLayout title="إدارة الهدايا" onLogout={onLogout}>
      <div className="badge-management-container">
        <div className="header-actions">
          <button
            className="create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <FiGift /> إضافة هدية جديدة
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner">جاري التحميل...</div>
        ) : (
          <div className="badges-grid">
            {gifts.map((gift) => (
              <div key={gift._id} className="badge-card">
                <div className="badge-image-container">
                  <img
                    src={gift.thumbnailUrl || gift.animationUrl}
                    alt={gift.name}
                    className="badge-image"
                  />
                  {gift.animationType === "lottie" && (
                    <span className="badge-type-tag">3D / Lottie</span>
                  )}
                </div>
                <div className="badge-info">
                  <h3>{gift.name}</h3>
                  <p className="badge-price">
                    <FiGift /> {gift.price} عملة
                  </p>
                </div>
                <div className="badge-actions">
                  <button
                    className="icon-btn delete"
                    onClick={() => handleDeleteGift(gift._id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>إضافة هدية جديدة</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  <FiX />
                </button>
              </div>
              <form onSubmit={handleCreateGift}>
                <div className="form-group">
                  <label>اسم الهدية</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    padding="10px"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>السعر (عملة)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>صورة الهدية أو ملف Lottie (JSON)</label>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="gift-upload"
                      accept="image/*,.json"
                      onChange={handleImageChange}
                      hidden
                    />
                    <label htmlFor="gift-upload" className="upload-label">
                      <FiUpload /> اختر ملف
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                    </div>
                  )}
                  {formData.imageFile && <p>{formData.imageFile.name}</p>}
                </div>
                <button type="submit" className="submit-btn">
                  حفظ
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GiftManagement;
