import React, { useEffect, useState } from "react";
import { api, API_URL } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "../styles/GiftManagement.css";
import LottiePreview from "../components/LottiePreview";
import { FiUpload, FiTrash2, FiGift, FiX } from "react-icons/fi";

const GiftManagement = ({ onLogout }) => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  const [formData, setFormData] = useState({
    name: "",
    price: 10,
    type: "image", // image, lottie, frame
    imageFile: null,
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
      if (file.name.endsWith(".json") || file.type === "application/json") {
        setImagePreview(null);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      }
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
      formData.imageFile.name.endsWith(".json") ? "lottie" : "image",
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
      });
      setImagePreview(null);
    } catch (error) {
      console.error("Error creating gift:", error);
      const message = error.response?.data?.message || "Failed to create gift";
      alert(message);
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
      <div className="gift-management-container">
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
          <div className="gifts-grid">
            {gifts.map((gift) => (
              <div key={gift._id} className="gift-card">
                <div className="gift-image-container">
                  {gift.animationType === "lottie" ? (
                    <div className="lottie-container">
                      <LottiePreview url={gift.animationUrl} />
                    </div>
                  ) : (
                    <img
                      src={gift.thumbnailUrl || gift.animationUrl}
                      alt={gift.name}
                      className="gift-image"
                    />
                  )}
                  {gift.animationType === "lottie" && (
                    <span className="gift-type-tag">Lottie</span>
                  )}
                </div>
                <div className="gift-info">
                  <h3>{gift.name}</h3>
                  <div className="gift-meta">
                    <span className="gift-price">
                      <FiGift /> {gift.price} عملة
                    </span>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteGift(gift._id)}
                      title="حذف"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
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
              <form onSubmit={handleCreateGift} className="gift-form">
                <div className="form-group">
                  <label>اسم الهدية</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="أدخل اسم الهدية..."
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
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      id="gift-upload"
                      accept="image/*,.json"
                      onChange={handleImageChange}
                      hidden
                    />
                    <label htmlFor="gift-upload" className="upload-btn">
                      <FiUpload /> اختر ملف الهدية
                    </label>
                  </div>

                  <div className="preview-section">
                    {imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Preview" />
                      </div>
                    ) : formData.imageFile &&
                      (formData.imageFile.name.endsWith(".json") ||
                        formData.imageFile.type === "application/json") ? (
                      <div className="lottie-preview-box">
                        <LottiePreview file={formData.imageFile} />
                      </div>
                    ) : null}
                    {formData.imageFile && (
                      <p className="file-name">{formData.imageFile.name}</p>
                    )}
                  </div>
                </div>
                <button type="submit" className="submit-btn">
                  حفظ الهدية
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
