import React, { useEffect, useState, useRef } from "react";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { FiEdit, FiTrash2, FiPlus, FiX, FiCheck, FiUser, FiUpload, FiImage } from "react-icons/fi";

const VIP_COLORS = {
  1: "#CD7F32", 2: "#C0C0C0", 3: "#FFD700", 4: "#00BFFF",
  5: "#9370DB", 6: "#FF4500", 7: "#00CED1", 8: "#FF69B4",
  9: "#32CD32", 10: "#FF8C00", 11: "#DC143C", 12: "#4169E1",
  13: "#FF1493", 14: "#00FF7F", 15: "#FFD700",
};

const BENEFIT_TYPES = [
  { value: "badge",  label: "شارة (Badge)" },
  { value: "frame",  label: "إطار صورة (Frame)" },
  { value: "chat",   label: "فقاعة دردشة (Chat)" },
  { value: "points", label: "نقاط (Points)" },
  { value: "medal",  label: "وسام (Medal)" },
  { value: "entry",  label: "انيميشن دخول (Entry)" },
  { value: "other",  label: "أخرى" },
];

const defaultBenefitForm = {
  titleAr: "", title: "", descriptionAr: "", description: "",
  type: "other", imageUrl: "", imageFile: null,
  lottieUrl: "", lottieFile: null, isLocked: false, sortOrder: 0,
};

const defaultForm = {
  level: 1, name: "", nameAr: "", price: 99, color: "#FFD700",
  usernameColor: "#FFD700",
  commentTextColor: "",
  commentBorderWidth: 1.4,
  commentBubbleShape: "classic",
  giftThreshold: 0,
  imageUrl: "", imageFile: null,
  badgeLottieUrl: "", badgeLottieFile: null,
  commentFrameLottieUrl: "", commentFrameLottieFile: null,
  profileFrameLottieUrl: "", profileFrameLottieFile: null,
  joinAnimationLottieUrl: "", joinAnimationLottieFile: null,
  joinSoundUrl: "", joinSoundFile: null,
  specialJoinText: "",
  benefits: [],
  isActive: true, sortOrder: 0,
};

const ALLOWED_BUBBLE_SHAPES = ["classic", "rounded", "square", "pill"];

const normalizeBubbleShape = (shape) => {
  const value = typeof shape === "string" ? shape.trim().toLowerCase() : "";
  return ALLOWED_BUBBLE_SHAPES.includes(value) ? value : "classic";
};

const normalizeBorderWidth = (borderWidth) => {
  const value = Number(borderWidth);
  if (!Number.isFinite(value)) return 1.4;
  return Math.min(Math.max(value, 0), 8);
};

const getBubbleShapeStyle = (shape) => {
  switch (normalizeBubbleShape(shape)) {
    case "rounded":
      return { borderRadius: 16, borderTopLeftRadius: 16 };
    case "square":
      return { borderRadius: 8, borderTopLeftRadius: 8 };
    case "pill":
      return { borderRadius: 24, borderTopLeftRadius: 24 };
    case "classic":
    default:
      return { borderRadius: 18, borderTopLeftRadius: 4 };
  }
};

