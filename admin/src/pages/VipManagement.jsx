import React, { useEffect, useState } from "react";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { FiEdit, FiTrash2, FiPlus, FiX, FiCheck, FiUser } from "react-icons/fi";

const VIP_COLORS = {
  1: "#CD7F32", 2: "#C0C0C0", 3: "#FFD700", 4: "#00BFFF",
  5: "#9370DB", 6: "#FF4500", 7: "#00CED1", 8: "#FF69B4",
  9: "#32CD32", 10: "#FF8C00", 11: "#DC143C", 12: "#4169E1",
  13: "#FF1493", 14: "#00FF7F", 15: "#FFD700",
};

const defaultForm = {
  level: 1, name: "", nameAr: "", price: 99, color: "#FFD700",
  imageUrl: "", isActive: true, sortOrder: 0,
};

const VipManagement = ({ onLogout }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({ userId: "", username: "", vipLevel: 1 });
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const res = await api.get("/vip/admin/levels", authHeader);
      setLevels(res.data.levels || res.data || []);
    } catch (e) {
      setError("فشل تحميل مستويات VIP");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingLevel(null);
    setForm(defaultForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (lvl) => {
    setEditingLevel(lvl);
    setForm({
      level: lvl.level, name: lvl.name || "", nameAr: lvl.nameAr || "",
      price: lvl.price, color: lvl.color || "#FFD700",
      imageUrl: lvl.imageUrl || "", isActive: lvl.isActive,
      sortOrder: lvl.sortOrder || 0,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nameAr) { setError("الاسم العربي مطلوب"); return; }
    setSaving(true);
    setError("");
    try {
      if (editingLevel) {
        await api.put(`/vip/admin/levels/${editingLevel.level}`, form, authHeader);
      } else {
        await api.post("/vip/admin/levels", form, authHeader);
      }
      setShowModal(false);
      fetchLevels();
    } catch (e) {
      setError(e.response?.data?.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (level) => {
    if (!window.confirm(`هل تريد حذف VIP${level}؟`)) return;
    try {
      await api.delete(`/vip/admin/levels/${level}`, authHeader);
      fetchLevels();
    } catch (e) {
      alert("فشل الحذف");
    }
  };

  const handleSearchUser = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get(`/users/search?q=${searchQuery}`, authHeader);
      setUserSearchResults(res.data.users || res.data || []);
    } catch {
      setUserSearchResults([]);
    }
  };

  const handleAssign = async () => {
    if (!assignData.userId) { setError("اختر مستخدمًا أولاً"); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/vip/admin/assign", assignData, authHeader);
      setShowAssignModal(false);
      setAssignData({ userId: "", username: "", vipLevel: 1 });
      setUserSearchResults([]);
      setSearchQuery("");
      alert("تم تعيين VIP بنجاح");
    } catch (e) {
      setError(e.response?.data?.message || "فشل التعيين");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>⭐ إدارة VIP</h2>
            <p style={styles.subtitle}>إدارة مستويات VIP وتعيينها للمستخدمين</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={styles.assignBtn} onClick={() => { setShowAssignModal(true); setError(""); }}>
              <FiUser size={16} /> تعيين VIP لمستخدم
            </button>
            <button style={styles.addBtn} onClick={openCreate}>
              <FiPlus size={16} /> إضافة مستوى
            </button>
          </div>
        </div>

        {/* Levels Grid */}
        {loading ? (
          <div style={styles.loading}>جاري التحميل...</div>
        ) : (
          <div style={styles.grid}>
            {levels.map((lvl) => (
              <div key={lvl.level} style={{ ...styles.card, borderColor: lvl.color || VIP_COLORS[lvl.level] || "#FFD700" }}>
                <div style={{ ...styles.cardBadge, backgroundColor: lvl.color || VIP_COLORS[lvl.level] || "#FFD700" }}>
                  VIP {lvl.level}
                </div>
                {lvl.imageUrl && (
                  <img src={lvl.imageUrl} alt={lvl.nameAr} style={styles.cardImg} />
                )}
                <div style={styles.cardName}>{lvl.nameAr}</div>
                {lvl.name && <div style={styles.cardNameEn}>{lvl.name}</div>}
                <div style={styles.cardPrice}>💎 {lvl.price}</div>
                <div style={{ ...styles.statusBadge, backgroundColor: lvl.isActive ? "#22c55e22" : "#ef444422", color: lvl.isActive ? "#22c55e" : "#ef4444" }}>
                  {lvl.isActive ? "مفعّل" : "معطّل"}
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.editBtn} onClick={() => openEdit(lvl)}>
                    <FiEdit size={14} />
                  </button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(lvl.level)}>
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div style={styles.overlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>{editingLevel ? `تعديل VIP${editingLevel.level}` : "إضافة مستوى جديد"}</h3>
                <button style={styles.closeBtn} onClick={() => setShowModal(false)}><FiX /></button>
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}
              <div style={styles.formGroup}>
                <label style={styles.label}>المستوى (Level)</label>
                <input style={styles.input} type="number" min="1" max="15" value={form.level}
                  onChange={(e) => setForm({ ...form, level: +e.target.value })}
                  disabled={!!editingLevel} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم العربي *</label>
                <input style={styles.input} value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  placeholder="مثال: ملكي" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم الإنجليزي</label>
                <input style={styles.input} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Royal" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>السعر (💎 ماس)</label>
                <input style={styles.input} type="number" min="0" value={form.price}
                  onChange={(e) => setForm({ ...form, price: +e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>اللون</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="color" value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    style={{ width: 48, height: 36, border: "none", borderRadius: 8, cursor: "pointer" }} />
                  <input style={{ ...styles.input, flex: 1 }} value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>رابط الصورة (اختياري)</label>
                <input style={styles.input} value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..." />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الترتيب</label>
                <input style={styles.input} type="number" value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })} />
              </div>
              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  مفعّل
                </label>
              </div>
              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>إلغاء</button>
                <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? "جاري الحفظ..." : <><FiCheck size={14} /> حفظ</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && (
          <div style={styles.overlay} onClick={() => setShowAssignModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>تعيين VIP لمستخدم</h3>
                <button style={styles.closeBtn} onClick={() => setShowAssignModal(false)}><FiX /></button>
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}
              <div style={styles.formGroup}>
                <label style={styles.label}>البحث عن مستخدم</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...styles.input, flex: 1 }} value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="اسم المستخدم أو الإيميل"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()} />
                  <button style={styles.saveBtn} onClick={handleSearchUser}>بحث</button>
                </div>
              </div>
              {userSearchResults.length > 0 && (
                <div style={styles.userList}>
                  {userSearchResults.map((u) => (
                    <div key={u._id}
                      style={{ ...styles.userItem, backgroundColor: assignData.userId === u._id ? "#6366f122" : "transparent" }}
                      onClick={() => setAssignData({ ...assignData, userId: u._id, username: u.username })}>
                      <img src={u.profileImage || "https://via.placeholder.com/32"} alt=""
                        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                      <span>{u.username}</span>
                      {assignData.userId === u._id && <FiCheck color="#6366f1" />}
                    </div>
                  ))}
                </div>
              )}
              {assignData.username && (
                <div style={styles.selectedUser}>
                  المستخدم المحدد: <strong>{assignData.username}</strong>
                </div>
              )}
              <div style={styles.formGroup}>
                <label style={styles.label}>مستوى VIP</label>
                <select style={styles.input} value={assignData.vipLevel}
                  onChange={(e) => setAssignData({ ...assignData, vipLevel: +e.target.value })}>
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>VIP {n}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={() => setShowAssignModal(false)}>إلغاء</button>
                <button style={styles.saveBtn} onClick={handleAssign} disabled={saving || !assignData.userId}>
                  {saving ? "جاري التعيين..." : "تعيين VIP"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const styles = {
  container: { padding: "24px", direction: "rtl" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: "#1e293b" },
  subtitle: { color: "#64748b", marginTop: 4, fontSize: 14 },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", backgroundColor: "#6366f1", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  assignBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", backgroundColor: "#f59e0b", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  loading: { textAlign: "center", padding: 60, color: "#64748b", fontSize: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 16, padding: 16, border: "2px solid", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" },
  cardBadge: { color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 20, padding: "4px 12px" },
  cardImg: { width: 56, height: 56, objectFit: "cover", borderRadius: 8 },
  cardName: { fontWeight: 700, fontSize: 15, color: "#1e293b" },
  cardNameEn: { fontSize: 12, color: "#64748b" },
  cardPrice: { fontSize: 14, fontWeight: 600, color: "#6366f1" },
  statusBadge: { fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "2px 10px" },
  cardActions: { display: "flex", gap: 8, marginTop: 4 },
  editBtn: { padding: "6px 10px", backgroundColor: "#e0e7ff", color: "#6366f1", border: "none", borderRadius: 8, cursor: "pointer" },
  deleteBtn: { padding: "6px 10px", backgroundColor: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", direction: "rtl" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" },
  saveBtn: { padding: "10px 20px", backgroundColor: "#6366f1", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 },
  cancelBtn: { padding: "10px 20px", backgroundColor: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  errorBox: { backgroundColor: "#fee2e2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  userList: { border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  userItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" },
  selectedUser: { backgroundColor: "#f0fdf4", color: "#16a34a", padding: "8px 12px", borderRadius: 8, fontSize: 14, marginBottom: 12 },
};

export default VipManagement;
