import { useEffect, useMemo, useState } from "react";
import {
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiUser,
  FiPhone,
  FiCalendar,
  FiLoader,
} from "react-icons/fi";
import { api } from "../config/api";
import AdminLayout from "../components/AdminLayout";
import "../styles/WithdrawalsManagement.css";

const STATUS_META = {
  pending: { label: "قيد المراجعة", color: "#F5C518", icon: FiClock },
  processing: { label: "قيد المعالجة", color: "#3DA9FC", icon: FiLoader },
  approved: { label: "تمت الموافقة", color: "#22C55E", icon: FiCheckCircle },
  rejected: { label: "مرفوض", color: "#EF4444", icon: FiXCircle },
};

const formatDateTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span
      className="wd-status-badge"
      style={{
        background: `${meta.color}20`,
        color: meta.color,
        borderColor: `${meta.color}55`,
      }}
    >
      <Icon size={13} />
      {meta.label}
    </span>
  );
};

const WithdrawalsManagement = ({ onLogout }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usdPerCoin, setUsdPerCoin] = useState(0.01);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionStatus, setActionStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const res = await api.get("/admin/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const list = Array.isArray(res.data?.requests) ? res.data.requests : [];
      setRequests(list);
      if (res.data?.usdPerCoin) setUsdPerCoin(res.data.usdPerCoin);
    } catch (e) {
      console.error("withdrawals fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const stats = useMemo(() => {
    const sumUsd = (filterStatus) =>
      requests
        .filter((r) => r.status === filterStatus)
        .reduce((s, r) => s + Number(r.amountUsd || 0), 0);
    return {
      pendingCount: requests.filter((r) => r.status === "pending").length,
      processingCount: requests.filter((r) => r.status === "processing").length,
      approvedCount: requests.filter((r) => r.status === "approved").length,
      rejectedCount: requests.filter((r) => r.status === "rejected").length,
      pendingUsd: sumUsd("pending") + sumUsd("processing"),
      approvedUsd: sumUsd("approved"),
    };
  }, [requests]);

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter((r) => {
      return (
        r.fullName?.toLowerCase().includes(q) ||
        r.phoneNumber?.toLowerCase().includes(q) ||
        r.user?.username?.toLowerCase().includes(q) ||
        r.user?.email?.toLowerCase().includes(q) ||
        String(r._id || "").includes(q)
      );
    });
  }, [requests, search]);

  const openDetails = (req) => {
    setSelected(req);
    setActionStatus("");
    setAdminNote(req.adminNote || "");
  };
  const closeDetails = () => {
    setSelected(null);
    setActionStatus("");
    setAdminNote("");
  };

  const handleAction = async () => {
    if (!selected || !actionStatus) return;
    if (actionStatus === "rejected" && !adminNote.trim()) {
      alert("يرجى إدخال سبب الرفض في حقل ملاحظات الإدارة");
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem("adminToken");
      const res = await api.post(
        `/admin/withdrawals/${selected._id}/status`,
        { status: actionStatus, adminNote: adminNote || "" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updated = res.data?.request;
      if (updated) {
        setRequests((prev) =>
          prev.map((r) => (r._id === updated._id ? { ...r, ...updated } : r)),
        );
      }
      await fetchData();
      closeDetails();
      alert("تم تحديث حالة الطلب بنجاح");
    } catch (e) {
      alert(
        e?.response?.data?.message ||
          "فشل تحديث حالة الطلب — حاول مرة أخرى",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout}>
      <div className="withdrawals-management">
        <div className="wd-page-header">
          <h1>إدارة طلبات السحب</h1>
          <button className="wd-refresh-btn" onClick={fetchData}>
            <FiRefreshCw size={16} /> تحديث
          </button>
        </div>

        {/* Stats */}
        <div className="wd-stats-grid">
          <div className="wd-stat-card pending">
            <FiClock size={22} />
            <div>
              <span className="wd-stat-label">قيد المراجعة / المعالجة</span>
              <span className="wd-stat-value">
                {stats.pendingCount + stats.processingCount}
              </span>
              <span className="wd-stat-sub">
                ${stats.pendingUsd.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="wd-stat-card approved">
            <FiCheckCircle size={22} />
            <div>
              <span className="wd-stat-label">طلبات تمت الموافقة</span>
              <span className="wd-stat-value">{stats.approvedCount}</span>
              <span className="wd-stat-sub">
                ${stats.approvedUsd.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="wd-stat-card rejected">
            <FiXCircle size={22} />
            <div>
              <span className="wd-stat-label">طلبات مرفوضة</span>
              <span className="wd-stat-value">{stats.rejectedCount}</span>
            </div>
          </div>
          <div className="wd-stat-card rate">
            <FiDollarSign size={22} />
            <div>
              <span className="wd-stat-label">سعر التحويل</span>
              <span className="wd-stat-value">
                ${Number(usdPerCoin).toFixed(4)}
              </span>
              <span className="wd-stat-sub">لكل 1 عملة</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="wd-toolbar">
          <div className="wd-search-wrap">
            <FiSearch size={16} className="wd-search-icon" />
            <input
              type="text"
              className="wd-search-input"
              placeholder="ابحث بالاسم، الهاتف، اسم المستخدم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="wd-status-tabs">
            {["all", "pending", "processing", "approved", "rejected"].map(
              (k) => (
                <button
                  key={k}
                  className={`wd-status-tab ${statusFilter === k ? "active" : ""}`}
                  onClick={() => setStatusFilter(k)}
                >
                  {k === "all" ? "الكل" : STATUS_META[k]?.label}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Table */}
        <div className="wd-table-wrap">
          {loading ? (
            <div className="wd-empty">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="wd-empty">لا توجد طلبات سحب لعرضها</div>
          ) : (
            <table className="wd-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>المبلغ</th>
                  <th>الاسم الكامل</th>
                  <th>الهاتف</th>
                  <th>الحالة</th>
                  <th>تاريخ الإرسال</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="wd-user-cell">
                        {r.user?.profileImage ? (
                          <img
                            src={r.user.profileImage}
                            alt={r.user.username}
                          />
                        ) : (
                          <div className="wd-avatar-fallback">
                            {(r.user?.username || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="wd-username">
                            {r.user?.username || "—"}
                          </div>
                          {r.user?.email && (
                            <div className="wd-useremail">{r.user.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="wd-amount-cell">
                        <span className="wd-amount-usd">
                          ${Number(r.amountUsd || 0).toFixed(2)}
                        </span>
                        <span className="wd-amount-coins">
                          {r.amount} عملة
                        </span>
                      </div>
                    </td>
                    <td>{r.fullName}</td>
                    <td>{r.phoneNumber}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td>
                      <button
                        className="wd-action-btn"
                        onClick={() => openDetails(r)}
                      >
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div className="wd-modal-backdrop" onClick={closeDetails}>
          <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="wd-modal-close"
              onClick={closeDetails}
              aria-label="إغلاق"
            >
              <FiX size={20} />
            </button>
            <h2>تفاصيل طلب السحب</h2>

            <div className="wd-modal-amount-row">
              <div>
                <span className="wd-modal-amount">
                  ${Number(selected.amountUsd || 0).toFixed(2)}
                </span>
                <span className="wd-modal-coins">
                  {selected.amount} عملة (سعر التحويل: $
                  {Number(selected.usdPerCoin || usdPerCoin).toFixed(4)})
                </span>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="wd-modal-grid">
              <div className="wd-modal-row">
                <FiUser size={14} />
                <span className="wd-modal-label">الاسم الكامل:</span>
                <span className="wd-modal-value">{selected.fullName}</span>
              </div>
              <div className="wd-modal-row">
                <FiPhone size={14} />
                <span className="wd-modal-label">رقم الهاتف:</span>
                <span className="wd-modal-value">{selected.phoneNumber}</span>
              </div>
              <div className="wd-modal-row">
                <FiCalendar size={14} />
                <span className="wd-modal-label">تاريخ الإرسال:</span>
                <span className="wd-modal-value">
                  {formatDateTime(selected.createdAt)}
                </span>
              </div>
              <div className="wd-modal-row">
                <FiUser size={14} />
                <span className="wd-modal-label">المستخدم:</span>
                <span className="wd-modal-value">
                  @{selected.user?.username || "—"}
                  {selected.user?.email ? ` (${selected.user.email})` : ""}
                </span>
              </div>
              <div className="wd-modal-row">
                <FiDollarSign size={14} />
                <span className="wd-modal-label">رصيد الأرباح وقت الطلب:</span>
                <span className="wd-modal-value">
                  {selected.earningsAtRequest} عملة
                </span>
              </div>
              {selected.reviewedAt && (
                <div className="wd-modal-row">
                  <FiCalendar size={14} />
                  <span className="wd-modal-label">تاريخ المراجعة:</span>
                  <span className="wd-modal-value">
                    {formatDateTime(selected.reviewedAt)}
                  </span>
                </div>
              )}
              {selected.reviewedBy?.username && (
                <div className="wd-modal-row">
                  <FiUser size={14} />
                  <span className="wd-modal-label">تمت المراجعة بواسطة:</span>
                  <span className="wd-modal-value">
                    {selected.reviewedBy.username}
                  </span>
                </div>
              )}
            </div>

            {/* Status history */}
            <h3>سجل الحالة</h3>
            <div className="wd-history">
              {(selected.statusHistory && selected.statusHistory.length > 0
                ? selected.statusHistory
                : [
                    {
                      status: "pending",
                      note: "تم إنشاء الطلب",
                      changedAt: selected.createdAt,
                    },
                  ]
              ).map((h, i) => {
                const meta = STATUS_META[h.status] || STATUS_META.pending;
                const Icon = meta.icon;
                return (
                  <div className="wd-history-row" key={`${h.status}-${i}`}>
                    <div
                      className="wd-history-dot"
                      style={{ borderColor: meta.color, color: meta.color }}
                    >
                      <Icon size={12} />
                    </div>
                    <div className="wd-history-body">
                      <span
                        className="wd-history-status"
                        style={{ color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {h.note && (
                        <span className="wd-history-note">{h.note}</span>
                      )}
                      <span className="wd-history-date">
                        {formatDateTime(h.changedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action area */}
            {selected.status !== "approved" && selected.status !== "rejected" ? (
              <div className="wd-action-area">
                <h3>تحديث الحالة</h3>
                <div className="wd-action-statuses">
                  {[
                    { key: "processing", label: "وضع قيد المعالجة" },
                    { key: "approved", label: "موافقة" },
                    { key: "rejected", label: "رفض" },
                  ].map((opt) => {
                    const meta = STATUS_META[opt.key];
                    return (
                      <button
                        key={opt.key}
                        className={`wd-action-status-btn ${
                          actionStatus === opt.key ? "active" : ""
                        }`}
                        style={{
                          borderColor: meta.color,
                          background:
                            actionStatus === opt.key
                              ? meta.color
                              : "transparent",
                          color:
                            actionStatus === opt.key ? "#fff" : meta.color,
                        }}
                        onClick={() => setActionStatus(opt.key)}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <label className="wd-action-label">
                  ملاحظة الإدارة (تظهر للمستخدم)
                </label>
                <textarea
                  className="wd-action-note"
                  rows={3}
                  placeholder={
                    actionStatus === "rejected"
                      ? "اكتب سبب الرفض هنا..."
                      : "اختياري"
                  }
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />

                <div className="wd-action-buttons">
                  <button
                    className="wd-action-cancel"
                    onClick={closeDetails}
                    disabled={actionLoading}
                  >
                    إلغاء
                  </button>
                  <button
                    className="wd-action-submit"
                    onClick={handleAction}
                    disabled={!actionStatus || actionLoading}
                  >
                    {actionLoading ? "جاري التحديث..." : "تأكيد التحديث"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="wd-action-closed">
                هذا الطلب مغلق ولا يمكن تعديل حالته.
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default WithdrawalsManagement;
