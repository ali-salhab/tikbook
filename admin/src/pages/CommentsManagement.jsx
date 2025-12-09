import { useState, useEffect } from "react";
import axios from "axios";
import AdminLayout from "../components/AdminLayout";
import {
  FiTrash2,
  FiThumbsUp,
  FiThumbsDown,
  FiFilter,
  FiVideo,
  FiUser,
} from "react-icons/fi";
import "../styles/CommentsManagement.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CommentsManagement = ({ onLogout }) => {
  const [comments, setComments] = useState([]);
  const [filteredComments, setFilteredComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    today: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchComments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [comments, searchTerm, dateRange, statusFilter, sortBy]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");

      // Fetch videos with comments
      const videosResponse = await axios.get(`${API_URL}/api/videos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Flatten comments from all videos
      const allComments = [];
      videosResponse.data.forEach((video) => {
        if (video.comments && video.comments.length > 0) {
          video.comments.forEach((comment) => {
            allComments.push({
              ...comment,
              videoId: video._id,
              videoDescription: video.description,
              videoUrl: video.videoUrl,
            });
          });
        }
      });

      setComments(allComments);
      calculateStats(allComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (commentsData) => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    setStats({
      total: commentsData.length,
      approved: commentsData.filter((c) => c.status === "approved").length,
      pending: commentsData.filter((c) => c.status === "pending").length,
      today: commentsData.filter((c) => new Date(c.createdAt) >= todayStart)
        .length,
    });
  };

  const applyFilters = () => {
    let filtered = [...comments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (comment) =>
          comment.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          comment.userId?.username
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          comment.videoDescription
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "thisWeek":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "thisYear":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(
        (comment) => new Date(comment.createdAt) >= startDate
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((comment) => comment.status === statusFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "mostLikes":
          return (b.likes || 0) - (a.likes || 0);
        default:
          return 0;
      }
    });

    setFilteredComments(filtered);
  };

  const handleDeleteComment = async (videoId, commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      const token = localStorage.getItem("adminToken");
      await axios.delete(
        `${API_URL}/api/videos/${videoId}/comments/${commentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      fetchComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment");
    }
  };

  const handleApproveComment = async (videoId, commentId) => {
    try {
      const token = localStorage.getItem("adminToken");
      await axios.patch(
        `${API_URL}/api/videos/${videoId}/comments/${commentId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchComments();
    } catch (error) {
      console.error("Error approving comment:", error);
      alert("Failed to approve comment");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AdminLayout onLogout={onLogout}>
        <div className="loading">Loading comments...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={onLogout}>
      <div className="comments-management">
        <h1>Comments Management</h1>

        {/* Stats */}
        <div className="comments-stats">
          <div className="stat-card">
            <h3>Total Comments</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Approved</h3>
            <p>{stats.approved}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p>{stats.pending}</p>
          </div>
          <div className="stat-card">
            <h3>Today</h3>
            <p>{stats.today}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="comments-filters">
          <input
            type="text"
            placeholder="Search comments, users, or videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
            <option value="thisYear">This Year</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostLikes">Most Likes</option>
          </select>
        </div>

        {/* Comments List */}
        <div className="comments-list">
          {filteredComments.length === 0 ? (
            <div className="no-comments">
              <FiFilter size={48} />
              <p>No comments found</p>
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div key={comment._id} className="comment-card">
                <div className="comment-header">
                  <div className="comment-user-info">
                    <FiUser className="user-icon" />
                    <div>
                      <strong>
                        {comment.userId?.username || "Unknown User"}
                      </strong>
                      <span className="comment-date">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`comment-status ${comment.status || "pending"}`}
                  >
                    {comment.status || "pending"}
                  </span>
                </div>

                <div className="comment-text">{comment.text}</div>

                <div className="comment-video-info">
                  <FiVideo />
                  <span>
                    Video: {comment.videoDescription?.substring(0, 60)}...
                  </span>
                </div>

                <div className="comment-footer">
                  <div className="comment-stats">
                    <span>
                      <FiThumbsUp /> {comment.likes || 0} likes
                    </span>
                  </div>

                  <div className="comment-actions">
                    {comment.status !== "approved" && (
                      <button
                        className="approve-btn"
                        onClick={() =>
                          handleApproveComment(comment.videoId, comment._id)
                        }
                      >
                        <FiThumbsUp /> Approve
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={() =>
                        handleDeleteComment(comment.videoId, comment._id)
                      }
                    >
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default CommentsManagement;