const VipManagement = ({ onLogout }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  // Helper: detect if a stored URL is an image (PNG/JPG) vs Lottie JSON
  const isImageUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) && !url.includes("/raw/upload/");
  };

  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({ userId: "", username: "", vipLevel: 1, userImage: "" });
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [badgeLottieName, setBadgeLottieName] = useState("");
  const [commentFrameLottieName, setCommentFrameLottieName] = useState("");
  const [commentFramePreview, setCommentFramePreview] = useState(null);
  const [profileFrameLottieName, setProfileFrameLottieName] = useState("");
  const [profileFramePreview, setProfileFramePreview] = useState(null);
  const [joinAnimationLottieName, setJoinAnimationLottieName] = useState("");
  const [joinSoundName, setJoinSoundName] = useState("");
  const [uploading, setUploading] = useState(false);
  // Benefits sub-form
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [editingBenefitIdx, setEditingBenefitIdx] = useState(null);
  const [benefitForm, setBenefitForm] = useState({ ...defaultBenefitForm });
  const [benefitImgPreview, setBenefitImgPreview] = useState(null);
  const [benefitLottieName, setBenefitLottieName] = useState("");
  const [uploadingBenefit, setUploadingBenefit] = useState(false);

  const fileInputRef = useRef(null);
  const badgeLottieRef = useRef(null);
  const commentFrameLottieRef = useRef(null);
  const profileFrameLottieRef = useRef(null);
  const joinAnimationLottieRef = useRef(null);
  const joinSoundRef = useRef(null);
  const benefitImgRef = useRef(null);
  const benefitLottieRef = useRef(null);

  const CLOUD_NAME = "dah8ui33p";
  const UPLOAD_PRESET = "badges_preset";

  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "tikbook/vip");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  };

  // Upload Lottie JSON as raw file to Cloudinary
  const uploadLottieToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "tikbook/vip/lottie");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  };

  // Upload audio file to Cloudinary
  const uploadSoundToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "tikbook/vip/sounds");
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.secure_url;
  };

  // ── Benefit sub-form helpers ────────────────────────────────────────────────
  const openAddBenefit = () => {
    setEditingBenefitIdx(null);
    setBenefitForm({ ...defaultBenefitForm });
    setBenefitImgPreview(null);
    setBenefitLottieName("");
    setShowBenefitForm(true);
  };

  const openEditBenefit = (idx) => {
    const b = form.benefits[idx];
    setEditingBenefitIdx(idx);
    setBenefitForm({ ...defaultBenefitForm, ...b, imageFile: null, lottieFile: null });
    setBenefitImgPreview(b.imageUrl || null);
    setBenefitLottieName(b.lottieUrl ? "(ملف محفوظ)" : "");
    setShowBenefitForm(true);
  };

  const saveBenefit = async () => {
    if (!benefitForm.titleAr) { setError("عنوان الميزة مطلوب"); return; }
    setUploadingBenefit(true);
    try {
      let imgUrl = benefitForm.imageUrl;
      let lottieUrl = benefitForm.lottieUrl;
      if (benefitForm.imageFile) imgUrl = await uploadToCloudinary(benefitForm.imageFile);
      if (benefitForm.lottieFile) lottieUrl = await uploadLottieToCloudinary(benefitForm.lottieFile);
      const saved = { ...benefitForm, imageUrl: imgUrl, lottieUrl, imageFile: undefined, lottieFile: undefined };
      const updated = [...form.benefits];
      if (editingBenefitIdx !== null) {
        updated[editingBenefitIdx] = saved;
      } else {
        updated.push(saved);
      }
      setForm({ ...form, benefits: updated });
      setShowBenefitForm(false);
      setError("");
    } catch (e) {
      setError(e.message || "فشل رفع ملفات الميزة");
    } finally {
      setUploadingBenefit(false);
    }
  };

  const deleteBenefit = (idx) => {
    const updated = form.benefits.filter((_, i) => i !== idx);
    setForm({ ...form, benefits: updated });
  };

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
      setError("فشل تحميل المستويات");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingLevel(null);
    setForm({ ...defaultForm });
    setImagePreview(null);
    setBadgeLottieName("");
    setCommentFrameLottieName("");
    setCommentFramePreview(null);
    setProfileFrameLottieName("");
    setProfileFramePreview(null);
    setJoinAnimationLottieName("");
    setJoinSoundName("");
    setShowBenefitForm(false);
    setError("");
    setShowModal(true);
  };

  const openEdit = (lvl) => {
    setEditingLevel(lvl);
    setForm({
      level: lvl.level, name: lvl.name || "", nameAr: lvl.nameAr || "",
      price: lvl.price, color: lvl.color || "#FFD700",
      usernameColor: lvl.usernameColor || lvl.color || "#FFD700",
      commentTextColor: lvl.commentTextColor || "",
      commentBorderWidth:
        typeof lvl.commentBorderWidth === "number" ? lvl.commentBorderWidth : 1.4,
      commentBubbleShape: lvl.commentBubbleShape || "classic",
      giftThreshold: lvl.giftThreshold || 0,
      imageUrl: lvl.imageUrl || "", imageFile: null,
      badgeLottieUrl: lvl.badgeLottieUrl || "", badgeLottieFile: null,
      commentFrameLottieUrl: lvl.commentFrameLottieUrl || "", commentFrameLottieFile: null,
      profileFrameLottieUrl: lvl.profileFrameLottieUrl || "", profileFrameLottieFile: null,
      joinAnimationLottieUrl: lvl.joinAnimationLottieUrl || "", joinAnimationLottieFile: null,
      joinSoundUrl: lvl.joinSoundUrl || "", joinSoundFile: null,
      specialJoinText: lvl.specialJoinText || "",
      benefits: Array.isArray(lvl.benefits) ? lvl.benefits : [],
      isActive: lvl.isActive,
      sortOrder: lvl.sortOrder || 0,
    });
    setImagePreview(lvl.imageUrl || null);
    setBadgeLottieName(lvl.badgeLottieUrl ? "(ملف محفوظ)" : "");
    setCommentFrameLottieName(lvl.commentFrameLottieUrl ? "(ملف محفوظ)" : "");
    setCommentFramePreview(isImageUrl(lvl.commentFrameLottieUrl) ? lvl.commentFrameLottieUrl : null);
    setProfileFrameLottieName(lvl.profileFrameLottieUrl ? "(ملف محفوظ)" : "");
    setProfileFramePreview(isImageUrl(lvl.profileFrameLottieUrl) ? lvl.profileFrameLottieUrl : null);
    setJoinAnimationLottieName(lvl.joinAnimationLottieUrl ? "(ملف محفوظ)" : "");
    setJoinSoundName(lvl.joinSoundUrl ? "(ملف محفوظ)" : "");
    setShowBenefitForm(false);
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nameAr) { setError("الاسم العربي مطلوب"); return; }
    setSaving(true);
    setError("");
    try {
      setUploading(true);
      let finalImageUrl = form.imageUrl;
      if (form.imageFile) finalImageUrl = await uploadToCloudinary(form.imageFile);
      let finalBadgeLottieUrl = form.badgeLottieUrl;
      if (form.badgeLottieFile) finalBadgeLottieUrl = await uploadLottieToCloudinary(form.badgeLottieFile);
      let finalCommentFrameLottieUrl = form.commentFrameLottieUrl;
      if (form.commentFrameLottieFile) {
        const isImg = form.commentFrameLottieFile.type?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(form.commentFrameLottieFile.name);
        finalCommentFrameLottieUrl = isImg
          ? await uploadToCloudinary(form.commentFrameLottieFile)
          : await uploadLottieToCloudinary(form.commentFrameLottieFile);
      }
      let finalProfileFrameLottieUrl = form.profileFrameLottieUrl;
      if (form.profileFrameLottieFile) {
        const isImage = form.profileFrameLottieFile.type?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(form.profileFrameLottieFile.name);
        finalProfileFrameLottieUrl = isImage
          ? await uploadToCloudinary(form.profileFrameLottieFile)
          : await uploadLottieToCloudinary(form.profileFrameLottieFile);
      }
      let finalJoinAnimationLottieUrl = form.joinAnimationLottieUrl;
      if (form.joinAnimationLottieFile) finalJoinAnimationLottieUrl = await uploadLottieToCloudinary(form.joinAnimationLottieFile);
      let finalJoinSoundUrl = form.joinSoundUrl;
      if (form.joinSoundFile) finalJoinSoundUrl = await uploadSoundToCloudinary(form.joinSoundFile);
      setUploading(false);
      const payload = {
        ...form,
        level: Number(form.level),
        price: Number(form.price),
        giftThreshold: Number(form.giftThreshold) || 0,
        sortOrder: Number(form.sortOrder) || 0,
        commentTextColor: form.commentTextColor || "",
        commentBorderWidth: normalizeBorderWidth(form.commentBorderWidth),
        commentBubbleShape: normalizeBubbleShape(form.commentBubbleShape),
        imageUrl: finalImageUrl,
        badgeLottieUrl: finalBadgeLottieUrl,
        commentFrameLottieUrl: finalCommentFrameLottieUrl,
        profileFrameLottieUrl: finalProfileFrameLottieUrl,
        joinAnimationLottieUrl: finalJoinAnimationLottieUrl,
        joinSoundUrl: finalJoinSoundUrl,
      };
      delete payload.imageFile;
      delete payload.badgeLottieFile;
      delete payload.commentFrameLottieFile;
      delete payload.profileFrameLottieFile;
      delete payload.joinAnimationLottieFile;
      delete payload.joinSoundFile;
      if (editingLevel) {
        await api.put(`/vip/admin/levels/${editingLevel.level}`, payload, authHeader);
      } else {
        await api.post("/vip/admin/levels", payload, authHeader);
      }
      await fetchLevels();
      setShowModal(false);
      setEditingLevel(null);
      setForm({ ...defaultForm });
      setImagePreview(null);
      setBadgeLottieName("");
      setCommentFrameLottieName("");
      setCommentFramePreview(null);
      setProfileFrameLottieName("");
      setProfileFramePreview(null);
      setJoinAnimationLottieName("");
      setJoinSoundName("");
      alert(editingLevel ? "تم تحديث المستوى بنجاح ✅" : "تم إضافة المستوى بنجاح ✅");
    } catch (e) {
      setUploading(false);
      setError(e.response?.data?.message || e.message || "حدث خطأ");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (level) => {
    if (!window.confirm(`هل تريد حذف المستوى ${level}؟`)) return;
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
      setAssignData({ userId: "", username: "", vipLevel: 1, userImage: "" });
      setUserSearchResults([]);
      setSearchQuery("");
      alert("تم تعيين المستوى بنجاح ✅");
    } catch (e) {
      setError(e.response?.data?.message || "فشل التعيين");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedVip = async () => {
    if (!window.confirm("سيتم إضافة 7 مستويات تجريبية (برونزي، فضي، ذهبي...). هل تريد المتابعة؟")) return;
    try {
      setLoading(true);
      const res = await api.post("/vip/admin/seed", {}, authHeader);
      await fetchLevels();
      alert(res.data?.message || "تم تحميل المستويات التجريبية بنجاح ✅");
    } catch (e) {
      alert(e.response?.data?.message || "فشل تحميل البيانات التجريبية");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout onLogout={onLogout}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>⭐ إدارة المستويات</h2>
            <p style={styles.subtitle}>إدارة مستويات التطبيق وتعيينها للمستخدمين — مع تخصيص كامل لكل مستوى</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={styles.seedBtn} onClick={handleSeedVip} disabled={loading}>
              🌱 بيانات تجريبية
            </button>
            <button style={styles.assignBtn} onClick={() => {
              const firstLevel = levels.filter(l => l.isActive).sort((a,b) => a.level - b.level)[0];
              setAssignData({ userId: "", username: "", vipLevel: firstLevel?.level || 1, userImage: "" });
              setUserSearchResults([]);
              setSearchQuery("");
              setShowAssignModal(true);
              setError("");
            }}>
              <FiUser size={16} /> تعيين مستوى لمستخدم
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
            {levels.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: "#94a3b8" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>لا توجد مستويات بعد</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>اضغط "بيانات تجريبية" لإضافة مستويات افتراضية</div>
              </div>
            )}
            {levels.map((lvl) => {
              const color = lvl.color || VIP_COLORS[lvl.level] || "#FFD700";
              return (
                <div key={lvl.level} style={{ ...styles.card, borderColor: color, boxShadow: `0 4px 16px ${color}33` }}>
                  <div style={{ ...styles.cardBadge, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                    ⭐ المستوى {lvl.level}
                  </div>
                  {lvl.imageUrl && (
                    <img src={lvl.imageUrl} alt={lvl.nameAr} style={styles.cardImg} />
                  )}
                  {lvl.badgeLottieUrl && (
                    <div style={{ fontSize: 10, color: "#6366f1", marginTop: 2, textAlign: "center" }}>
                      🎞 شارة ✓
                    </div>
                  )}
                  {lvl.commentFrameLottieUrl && (
                    <div style={{ fontSize: 10, color: "#8b5cf6", textAlign: "center" }}>💬 إطار تعليق ✓</div>
                  )}
                  {lvl.profileFrameLottieUrl && (
                    <div style={{ fontSize: 10, color: "#06b6d4", textAlign: "center" }}>👤 إطار صورة ✓</div>
                  )}
                  {lvl.giftThreshold > 0 && (
                    <div style={{ fontSize: 10, color: "#f59e0b", textAlign: "center" }}>🎁 ترقية عند {lvl.giftThreshold.toLocaleString()} عملة</div>
                  )}
                  {lvl.joinAnimationLottieUrl && (
                    <div style={{ fontSize: 10, color: "#f59e0b", textAlign: "center" }}>✨ دخول ✓</div>
                  )}
                  {lvl.joinSoundUrl && (
                    <div style={{ fontSize: 10, color: "#10b981", textAlign: "center" }}>🔊 صوت ✓</div>
                  )}
                  {lvl.benefits?.length > 0 && (
                    <div style={{ fontSize: 10, color: "#10b981", textAlign: "center" }}>
                      🎁 {lvl.benefits.length} مزايا
                    </div>
                  )}
                  <div style={styles.cardName}>{lvl.nameAr}</div>
                  {lvl.name && <div style={styles.cardNameEn}>{lvl.name}</div>}
                  <div style={{ ...styles.cardPrice, color }}>💎 {lvl.price}</div>
                  <div style={{ ...styles.statusBadge, backgroundColor: lvl.isActive ? "#22c55e22" : "#ef444422", color: lvl.isActive ? "#22c55e" : "#ef4444" }}>
                    {lvl.isActive ? "مفعّل" : "معطّل"}
                  </div>
                  <div style={styles.cardPreviewWrap}>
                    <div
                      style={{
                        ...styles.cardPreviewBubble,
                        ...getBubbleShapeStyle(lvl.commentBubbleShape),
                        borderColor: color,
                        borderWidth: normalizeBorderWidth(lvl.commentBorderWidth),
                        borderStyle: "solid",
                      }}
                    >
                      VIP تعليق
                    </div>
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
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div style={styles.overlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3>{editingLevel ? `تعديل المستوى ${editingLevel.level}` : "إضافة مستوى جديد"}</h3>
                <button style={styles.closeBtn} onClick={() => setShowModal(false)}><FiX /></button>
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}

              {/* ── Row 1: Level + Arabic name ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المستوى (Level)</label>
                  <input style={styles.input} type="number" min="1" value={form.level}
                    onChange={(e) => setForm({ ...form, level: +e.target.value })}
                    disabled={!!editingLevel} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الاسم العربي *</label>
                  <input style={styles.input} value={form.nameAr}
                    onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    placeholder="مثال: ملكي" />
                </div>
              </div>

              {/* ── Row 2: English name + Price ── */}
              <div style={styles.twoCol}>
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
              </div>

              {/* ── Row 2b: Gift threshold (auto-upgrade) ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🎁 حد الهدايا للترقية التلقائية (عدد العملات)</label>
                  <input style={styles.input} type="number" min="0" value={form.giftThreshold}
                    onChange={(e) => setForm({ ...form, giftThreshold: +e.target.value })}
                    placeholder="0 = معطّل" />
                  <span style={{ fontSize: 11, color: "#64748b", marginTop: 3, display: "block" }}>
                    عندما يصل مجموع ما أنفقه المستخدم على الهدايا لهذا الرقم يتم ترقيته تلقائياً. اترك 0 لتعطيل الترقية التلقائية لهذا المستوى.
                  </span>
                </div>
                <div style={styles.formGroup} />
              </div>

              {/* ── Row 3: Level color + Username color ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>لون المستوى</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      style={{ width: 40, height: 36, border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                    <input style={{ ...styles.input, flex: 1 }} value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>لون اسم المستخدم</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={form.usernameColor || form.color}
                      onChange={(e) => setForm({ ...form, usernameColor: e.target.value })}
                      style={{ width: 40, height: 36, border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                    <input style={{ ...styles.input, flex: 1 }} value={form.usernameColor || form.color}
                      onChange={(e) => setForm({ ...form, usernameColor: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* ── Row 4: Border width + Bubble shape ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>سماكة إطار التعليق</label>
                  <input style={styles.input} type="number" min="0" max="8" step="0.1"
                    value={form.commentBorderWidth}
                    onChange={(e) => setForm({ ...form, commentBorderWidth: +e.target.value })} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>شكل فقاعة التعليق</label>
                  <select style={styles.input} value={form.commentBubbleShape}
                    onChange={(e) => setForm({ ...form, commentBubbleShape: e.target.value })}>
                    <option value="classic">Classic</option>
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="pill">Pill</option>
                  </select>
                </div>
              </div>

              {/* ── Row 4b: Comment text color ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🎨 لون نص التعليق</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color"
                      value={form.commentTextColor || "#FFFFFF"}
                      onChange={(e) => setForm({ ...form, commentTextColor: e.target.value })}
                      style={{ width: 40, height: 36, border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                    <input style={{ ...styles.input, flex: 1 }}
                      value={form.commentTextColor}
                      placeholder="#FFFFFF (افتراضي أبيض)"
                      onChange={(e) => setForm({ ...form, commentTextColor: e.target.value })} />
                    {form.commentTextColor && (
                      <button
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #475569", background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 11 }}
                        onClick={() => setForm({ ...form, commentTextColor: "" })}
                        title="إعادة تعيين للأبيض"
                      >✕ إعادة</button>
                    )}
                  </div>
                </div>
                <div style={styles.formGroup} />
              </div>

              {/* ── Comment preview (full width) ── */}
              <div style={styles.formGroup}>
                <label style={styles.label}>معاينة التعليق</label>
                <div style={styles.previewWrap}>
                  <div style={{ ...styles.previewBubble, ...getBubbleShapeStyle(form.commentBubbleShape), borderColor: form.color || "#FFD700", borderWidth: normalizeBorderWidth(form.commentBorderWidth) }}>
                    <div style={styles.previewHeader}>
                      <span style={{ ...styles.previewUsername, color: form.color || "#FFD700" }}>مستخدم VIP{Number(form.level) || 1}</span>
                      <span style={{ ...styles.previewChip, backgroundColor: form.color || "#FFD700" }}>VIP{Number(form.level) || 1}</span>
                    </div>
                    <div style={{ ...styles.previewMessage, color: form.commentTextColor || "#FFFFFF" }}>هذا شكل التعليق داخل صفحة البث المباشر.</div>
                  </div>
                </div>
              </div>

              {/* ── Row 5: Badge image + Badge Lottie ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🖼 صورة المستوى</label>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setForm({ ...form, imageFile: file, imageUrl: "" });
                      setImagePreview(URL.createObjectURL(file));
                    }} />
                  <div style={styles.uploadZone} onClick={() => fileInputRef.current?.click()}>
                    {imagePreview ? (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img src={imagePreview} alt="preview" style={styles.imagePreview} />
                        <button style={styles.removeImgBtn}
                          onClick={(e) => { e.stopPropagation(); setImagePreview(null); setForm({ ...form, imageFile: null, imageUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8" }}>
                        <FiImage size={28} style={{ marginBottom: 6 }} />
                        <div style={{ fontSize: 12 }}>PNG, JPG, WebP</div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🎞 انيميشن الشارة (Lottie)</label>
                  <input ref={badgeLottieRef} type="file" accept=".json,application/json" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setForm({ ...form, badgeLottieFile: file, badgeLottieUrl: "" });
                      setBadgeLottieName(file.name);
                    }} />
                  <div style={styles.uploadZone} onClick={() => badgeLottieRef.current?.click()}>
                    {badgeLottieName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span style={{ fontSize: 22 }}>🎞</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{badgeLottieName}</div>
                          {form.badgeLottieUrl && <div style={{ fontSize: 10, color: "#64748b" }}>محفوظ ✓</div>}
                        </div>
                        <button style={{ ...styles.removeImgBtn, position: "static" }}
                          onClick={(e) => { e.stopPropagation(); setBadgeLottieName(""); setForm({ ...form, badgeLottieFile: null, badgeLottieUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🎞</div>
                        <div style={{ fontSize: 12 }}>Lottie JSON</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Row 6: Comment frame + Profile frame ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>💬 إطار التعليق (PNG / Lottie)</label>
                  <input ref={commentFrameLottieRef} type="file" accept=".json,application/json,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const isImg = file.type?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
                      if (commentFramePreview && commentFramePreview.startsWith("blob:")) URL.revokeObjectURL(commentFramePreview);
                      setCommentFramePreview(isImg ? URL.createObjectURL(file) : null);
                      setForm({ ...form, commentFrameLottieFile: file, commentFrameLottieUrl: "" });
                      setCommentFrameLottieName(file.name);
                    }} />
                  <div style={{ ...styles.uploadZone, padding: 0, overflow: "hidden", minHeight: 80 }} onClick={() => commentFrameLottieRef.current?.click()}>
                    {commentFramePreview ? (
                      <div style={{ position: "relative", width: "100%", textAlign: "center" }}>
                        <img src={commentFramePreview} alt="comment frame preview" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6, display: "block", margin: "0 auto" }} />
                        <div style={{ fontSize: 10, color: "#64748b", padding: "4px 0" }}>{commentFrameLottieName}</div>
                        <button style={{ ...styles.removeImgBtn, position: "absolute", top: 4, right: 4 }}
                          onClick={(e) => { e.stopPropagation(); if (commentFramePreview?.startsWith("blob:")) URL.revokeObjectURL(commentFramePreview); setCommentFramePreview(null); setCommentFrameLottieName(""); setForm({ ...form, commentFrameLottieFile: null, commentFrameLottieUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : commentFrameLottieName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 10 }}>
                        <span style={{ fontSize: 22 }}>💬</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{commentFrameLottieName}</div>
                          {form.commentFrameLottieUrl && <div style={{ fontSize: 10, color: "#64748b" }}>محفوظ ✓</div>}
                        </div>
                        <button style={{ ...styles.removeImgBtn, position: "static" }}
                          onClick={(e) => { e.stopPropagation(); setCommentFrameLottieName(""); setCommentFramePreview(null); setForm({ ...form, commentFrameLottieFile: null, commentFrameLottieUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>💬</div>
                        <div style={{ fontSize: 12 }}>إطار فقاعة التعليق</div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>👤 إطار الصورة الشخصية (PNG / Lottie)</label>
                  <input ref={profileFrameLottieRef} type="file" accept=".json,application/json,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const isImg = file.type?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
                      if (profileFramePreview && profileFramePreview.startsWith("blob:")) URL.revokeObjectURL(profileFramePreview);
                      setProfileFramePreview(isImg ? URL.createObjectURL(file) : null);
                      setForm({ ...form, profileFrameLottieFile: file, profileFrameLottieUrl: "" });
                      setProfileFrameLottieName(file.name);
                    }} />
                  <div style={{ ...styles.uploadZone, padding: 0, overflow: "hidden", minHeight: 80 }} onClick={() => profileFrameLottieRef.current?.click()}>
                    {profileFramePreview ? (
                      <div style={{ position: "relative", width: "100%", textAlign: "center" }}>
                        <div style={{ position: "relative", display: "inline-block", margin: "8px auto" }}>
                          <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#334155", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                          <img src={profileFramePreview} alt="profile frame preview" style={{ width: 108, height: 108, objectFit: "contain", display: "block", position: "relative", zIndex: 1 }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#64748b", padding: "4px 0" }}>{profileFrameLottieName}</div>
                        <button style={{ ...styles.removeImgBtn, position: "absolute", top: 4, right: 4 }}
                          onClick={(e) => { e.stopPropagation(); if (profileFramePreview?.startsWith("blob:")) URL.revokeObjectURL(profileFramePreview); setProfileFramePreview(null); setProfileFrameLottieName(""); setForm({ ...form, profileFrameLottieFile: null, profileFrameLottieUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : profileFrameLottieName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 10 }}>
                        <span style={{ fontSize: 22 }}>👤</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profileFrameLottieName}</div>
                          {form.profileFrameLottieUrl && <div style={{ fontSize: 10, color: "#64748b" }}>محفوظ ✓</div>}
                        </div>
                        <button style={{ ...styles.removeImgBtn, position: "static" }}
                          onClick={(e) => { e.stopPropagation(); setProfileFrameLottieName(""); setProfileFramePreview(null); setForm({ ...form, profileFrameLottieFile: null, profileFrameLottieUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>👤</div>
                        <div style={{ fontSize: 12 }}>إطار الأفاتار في الغرفة</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Row 7: Join animation + Join sound ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>✨ انيميشن دخول الغرفة (Lottie)</label>
                  <input ref={joinAnimationLottieRef} type="file" accept=".json,application/json" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setForm({ ...form, joinAnimationLottieFile: file, joinAnimationLottieUrl: "" });
                      setJoinAnimationLottieName(file.name);
                    }} />
                  <div style={styles.uploadZone} onClick={() => joinAnimationLottieRef.current?.click()}>
                    {joinAnimationLottieName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span style={{ fontSize: 22 }}>✨</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{joinAnimationLottieName}</div>
                          {form.joinAnimationLottieUrl && <div style={{ fontSize: 10, color: "#64748b" }}>محفوظ ✓</div>}
                        </div>
                        <button style={{ ...styles.removeImgBtn, position: "static" }}
                          onClick={(e) => { e.stopPropagation(); setJoinAnimationLottieName(""); setForm({ ...form, joinAnimationLottieFile: null, joinAnimationLottieUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>✨</div>
                        <div style={{ fontSize: 12 }}>انيميشن عند دخول VIP</div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>🔊 صوت دخول الغرفة (MP3 / WAV / M4A)</label>
                  <input ref={joinSoundRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setForm({ ...form, joinSoundFile: file, joinSoundUrl: "" });
                      setJoinSoundName(file.name);
                    }} />
                  <div style={styles.uploadZone} onClick={() => joinSoundRef.current?.click()}>
                    {joinSoundName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span style={{ fontSize: 22 }}>🎵</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{joinSoundName}</div>
                          {form.joinSoundUrl && <div style={{ fontSize: 10, color: "#64748b" }}>محفوظ ✓</div>}
                        </div>
                        <button style={{ ...styles.removeImgBtn, position: "static" }}
                          onClick={(e) => { e.stopPropagation(); setJoinSoundName(""); setForm({ ...form, joinSoundFile: null, joinSoundUrl: "" }); }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>🔊</div>
                        <div style={{ fontSize: 12 }}>صوت دخول المستوى</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Special Join Text (full width) ── */}
              <div style={styles.formGroup}>
                <label style={styles.label}>📢 نص الدخول الخاص (Special Join Text)</label>
                <input style={styles.input} value={form.specialJoinText}
                  onChange={(e) => setForm({ ...form, specialJoinText: e.target.value })}
                  placeholder="مثال: لقد انضم الملك إلى الغرفة 👑" />
              </div>

              {/* Benefits Editor */}
              <div style={{ ...styles.formGroup, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ ...styles.label, marginBottom: 0 }}>🎁 مزايا المستوى (Benefits)</label>
                  <button style={{ ...styles.saveBtn, padding: "6px 12px", fontSize: 12 }} onClick={openAddBenefit}>
                    <FiPlus size={12} /> إضافة ميزة
                  </button>
                </div>
                {form.benefits.length === 0 && (
                  <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>لا توجد مزايا بعد</div>
                )}
                {form.benefits.map((b, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 8, marginBottom: 6, border: "1px solid #e2e8f0" }}>
                    {b.imageUrl && <img src={b.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />}
                    {b.lottieUrl && !b.imageUrl && <span style={{ fontSize: 22 }}>🎞</span>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{b.titleAr}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{BENEFIT_TYPES.find(t => t.value === b.type)?.label || b.type}</div>
                    </div>
                    {b.isLocked && <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>🔒</span>}
                    <button style={styles.editBtn} onClick={() => openEditBenefit(idx)}><FiEdit size={12} /></button>
                    <button style={styles.deleteBtn} onClick={() => deleteBenefit(idx)}><FiTrash2 size={12} /></button>
                  </div>
                ))}

                {/* Inline benefit sub-form */}
                {showBenefitForm && (
                  <div style={{ background: "#fff", border: "1px solid #6366f1", borderRadius: 10, padding: 14, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <strong style={{ fontSize: 13 }}>{editingBenefitIdx !== null ? "تعديل ميزة" : "إضافة ميزة جديدة"}</strong>
                      <button style={styles.closeBtn} onClick={() => setShowBenefitForm(false)}><FiX /></button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={styles.label}>العنوان العربي *</label>
                        <input style={styles.input} value={benefitForm.titleAr}
                          onChange={(e) => setBenefitForm({ ...benefitForm, titleAr: e.target.value })} placeholder="مثال: إطار الصورة" />
                      </div>
                      <div>
                        <label style={styles.label}>النوع</label>
                        <select style={styles.input} value={benefitForm.type}
                          onChange={(e) => setBenefitForm({ ...benefitForm, type: e.target.value })}>
                          {BENEFIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: "1/-1" }}>
                        <label style={styles.label}>الوصف العربي</label>
                        <input style={styles.input} value={benefitForm.descriptionAr}
                          onChange={(e) => setBenefitForm({ ...benefitForm, descriptionAr: e.target.value })} placeholder="وصف قصير للميزة" />
                      </div>
                      {/* Benefit image upload */}
                      <div>
                        <label style={styles.label}>📷 صورة الميزة</label>
                        <input ref={benefitImgRef} type="file" accept="image/*" style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setBenefitForm({ ...benefitForm, imageFile: f, imageUrl: "" });
                            setBenefitImgPreview(URL.createObjectURL(f));
                          }} />
                        <div style={{ ...styles.uploadZone, padding: 10, minHeight: 60 }} onClick={() => benefitImgRef.current?.click()}>
                          {benefitImgPreview
                            ? <img src={benefitImgPreview} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />
                            : <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}><FiImage size={18} /><br/>صورة</div>}
                        </div>
                      </div>
                      {/* Benefit lottie upload */}
                      <div>
                        <label style={styles.label}>🎞 انيميشن (Lottie JSON)</label>
                        <input ref={benefitLottieRef} type="file" accept=".json,application/json" style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setBenefitForm({ ...benefitForm, lottieFile: f, lottieUrl: "" });
                            setBenefitLottieName(f.name);
                          }} />
                        <div style={{ ...styles.uploadZone, padding: 10, minHeight: 60 }} onClick={() => benefitLottieRef.current?.click()}>
                          {benefitLottieName
                            ? <div style={{ fontSize: 11, color: "#6366f1", textAlign: "center", fontWeight: 600 }}>🎞 {benefitLottieName}</div>
                            : <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}>🎞<br/>Lottie JSON</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" id="bLocked" checked={benefitForm.isLocked}
                          onChange={(e) => setBenefitForm({ ...benefitForm, isLocked: e.target.checked })} />
                        <label htmlFor="bLocked" style={{ fontSize: 13, color: "#374151" }}>مقفل (يحتاج مستوى أعلى)</label>
                      </div>
                      <div>
                        <label style={styles.label}>الترتيب</label>
                        <input style={styles.input} type="number" value={benefitForm.sortOrder}
                          onChange={(e) => setBenefitForm({ ...benefitForm, sortOrder: +e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                      <button style={styles.cancelBtn} onClick={() => setShowBenefitForm(false)}>إلغاء</button>
                      <button style={styles.saveBtn} onClick={saveBenefit} disabled={uploadingBenefit}>
                        {uploadingBenefit ? "جاري الرفع..." : <><FiCheck size={12} /> حفظ الميزة</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Row 8: Sort order + Active toggle ── */}
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الترتيب</label>
                  <input style={styles.input} type="number" value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: +e.target.value })} />
                </div>
                <div style={{ ...styles.formGroup, display: "flex", alignItems: "center", paddingTop: 24 }}>
                  <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                    <input type="checkbox" checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    مفعّل
                  </label>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>إلغاء</button>
              <button style={styles.saveBtn} onClick={handleSave} disabled={saving || uploading}>
                {uploading ? "جاري الرفع..." : saving ? "جاري الحفظ..." : <><FiCheck size={14} /> حفظ</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Modal */}
        {showAssignModal && (() => {
          const selLevel = levels.find((l) => l.level === assignData.vipLevel) || null;
          const lvlColor = selLevel?.color || "#FFD700";
          const bubbleShape = selLevel?.commentBubbleShape || "classic";
          const borderWidth = normalizeBorderWidth(selLevel?.commentBorderWidth ?? 1.4);
          return (
          <div style={styles.overlay} onClick={() => setShowAssignModal(false)}>
            <div style={{ ...styles.modal, maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>تعيين VIP لمستخدم</h3>
                <button style={styles.closeBtn} onClick={() => setShowAssignModal(false)}><FiX /></button>
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}

              {/* ── User search ── */}
              <div style={styles.formGroup}>
                <label style={styles.label}>البحث عن مستخدم</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="اسم المستخدم أو الإيميل"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                  />
                  <button style={styles.saveBtn} onClick={handleSearchUser}>
                    <FiUser size={14} /> بحث
                  </button>
                </div>
              </div>

              {/* ── Dropdown search results ── */}
              {userSearchResults.length > 0 && (
                <div style={{ ...styles.userList, maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                  {userSearchResults.map((u) => {
                    const isSelected = assignData.userId === u._id;
                    return (
                      <div
                        key={u._id}
                        style={{
                          ...styles.userItem,
                          backgroundColor: isSelected ? "#6366f115" : "transparent",
                          borderRight: isSelected ? "3px solid #6366f1" : "3px solid transparent",
                        }}
                        onClick={() => setAssignData({ ...assignData, userId: u._id, username: u.username, userImage: u.profileImage || u.avatar || "" })}
                      >
                        <img
                          src={u.profileImage || u.avatar || "https://via.placeholder.com/36"}
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{u.username}</div>
                          {u.email && <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div>}
                        </div>
                        {u.vipLevel > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", backgroundColor: "#fef9c3", borderRadius: 6, padding: "2px 8px" }}>
                            VIP {u.vipLevel}
                          </span>
                        )}
                        {isSelected && <FiCheck color="#6366f1" size={16} />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Selected user chip ── */}
              {assignData.userId && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                  {assignData.userImage && (
                    <img src={assignData.userImage} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                  )}
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>المستخدم المحدد</div>
                    <div style={{ fontWeight: 700, color: "#16a34a", fontSize: 15 }}>{assignData.username}</div>
                  </div>
                  <button
                    onClick={() => setAssignData({ userId: "", username: "", vipLevel: assignData.vipLevel, userImage: "" })}
                    style={{ marginRight: "auto", background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18 }}
                  >×</button>
                </div>
              )}

              {/* ── Level select (only admin-created levels) ── */}
              <div style={styles.formGroup}>
                <label style={styles.label}>مستوى VIP</label>
                {levels.length === 0 ? (
                  <div style={{ color: "#ef4444", fontSize: 13 }}>لا توجد مستويات. أضف مستويات أولاً.</div>
                ) : (
                  <select
                    style={styles.input}
                    value={assignData.vipLevel}
                    onChange={(e) => setAssignData({ ...assignData, vipLevel: +e.target.value })}
                  >
                    {levels
                      .filter((l) => l.isActive)
                      .sort((a, b) => a.level - b.level)
                      .map((l) => (
                        <option key={l.level} value={l.level}>
                          VIP {l.level}{l.nameAr ? ` — ${l.nameAr}` : ""}{l.name ? ` (${l.name})` : ""}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* ── Preview section ── */}
              {selLevel && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ ...styles.label, marginBottom: 10 }}>🎨 معاينة المستوى</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                    {/* Comment bubble preview */}
                    <div style={{ backgroundColor: "#0f0f1a", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>💬 شكل التعليق في البث</div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: lvlColor + "33", border: `2px solid ${lvlColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {assignData.userImage
                            ? <img src={assignData.userImage} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} alt="" />
                            : <span style={{ fontSize: 13, color: lvlColor, fontWeight: 700 }}>{(assignData.username || "م")[0].toUpperCase()}</span>
                          }
                        </div>
                        <div style={{
                          ...getBubbleShapeStyle(bubbleShape),
                          border: `${borderWidth}px solid ${lvlColor}`,
                          backgroundColor: "rgba(8,8,20,0.86)",
                          padding: "8px 12px",
                          maxWidth: "75%",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: lvlColor }}>
                              {assignData.username || "اسم المستخدم"}
                            </span>
                            <span style={{ backgroundColor: lvlColor, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 8, padding: "1px 6px" }}>
                              VIP{selLevel.level}
                            </span>
                          </div>
                          <span style={{ color: "#fff", fontSize: 12 }}>هذا شكل التعليق في البث 🎉</span>
                        </div>
                      </div>
                    </div>

                    {/* Join animation preview */}
                    <div style={{ backgroundColor: "#0f0f1a", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>🚪 رسالة الانضمام</div>
                      <div style={{ backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: lvlColor + "33", border: `2px solid ${lvlColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: lvlColor, fontWeight: 700 }}>{(assignData.username || "م")[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <span style={{ color: lvlColor, fontWeight: 700, fontSize: 12 }}>{assignData.username || "المستخدم"}</span>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>
                            {" "}{selLevel.specialJoinText || "انضم إلى الغرفة"}
                          </span>
                        </div>
                        <span style={{ backgroundColor: lvlColor, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 8, padding: "1px 6px", marginright: "auto" }}>
                          VIP{selLevel.level}
                        </span>
                      </div>
                      {selLevel.joinAnimationLottieUrl && (
                        <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>✅ يملك انيميشن دخول مخصص</div>
                      )}
                      {selLevel.joinSoundUrl && (
                        <div style={{ fontSize: 11, color: "#22c55e", marginTop: 2 }}>✅ يملك صوت دخول مخصص</div>
                      )}
                    </div>

                    {/* Badge & icon */}
                    <div style={{ backgroundColor: "#0f0f1a", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>🏅 الأيقونة والشارة</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {selLevel.imageUrl ? (
                          <img src={selLevel.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10, border: `2px solid ${lvlColor}` }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: lvlColor + "22", border: `2px solid ${lvlColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 22 }}>⭐</span>
                          </div>
                        )}
                        <div>
                          <div style={{ color: lvlColor, fontWeight: 700, fontSize: 14 }}>VIP {selLevel.level}</div>
                          <div style={{ color: "#e2e8f0", fontSize: 12 }}>{selLevel.nameAr}</div>
                          {selLevel.name && <div style={{ color: "#64748b", fontSize: 11 }}>{selLevel.name}</div>}
                          <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 2 }}>💎 {selLevel.price} عملة</div>
                        </div>
                      </div>
                      {selLevel.badgeLottieUrl && (
                        <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>✅ شارة Lottie متحركة</div>
                      )}
                    </div>

                    {/* Profile frame & benefits */}
                    <div style={{ backgroundColor: "#0f0f1a", borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>🖼 الإطار والمزايا</div>
                      {selLevel.profileFrameLottieUrl ? (
                        <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 4 }}>✅ إطار صورة شخصية متحرك</div>
                      ) : (
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>— لا إطار صورة</div>
                      )}
                      {selLevel.commentFrameLottieUrl ? (
                        <div style={{ fontSize: 12, color: "#22c55e", marginBottom: 4 }}>✅ إطار تعليق متحرك</div>
                      ) : null}
                      {Array.isArray(selLevel.benefits) && selLevel.benefits.length > 0 ? (
                        <div style={{ marginTop: 6 }}>
                          {selLevel.benefits.map((b, i) => (
                            <div key={i} style={{ fontSize: 11, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                              <span style={{ color: lvlColor }}>•</span> {b.titleAr}
                              <span style={{ color: "#64748b", fontSize: 10 }}>({b.type})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "#64748b" }}>— لا مزايا مضافة</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.modalFooter}>
                <button style={styles.cancelBtn} onClick={() => setShowAssignModal(false)}>إلغاء</button>
                <button
                  style={{ ...styles.saveBtn, opacity: (saving || !assignData.userId) ? 0.6 : 1 }}
                  onClick={handleAssign}
                  disabled={saving || !assignData.userId}
                >
                  {saving ? "جاري التعيين..." : "تعيين VIP"}
                </button>
              </div>
            </div>
          </div>
          );
        })()}
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
  seedBtn: { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", backgroundColor: "#10b981", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  loading: { textAlign: "center", padding: 60, color: "#64748b", fontSize: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 16, padding: 16, border: "2px solid", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" },
  cardBadge: { color: "#fff", fontWeight: 700, fontSize: 13, borderRadius: 20, padding: "4px 12px" },
  cardImg: { width: 56, height: 56, objectFit: "cover", borderRadius: 8 },
  cardName: { fontWeight: 700, fontSize: 15, color: "#1e293b" },
  cardNameEn: { fontSize: 12, color: "#64748b" },
  cardPrice: { fontSize: 14, fontWeight: 600, color: "#6366f1" },
  statusBadge: { fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "2px 10px" },
  cardPreviewWrap: { width: "100%", marginTop: 2 },
  cardPreviewBubble: {
    backgroundColor: "rgba(8,8,20,0.86)",
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
    padding: "6px 8px",
  },
  cardActions: { display: "flex", gap: 8, marginTop: 4 },
  editBtn: { padding: "6px 10px", backgroundColor: "#e0e7ff", color: "#6366f1", border: "none", borderRadius: 8, cursor: "pointer" },
  deleteBtn: { padding: "6px 10px", backgroundColor: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 32, width: "95%", maxWidth: 860, maxHeight: "92vh", overflowY: "auto", direction: "rtl" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" },
  saveBtn: { padding: "10px 20px", backgroundColor: "#6366f1", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 },
  cancelBtn: { padding: "10px 20px", backgroundColor: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  errorBox: { backgroundColor: "#fee2e2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  previewWrap: { backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 },
  previewBubble: { backgroundColor: "rgba(8,8,20,0.86)", padding: "10px 12px", color: "#fff" },
  previewHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  previewUsername: { fontSize: 13, fontWeight: 700 },
  previewChip: { color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 10, padding: "2px 7px", display: "inline-block" },
  previewMessage: { color: "#fff", fontSize: 13, lineHeight: "18px" },
  uploadZone: { border: "2px dashed #cbd5e1", borderRadius: 10, padding: 20, textAlign: "center", cursor: "pointer", backgroundColor: "#f8fafc", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" },
  imagePreview: { width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: "2px solid #e2e8f0" },
  removeImgBtn: { position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: 11, backgroundColor: "#ef4444", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  userList: { border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  userItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" },
  selectedUser: { backgroundColor: "#f0fdf4", color: "#16a34a", padding: "8px 12px", borderRadius: 8, fontSize: 14, marginBottom: 12 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
};

export default VipManagement;
