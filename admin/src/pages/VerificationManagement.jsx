import { useState, useEffect } from "react";
import { api } from "../config/api";
import AdminLayout from "../components/AdminLayout";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiAward,
  FiEye,
  FiFilter,
} from "react-icons/fi";
import "../styles/VerificationManagement.css";

const VerificationManagement = ({ onLogout }) => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    verifiedUsers: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [badgeType, setBadgeType] = useState("blue");

  useEffect(() => {
    fetchVerificationRequests();
    fetchStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, statusFilter, searchTerm]);

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await api.get("/verification/admin/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await api.get("/verification/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (req) =>
          req.user?.username
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          req.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.fullName?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredRequests(filtered);
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm("هل أنت متأكد من قبول طلب التوثيق؟")) return;

    try {
      const token = localStorage.getItem("adminToken");
      await api.put(
        `/verification/admin/approve/${requestId}`,
        {
          badgeType,
          adminNotes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("تم قبول طلب التوثيق بنجاح");
      setShowDetailsModal(false);
      fetchVerificationRequests();
      fetchStats();
    } catch (error) {
      console.error("Error approving request:", error);
      alert("فشل قبول الطلب");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("يرجى إدخال سبب الرفض");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      await api.put(
        `/verification/admin/reject/${selectedRequest._id}`,
        {
          rejectionReason,
          adminNotes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("تم رفض طلب التوثيق");
      setShowRejectModal(false);
      setShowDetailsModal(false);
      setRejectionReason("");
      setAdminNotes("");
      fetchVerificationRequests();
      fetchStats();
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("فشل رفض الطلب");
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;

    try {
      const token = localStorage.getItem("adminToken");
      await api.delete(`/verification/admin/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("تم حذف الطلب بنجاح");
      fetchVerificationRequests();
      fetchStats();
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("فشل حذف الطلب");
    }
  };

  const openDetailsModal = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    setBadgeType("blue");
    setAdminNotes("");
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
    setRejectionReason("");
    setAdminNotes("");
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        icon: <FiClock />,
        text: "قيد المراجعة",
        className: "status-pending",
      },
      approved: {
        icon: <FiCheckCircle />,
        text: "موافق عليه",
        className: "status-approved",
      },
      rejected: {
        icon: <FiXCircle />,
        text: "مرفوض",
        className: "status-rejected",
      },
    };

    return badges[status] || badges.pending;
  };

  const getCategoryLabel = (category) => {
    const categories = {
      celebrity: "مشهور",
      influencer: "مؤثر",
      brand: "علامة تجارية",
      organization: "منظمة",
      government: "حكومي",
      other: "أخرى",
    };

    return categories[category] || category;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AdminLayout onLogout={onLogout}>
        <div className="loading">جاري التحميل...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onLogout={onLogout}>
      <div className="verification-management">
        <div className="page-header">
          <h1>
            <FiAward /> إدارة التوثيق
          </h1>
          <p>إدارة طلبات توثيق الحسابات</p>
        </div>

        {/* Statistics */}
        <div className="verification-stats">
          <div className="stat-card">
            <FiClock className="stat-icon pending" />
            <div className="stat-content">
              <h3>{stats.pendingRequests}</h3>
              <p>طلبات معلقة</p>
            </div>
          </div>
          <div className="stat-card">
            <FiCheckCircle className="stat-icon approved" />
            <div className="stat-content">
              <h3>{stats.approvedRequests}</h3>
              <p>طلبات موافق عليها</p>
            </div>
          </div>
          <div className="stat-card">
            <FiXCircle className="stat-icon rejected" />
            <div className="stat-content">
              <h3>{stats.rejectedRequests}</h3>
              <p>طلبات مرفوضة</p>
            </div>
          </div>
          <div className="stat-card">
            <FiAward className="stat-icon verified" />
            <div className="stat-content">
              <h3>{stats.verifiedUsers}</h3>
              <p>حسابات موثقة</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="البحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <FiFilter />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">جميع الطلبات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="approved">موافق عليها</option>
              <option value="rejected">مرفوضة</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="requests-table">
          {filteredRequests.length === 0 ? (
            <div className="no-data">لا توجد طلبات توثيق</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الاسم الكامل</th>
                  <th>الفئة</th>
                  <th>المتابعين</th>
                  <th>تاريخ الطلب</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => {
                  const statusBadge = getStatusBadge(request.status);
                  return (
                    <tr key={request._id}>
                      <td>
                        <div className="user-cell">
                          <img
                            src={
                              request.user?.profileImage ||
                              "/default-avatar.png"
                            }
                            alt={request.user?.username}
                          />
                          <div>
                            <p className="username">
                              @{request.user?.username}
                            </p>
                            <p className="email">{request.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>{request.fullName}</td>
                      <td>
                        <span className="category-badge">
                          {getCategoryLabel(request.category)}
                        </span>
                      </td>
                      <td>{request.followersCount?.toLocaleString()}</td>
                      <td>{formatDate(request.createdAt)}</td>
                      <td>
                        <span
                          className={`status-badge ${statusBadge.className}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.text}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-view"
                            onClick={() => openDetailsModal(request)}
                          >
                            <FiEye /> عرض
                          </button>
                          {request.status === "pending" && (
                            <>
                              <button
                                className="btn-approve"
                                onClick={() => handleApprove(request._id)}
                              >
                                <FiCheckCircle /> قبول
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => openRejectModal(request)}
                              >
                                <FiXCircle /> رفض
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div
            className="modal-overlay"
            onClick={() => setShowDetailsModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>تفاصيل طلب التوثيق</h2>
                <button onClick={() => setShowDetailsModal(false)}>
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <div className="request-details">
                  <div className="detail-section">
                    <h3>معلومات المستخدم</h3>
                    <div className="detail-row">
                      <label>اسم المستخدم:</label>
                      <span>@{selectedRequest.user?.username}</span>
                    </div>
                    <div className="detail-row">
                      <label>البريد الإلكتروني:</label>
                      <span>{selectedRequest.user?.email}</span>
                    </div>
                    <div className="detail-row">
                      <label>عدد المتابعين:</label>
                      <span>
                        {selectedRequest.user?.followers?.length?.toLocaleString() ||
                          0}
                      </span>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>معلومات الطلب</h3>
                    <div className="detail-row">
                      <label>الاسم الكامل:</label>
                      <span>{selectedRequest.fullName}</span>
                    </div>
                    <div className="detail-row">
                      <label>الفئة:</label>
                      <span>{getCategoryLabel(selectedRequest.category)}</span>
                    </div>
                    <div className="detail-row">
                      <label>عدد المتابعين المصرح:</label>
                      <span>
                        {selectedRequest.followersCount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <label>الوصف:</label>
                      <p className="description">
                        {selectedRequest.description}
                      </p>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>روابط وسائل التواصل</h3>
                    {selectedRequest.instagramUrl && (
                      <div className="detail-row">
                        <label>Instagram:</label>
                        <a
                          href={selectedRequest.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedRequest.instagramUrl}
                        </a>
                      </div>
                    )}
                    {selectedRequest.twitterUrl && (
                      <div className="detail-row">
                        <label>Twitter:</label>
                        <a
                          href={selectedRequest.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedRequest.twitterUrl}
                        </a>
                      </div>
                    )}
                    {selectedRequest.facebookUrl && (
                      <div className="detail-row">
                        <label>Facebook:</label>
                        <a
                          href={selectedRequest.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedRequest.facebookUrl}
                        </a>
                      </div>
                    )}
                    {selectedRequest.websiteUrl && (
                      <div className="detail-row">
                        <label>الموقع الإلكتروني:</label>
                        <a
                          href={selectedRequest.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {selectedRequest.websiteUrl}
                        </a>
                      </div>
                    )}
                  </div>

                  {selectedRequest.status === "pending" && (
                    <div className="detail-section">
                      <h3>الإجراء</h3>
                      <div className="detail-row">
                        <label>نوع الشارة:</label>
                        <select
                          value={badgeType}
                          onChange={(e) => setBadgeType(e.target.value)}
                        >
                          <option value="blue">زرقاء (عادية)</option>
                          <option value="gold">ذهبية (مميزة)</option>
                        </select>
                      </div>
                      <div className="detail-row">
                        <label>ملاحظات الأدمن (اختياري):</label>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="أضف أي ملاحظات..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {selectedRequest.status !== "pending" && (
                    <div className="detail-section">
                      <h3>معلومات المراجعة</h3>
                      <div className="detail-row">
                        <label>تمت المراجعة بواسطة:</label>
                        <span>
                          @{selectedRequest.reviewedBy?.username || "غير معروف"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <label>تاريخ المراجعة:</label>
                        <span>{formatDate(selectedRequest.reviewedAt)}</span>
                      </div>
                      {selectedRequest.rejectionReason && (
                        <div className="detail-row">
                          <label>سبب الرفض:</label>
                          <p className="rejection-reason">
                            {selectedRequest.rejectionReason}
                          </p>
                        </div>
                      )}
                      {selectedRequest.adminNotes && (
                        <div className="detail-row">
                          <label>ملاحظات الأدمن:</label>
                          <p>{selectedRequest.adminNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.status === "pending" && (
                <div className="modal-footer">
                  <button
                    className="btn-approve-full"
                    onClick={() => handleApprove(selectedRequest._id)}
                  >
                    <FiCheckCircle /> قبول الطلب
                  </button>
                  <button
                    className="btn-reject-full"
                    onClick={() => openRejectModal(selectedRequest)}
                  >
                    <FiXCircle /> رفض الطلب
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRequest && (
          <div
            className="modal-overlay"
            onClick={() => setShowRejectModal(false)}
          >
            <div
              className="modal-content reject-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>رفض طلب التوثيق</h2>
                <button onClick={() => setShowRejectModal(false)}>
                  &times;
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>سبب الرفض *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="اكتب سبب رفض الطلب (سيتم إرساله للمستخدم)..."
                    rows={4}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>ملاحظات إضافية (اختياري)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="ملاحظات داخلية للأدمن فقط..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-confirm-reject" onClick={handleReject}>
                  تأكيد الرفض
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => setShowRejectModal(false)}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default VerificationManagement;
