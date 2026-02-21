import React, { useEffect, useState } from "react";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "../styles/GiftManagement.css"; 
// import LottiePreview from "../components/LottiePreview"; // Optional if we just show file name for simplicity
import { FiUpload, FiTrash2, FiGift, FiX, FiMusic, FiImage, FiBox } from "react-icons/fi";

const GiftManagement = ({ onLogout }) => {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  const [formData, setFormData] = useState({
    name: "",
    price: 10,
    type: "lottie", // Default
    animationFile: null,
    thumbnailFile: null,
    soundFile: null,
  });

  const [previews, setPreviews] = useState({
    animation: null,
    thumbnail: null,
    sound: null
  });

  useEffect(() => {
    if (!token) navigate("/");
    else fetchGifts();
  }, [token, navigate]);

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

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Update form data
    setFormData(prev => {
        const newData = { ...prev };
        if (fileType === "animation") newData.animationFile = file;
        if (fileType === "thumbnail") newData.thumbnailFile = file;
        if (fileType === "sound") newData.soundFile = file;
        
        // Auto-detect type if animation
        if (fileType === "animation") {
             if (file.name.endsWith(".json")) newData.type = "lottie";
             else if (file.name.match(/\.(mp4|mov|avi|mkv)$/i)) newData.type = "video";
             else if (file.name.match(/\.(glb|gltf)$/i)) newData.type = "glb";
        }
        return newData;
    });

    // Create preview
    if (fileType === "thumbnail" || fileType === "animation" && file.type.startsWith("video/")) {
         const reader = new FileReader();
         reader.onloadend = () => {
             setPreviews(prev => ({ ...prev, [fileType]: reader.result }));
         };
         reader.readAsDataURL(file);
    } else {
         // For non-previewable files (GLB, Lottie JSON, Audio), just show name or clear preview
         setPreviews(prev => ({ ...prev, [fileType]: file.name }));
    }
  };

  const handleCreateGift = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.animationFile || !formData.thumbnailFile) {
      alert("Please provide name, animation file, and thumbnail file.");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("price", formData.price);
    data.append("animationType", formData.type);
    data.append("animation", formData.animationFile);
    data.append("thumbnail", formData.thumbnailFile);
    if (formData.soundFile) {
        data.append("sound", formData.soundFile);
    }

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
      // Reset form
      setFormData({
        name: "",
        price: 10,
        type: "lottie",
        animationFile: null,
        thumbnailFile: null,
        soundFile: null,
      });
      setPreviews({ animation: null, thumbnail: null, sound: null });
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
       alert("Failed to delete gift");
    }
  };

  return (
    <AdminLayout title="إدارة الهدايا" onLogout={onLogout}>
      <div className="gift-management-container">
        <div className="header-actions">
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
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
                   <img 
                    src={gift.thumbnailUrl} 
                    alt={gift.name} 
                    className="gift-thumbnail" 
                    style={{width: "100%", height: "150px", objectFit: "cover"}}
                   />
                   <span className="gift-type-tag">{gift.animationType}</span>
                </div>
                <div className="gift-info">
                  <h3>{gift.name}</h3>
                   <div className="gift-meta">
                    <span className="gift-price"><FiGift /> {gift.price}</span>
                    <button className="delete-btn" onClick={() => handleDeleteGift(gift._id)}>
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
                <button className="close-btn" onClick={() => setShowCreateModal(false)}><FiX /></button>
              </div>
              <form onSubmit={handleCreateGift} className="gift-form">
                <div className="form-group">
                  <label>اسم الهدية</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>السعر</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
                </div>
                
                <div className="form-group">
                     <label><FiBox /> ملف الحركة (Lottie, MP4, GLB)</label>
                     <input type="file" onChange={(e) => handleFileChange(e, "animation")} accept=".json,.mp4,.mov,.glb,.gltf" />
                     {formData.type === "video" && previews.animation && (
                         <video src={previews.animation} controls style={{height: 100, marginTop: 10}} />
                     )}
                     {(formData.type === "lottie" || formData.type === "glb") && previews.animation && (
                         <div style={{marginTop: 5, fontSize: "0.9em", color: "#666"}}>Selected: {previews.animation}</div>
                     )}
                </div>

                <div className="form-group">
                     <label><FiImage /> صورة مصغرة (Thumb)</label>
                     <input type="file" onChange={(e) => handleFileChange(e, "thumbnail")} accept="image/*" required />
                     {previews.thumbnail && <img src={previews.thumbnail} style={{height: 80, marginTop: 10}} alt="Preview"/>}
                </div>

                <div className="form-group">
                     <label><FiMusic /> صوت (Optional)</label>
                     <input type="file" onChange={(e) => handleFileChange(e, "sound")} accept="audio/*" />
                     {previews.sound && <div style={{marginTop: 5, fontSize: "0.9em"}}>{previews.sound}</div>}
                </div>

                <button type="submit" className="submit-btn">حفظ الهدية</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default GiftManagement;

