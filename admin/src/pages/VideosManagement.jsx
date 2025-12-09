import React, { useEffect, useState } from "react";
import axios from "axios";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "../styles/VideosManagement.css";
import {
  FiPlay,
  FiUser,
  FiHeart,
  FiMessageCircle,
  FiEye,
  FiTrash2,
  FiFilter,
  FiChevronDown,
} from "react-icons/fi";

const VideosManagement = () => {
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  const [filters, setFilters] = useState({
    search: "",
    dateRange: "all",
    sortBy: "newest",
  });

  useEffect(() => {
    if (!token) navigate("/");
    else fetchVideos();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, videos]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${api}/videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      const videosArray = Array.isArray(data) ? data : data?.videos || [];
      setVideos(videosArray);
    } catch (error) {
      console.error("Error fetching videos:", error);
      alert("فشل تحميل الفيديوهات");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...videos];

    // Search filter
    if (filters.search) {
      result = result.filter(
        (video) =>
          video.description
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          video.user?.username
            ?.toLowerCase()
            .includes(filters.search.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      result = result.filter((video) => {
        const videoDate = new Date(video.createdAt);
        const diffDays = Math.floor((now - videoDate) / (1000 * 60 * 60 * 24));

        switch (filters.dateRange) {
          case "today":
            return diffDays === 0;
          case "thisWeek":
            return diffDays <= 7;
          case "thisMonth":
            return diffDays <= 30;
          case "thisYear":
            return diffDays <= 365;
          default:
            return true;
        }
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "popular":
          return (b.likes?.length || 0) - (a.likes?.length || 0);
        case "mostViewed":
          return (b.views || 0) - (a.views || 0);
        default:
          return 0;
      }
    });

    setFilteredVideos(result);
  };

  const handleDeleteVideo = async (videoId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الفيديو؟")) {
      try {
        await axios.delete(`${api}/videos/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVideos(videos.filter((v) => v._id !== videoId));
        setSelectedVideo(null);
        alert("تم حذف الفيديو بنجاح");
      } catch (error) {
        console.error("Error deleting video:", error);
        alert("فشل حذف الفيديو");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/");
  };

  return (
    <AdminLayout onLogout={handleLogout}>
      <div className="videos-management">
        <div className="page-header">
          <h1>إدارة الفيديوهات</h1>
          <span className="header-stat">{filteredVideos.length} فيديو</span>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="ابحث عن فيديو..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>

          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter size={18} />
            تصفية
            <FiChevronDown
              size={18}
              style={{ transform: showFilters ? "rotate(180deg)" : "" }}
            />
          </button>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>التاريخ</label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: e.target.value })
                }
              >
                <option value="all">كل الفترات</option>
                <option value="today">اليوم</option>
                <option value="thisWeek">هذا الأسبوع</option>
                <option value="thisMonth">هذا الشهر</option>
                <option value="thisYear">هذه السنة</option>
              </select>
            </div>

            <div className="filter-group">
              <label>الترتيب</label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({ ...filters, sortBy: e.target.value })
                }
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="popular">الأكثر شيوعاً</option>
                <option value="mostViewed">الأكثر مشاهدة</option>
              </select>
            </div>
          </div>
        )}

        {/* Videos Grid */}
        <div className="videos-grid">
          {loading ? (
            <p className="loading">جاري التحميل...</p>
          ) : filteredVideos.length === 0 ? (
            <p className="no-data">لا توجد فيديوهات</p>
          ) : (
            filteredVideos.map((video) => (
              <div key={video._id} className="video-card">
                <div className="video-thumbnail">
                  <video
                    src={video.videoUrl}
                    controls
                    controlsList="nodownload"
                  />
                  <div className="video-overlay">
                    <button
                      className="play-btn"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <FiPlay size={32} fill="white" />
                    </button>
                  </div>
                </div>

                <div className="video-info">
                  <div className="creator-info">
                    <div className="avatar">
                      {video.user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="creator-name">@{video.user?.username}</p>
                      <p className="upload-date">
                        {new Date(video.createdAt).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  </div>

                  <p className="video-description">
                    {video.description?.substring(0, 60)}...
                  </p>

                  <div className="video-stats">
                    <span className="stat">
                      <FiHeart size={16} />
                      {video.likes?.length || 0}
                    </span>
                    <span className="stat">
                      <FiMessageCircle size={16} />
                      {video.comments?.length || 0}
                    </span>
                    <span className="stat">
                      <FiEye size={16} />
                      {video.views || 0}
                    </span>
                  </div>

                  <div className="video-actions">
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteVideo(video._id)}
                    >
                      <FiTrash2 size={16} />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Video Player Modal */}
        {selectedVideo && (
          <div className="modal-overlay" onClick={() => setSelectedVideo(null)}>
            <div
              className="modal-content video-player-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-btn"
                onClick={() => setSelectedVideo(null)}
              >
                ×
              </button>

              <div className="video-player">
                <video
                  src={selectedVideo.videoUrl}
                  controls
                  autoPlay
                  style={{ width: "100%", maxHeight: "600px" }}
                />
              </div>

              <div className="video-detail-info">
                <h2>{selectedVideo.description}</h2>

                <div className="creator-section">
                  <div className="avatar-large">
                    {selectedVideo.user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="creator-name">
                      @{selectedVideo.user?.username}
                    </p>
                    <p className="date">
                      {new Date(selectedVideo.createdAt).toLocaleDateString(
                        "ar-EG"
                      )}
                    </p>
                  </div>
                </div>

                <div className="detailed-stats">
                  <stat-item>
                    <FiHeart size={20} />
                    <div>
                      <p className="label">الإعجابات</p>
                      <p className="value">
                        {selectedVideo.likes?.length || 0}
                      </p>
                    </div>
                  </stat-item>
                  <stat-item>
                    <FiMessageCircle size={20} />
                    <div>
                      <p className="label">التعليقات</p>
                      <p className="value">
                        {selectedVideo.comments?.length || 0}
                      </p>
                    </div>
                  </stat-item>
                  <stat-item>
                    <FiEye size={20} />
                    <div>
                      <p className="label">المشاهدات</p>
                      <p className="value">{selectedVideo.views || 0}</p>
                    </div>
                  </stat-item>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const stat = ({ children }) => <div className="stat">{children}</div>;

const stat_item = ({ children }) => <div className="stat-item">{children}</div>;

export default VideosManagement;
