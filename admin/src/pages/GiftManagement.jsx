import React, { useEffect, useState, useRef } from "react";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { FiEdit, FiTrash2, FiPlus, FiX, FiCheck, FiBox, FiImage, FiMusic, FiGift } from "react-icons/fi";
import Lottie from "lottie-react";

const isLottieUrl = (url) => {
  if (!url) return false;
  try {
    const lower = url.toLowerCase().split("?")[0];
    return lower.endsWith(".json") || lower.includes("/raw/upload/");
  } catch { return false; }
};

const GiftPreview = ({ animationUrl, thumbnailUrl, name, style }) => {
  const [lottieData, setLottieData] = useState(null);
  const [lottieError, setLottieError] = useState(false);
  const urlToLoad = isLottieUrl(animationUrl) ? animationUrl : null;

  useEffect(() => {
    if (!urlToLoad) return;
    setLottieData(null);
    setLottieError(false);
    fetch(urlToLoad)
      .then((r) => r.json())
      .then(setLottieData)
      .catch(() => setLottieError(true));
  }, [urlToLoad]);

  if (urlToLoad && lottieData && !lottieError) {
    return <Lottie animationData={lottieData} loop autoplay style={style} />;
  }

  const imgSrc = thumbnailUrl || animationUrl;
  if (imgSrc && !isLottieUrl(imgSrc)) {
    return <img src={imgSrc} alt={name} style={{ ...style, objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />;
  }

  return <span style={{ fontSize: 36 }}>🎁</span>;
};

const RARITY_META = {
  common:    { label: "عادي",   color: "#6b7280", bg: "#f3f4f6" },
  rare:      { label: "نادر",   color: "#3b82f6", bg: "#eff6ff" },
  epic:      { label: "ملحمي",  color: "#8b5cf6", bg: "#f5f3ff" },
  legendary: { label: "أسطوري", color: "#f97316", bg: "#fff7ed" },
  mythic:    { label: "خرافي",  color: "#ec4899", bg: "#fdf2f8" },
};

const CATEGORY_LABELS = { basic: "أساسي", premium: "مميز", vip: "VIP", special: "خاص" };
const ANIM_TYPES = ["lottie", "gif", "svga", "video", "glb"];

const defaultForm = {
  name: "", nameAr: "", price: 10, rarity: "common", category: "basic",
  duration: 3, comboEnabled: true, fullScreen: false, isActive: true, sortOrder: 0,
  animationFile: null, thumbnailFile: null, soundFile: null, webmFile: null,
};

const GiftManagement = ({ onLogout }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingGift, setEditingGift] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState({ animation: null, thumbnail: null, sound: null });
  const animRef = useRef(null);
  const thumbRef = useRef(null);
  const soundRef = useRef(null);
  const webmRef = useRef(null);

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    fetchGifts();
  }, []);

  const fetchGifts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/gifts", authHeader);
      setGifts(res.data.gifts || []);
    } catch {
      alert("فشل تحميل الهدايا");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingGift(null);
    setForm({ ...defaultForm });
    setPreviews({ animation: null, thumbnail: null, sound: null });
    setError("");
    setShowModal(true);
  };

  const openEdit = (gift) => {
    setEditingGift(gift);
    setForm({
      name: gift.name || "", nameAr: gift.nameAr || "",
      price: gift.price || 10, rarity: gift.rarity || "common",
      category: gift.category || "basic", duration: gift.duration || 3,
      comboEnabled: gift.comboEnabled !== false, fullScreen: !!gift.fullScreen,
      isActive: gift.isActive !== false, sortOrder: gift.sortOrder || 0,
      animationFile: null, thumbnailFile: null, soundFile: null,
    });
    setPreviews({ animation: gift.thumbnailUrl || null, thumbnail: gift.thumbnailUrl || null, sound: null });
    setError("");
    setShowModal(true);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => {
      const next = { ...prev };
      if (type === "animation") next.animationFile = file;
      if (type === "thumbnail") next.thumbnailFile = file;
      if (type === "sound") next.soundFile = file;
      if (type === "webm") next.webmFile = file;
      return next;
    });
    if (type === "thumbnail" || (type === "animation" && file.type.startsWith("video/"))) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((p) => ({ ...p, [type]: reader.result }));
      reader.readAsDataURL(file);
    } else {
      setPreviews((p) => ({ ...p, [type]: file.name }));
    }
  };

  const handleSave = async () => {
    if (!form.nameAr) { setError("الاسم العربي مطلوب"); return; }
        if (!editingGift && !form.animationFile && !form.webmFile) { setError("ملف الحركة أو ملف WebM مطلوب للهدايا الجديدة"); return; }
    if (!editingGift && !form.thumbnailFile) { setError("الصورة المصغرة مطلوبة للهدايا الجديدة"); return; }

    setSaving(true);
    setError("");
    try {
      if (editingGift) {
        // Metadata-only update via JSON (files optional)
        const payload = {
          name: form.name, nameAr: form.nameAr, price: Number(form.price),
          rarity: form.rarity, category: form.category, duration: Number(form.duration),
          comboEnabled: form.comboEnabled, fullScreen: form.fullScreen,
          isActive: form.isActive, sortOrder: Number(form.sortOrder),
        };
        await api.put(`/gifts/admin/${editingGift._id}`, payload, authHeader);
      } else {
        const data = new FormData();
        data.append("name", form.name || form.nameAr);
        data.append("nameAr", form.nameAr);
        data.append("price", form.price);
        data.append("rarity", form.rarity);
        data.append("category", form.category);
        data.append("duration", form.duration);
        data.append("comboEnabled", form.comboEnabled);
        data.append("fullScreen", form.fullScreen);
        data.append("sortOrder", form.sortOrder);
        if (form.animationFile) data.append("animation", form.animationFile);
        if (form.webmFile) data.append("webm", form.webmFile);
        if (form.thumbnailFile) data.append("thumbnail", form.thumbnailFile);
        if (form.soundFile) data.append("sound", form.soundFile);
        await api.post("/gifts/admin/create", data, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
      }
      await fetchGifts();
      setShowModal(false);
      alert(editingGift ? "تم تحديث الهدية بنجاح ✅" : "تم إضافة الهدية بنجاح ✅");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذه الهدية؟")) return;
    try {
      await api.delete(`/gifts/admin/${id}`, authHeader);
      fetchGifts();
    } catch {
      alert("فشل الحذف");
    }
  };

  const handleSeed = async () => {
    if (!window.confirm("سيتم إضافة 6 هدايا تجريبية (وردة، قلب، نجمة، تاج، نار، ماس). هل تريد المتابعة؟")) return;
    setSeeding(true);
    try {
      const res = await api.post("/gifts/admin/seed", {}, authHeader);
      await fetchGifts();
      alert(res.data?.message || "تم تحميل الهدايا التجريبية بنجاح ✅");
    } catch (e) {
      alert(e.response?.data?.message || "فشل تحميل البيانات التجريبية");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🎁 إدارة الهدايا</h2>
            <p style={styles.subtitle}>إدارة الهدايا المتاحة في البث المباشر</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={styles.seedBtn} onClick={handleSeed} disabled={seeding || loading}>
              {seeding ? "جاري التحميل..." : "🌱 بيانات تجريبية"}
            </button>
            <button style={styles.addBtn} onClick={openCreate}>
              <FiPlus size={16} /> إضافة هدية
            </button>
          </div>
        </div>

        {/* Stats row */}
        {gifts.length > 0 && (
          <div style={styles.statsRow}>
            {Object.entries(RARITY_META).map(([key, meta]) => {
              const count = gifts.filter((g) => g.rarity === key).length;
              return count > 0 ? (
                <div key={key} style={{ ...styles.statChip, color: meta.color, background: meta.bg, borderColor: meta.color + "44" }}>
                  {meta.label}: {count}
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={styles.loading}>جاري التحميل...</div>
        ) : (
          <div style={styles.grid}>
            {gifts.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>لا توجد هدايا بعد</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>اضغط "بيانات تجريبية" لإضافة هدايا افتراضية</div>
              </div>
            )}
            {gifts.map((gift) => {
              const rarity = RARITY_META[gift.rarity] || RARITY_META.common;
              return (
                <div key={gift._id} style={{ ...styles.card, borderColor: rarity.color + "66" }}>
                  {/* Rarity stripe */}
                  <div style={{ ...styles.rarityStripe, background: rarity.color }} />
                  <div style={styles.thumbWrap}>
                    <GiftPreview
                      animationUrl={gift.animationUrl}
                      thumbnailUrl={gift.thumbnailUrl}
                      name={gift.nameAr || gift.name}
                      style={styles.thumb}
                    />
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.cardName}>{gift.nameAr || gift.name}</div>
                    {gift.name && gift.nameAr && gift.name !== gift.nameAr && (
                      <div style={styles.cardNameEn}>{gift.name}</div>
                    )}
                    <div style={styles.metaRow}>
                      <span style={{ ...styles.rarityBadge, color: rarity.color, background: rarity.bg }}>
                        {rarity.label}
                      </span>
                      <span style={styles.categoryBadge}>
                        {CATEGORY_LABELS[gift.category] || gift.category}
                      </span>
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.price}>💎 {gift.price}</span>
                      <span style={{ ...styles.activeBadge, color: gift.isActive ? "#22c55e" : "#ef4444", background: gift.isActive ? "#f0fdf4" : "#fef2f2" }}>
                        {gift.isActive ? "مفعّل" : "معطّل"}
                      </span>
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.editBtn} title="تعديل" onClick={() => openEdit(gift)}>
                      <FiEdit size={14} />
                    </button>
                    <button style={styles.deleteBtn} title="حذف" onClick={() => handleDelete(gift._id)}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div style={styles.overlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  {editingGift ? `تعديل: ${editingGift.nameAr || editingGift.name}` : "إضافة هدية جديدة"}
                </h3>
                <button style={styles.closeBtn} onClick={() => setShowModal(false)}><FiX /></button>
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الاسم العربي *</label>
                  <input style={styles.input} value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="مثال: وردة" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الاسم الإنجليزي</label>
                  <input style={styles.input} value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rose" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>السعر (💎)</label>
                  <input style={styles.input} type="number" min="1" value={form.price}
                    onChange={(e) => setForm({ ...form, price: +e.target.value })} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المدة (ثانية)</label>
                  <input style={styles.input} type="number" min="1" max="15" value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: +e.target.value })} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الندرة</label>
                  <select style={styles.input} value={form.rarity}
                    onChange={(e) => setForm({ ...form, rarity: e.target.value })}>
                    {Object.entries(RARITY_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label} ({k})</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الفئة</label>
                  <select style={styles.input} value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الترتيب</label>
                  <input style={styles.input} type="number" value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })} />
                </div>
              </div>

              <div style={styles.checkRow}>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.comboEnabled}
                    onChange={(e) => setForm({ ...form, comboEnabled: e.target.checked })} />
                  تفعيل الكومبو
                </label>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.fullScreen}
                    onChange={(e) => setForm({ ...form, fullScreen: e.target.checked })} />
                  شاشة كاملة
                </label>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  مفعّل
                </label>
              </div>

              {!editingGift && (
                <div style={styles.filesSection}>
                  <div style={styles.filesTitle}><FiBox size={14} /> ملفات الهدية</div>
                  <div style={styles.fileRow}>
                    <button style={styles.fileBtn} onClick={() => animRef.current?.click()}>
                      <FiBox size={14} /> ملف الحركة (Lottie/GIF)
                    </button>
                    <span style={styles.fileName}>{form.animationFile?.name || "لم يُختر"}</span>
                    <input ref={animRef} type="file" accept=".json,.mp4,.gif,.glb" style={{ display: "none" }}
                      onChange={(e) => handleFileChange(e, "animation")} />
                  </div>
                  <div style={{ ...styles.fileRow, border: "1px dashed #a855f7", borderRadius: 8, padding: "8px 10px", background: "#faf5ff" }}>
                    <button style={{ ...styles.fileBtn, background: "#ede9fe", color: "#7c3aed" }} onClick={() => webmRef.current?.click()}>
                      🎬 WebM شفاف (Alpha)
                    </button>
                    <div style={{ flex: 1 }}>
                      <span style={styles.fileName}>{form.webmFile?.name || "لم يُختر"}</span>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>فيديو WebM بخلفية شفافة — يظهر فوق البث بدون خلفية</div>
                    </div>
                    <input ref={webmRef} type="file" accept=".webm,video/webm" style={{ display: "none" }}
                      onChange={(e) => handleFileChange(e, "webm")} />
                  </div>
                  <div style={styles.fileRow}>
                    <button style={styles.fileBtn} onClick={() => thumbRef.current?.click()}>
                      <FiImage size={14} /> صورة مصغرة *
                    </button>
                    {previews.thumbnail && typeof previews.thumbnail === "string" && previews.thumbnail.startsWith("data:image") ? (
                      <img src={previews.thumbnail} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} alt="thumb" />
                    ) : (
                      <span style={styles.fileName}>{form.thumbnailFile?.name || "لم تُختر"}</span>
                    )}
                    <input ref={thumbRef} type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => handleFileChange(e, "thumbnail")} />
                  </div>
                  <div style={styles.fileRow}>
                    <button style={styles.fileBtn} onClick={() => soundRef.current?.click()}>
                      <FiMusic size={14} /> صوت (اختياري)
                    </button>
                    <span style={styles.fileName}>{form.soundFile?.name || "لم يُختر"}</span>
                    <input ref={soundRef} type="file" accept="audio/*" style={{ display: "none" }}
                      onChange={(e) => handleFileChange(e, "sound")} />
                  </div>
                </div>
              )}

              {editingGift && (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0", borderTop: "1px solid #f1f5f9" }}>
                  * لتغيير ملفات الهدية، احذفها وأنشئ هدية جديدة
                </div>
              )}

              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>إلغاء</button>
                <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? "جاري الحفظ..." : <><FiCheck size={14} /> حفظ</>}
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
  container: { padding: 24, direction: "rtl" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: "#1e293b" },
  subtitle: { color: "#64748b", margin: "4px 0 0", fontSize: 14 },
  addBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  seedBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "#10b981", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  statsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  statChip: { fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, border: "1px solid" },
  loading: { textAlign: "center", padding: 60, color: "#64748b", fontSize: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 14, border: "1.5px solid", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" },
  rarityStripe: { height: 4, width: "100%" },
  thumbWrap: { height: 140, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumb: { width: "100%", height: "100%", objectFit: "cover" },
  cardBody: { padding: "10px 12px", flex: 1 },
  cardName: { fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 4 },
  cardNameEn: { fontSize: 12, color: "#94a3b8", marginBottom: 6 },
  metaRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 },
  rarityBadge: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  categoryBadge: { fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 20, fontWeight: 600 },
  priceRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 14, fontWeight: 700, color: "#6366f1" },
  activeBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  cardActions: { display: "flex", gap: 6, padding: "8px 12px", borderTop: "1px solid #f1f5f9" },
  editBtn: { flex: 1, padding: "6px 0", background: "#e0e7ff", color: "#6366f1", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 600 },
  deleteBtn: { flex: 1, padding: "6px 0", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", direction: "rtl" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" },
  formGroup: { display: "flex", flexDirection: "column" },
  label: { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 },
  input: { padding: "9px 11px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#f8fafc", boxSizing: "border-box", width: "100%" },
  checkRow: { display: "flex", gap: 16, margin: "14px 0", flexWrap: "wrap" },
  checkLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" },
  filesSection: { background: "#f8fafc", borderRadius: 10, padding: 14, marginTop: 4 },
  filesTitle: { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 },
  fileRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  fileBtn: { padding: "6px 12px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 },
  fileName: { fontSize: 12, color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 },
  saveBtn: { padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 },
  cancelBtn: { padding: "10px 20px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  errorBox: { background: "#fee2e2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
};

export default GiftManagement;

