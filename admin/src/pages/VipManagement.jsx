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
  { value: "badge",  label: "شارة (Badge)",           hint: "تظهر كأيقونة صغيرة بجانب اسم المستخدم في شبكة المقاعد والتعليقات داخل البث المباشر.", icon: "🏅" },
  { value: "frame",  label: "إطار صورة (Frame)",      hint: "يحيط بالصورة الشخصية للمضيف في البث المباشر وفي الدردشة.", icon: "👤" },
  { value: "chat",   label: "فقاعة دردشة (Chat)",    hint: "يُطبَّق على فقاعة التعليق عند الكتابة في البث المباشر.", icon: "💬" },
  { value: "points", label: "نقاط (Points)",          hint: "نقاط إضافية تُضاف تلقائياً عند الترقية — تظهر في صفحة المستوى VIP.", icon: "⭐" },
  { value: "medal",  label: "وسام (Medal)",           hint: "وسام يظهر في صفحة الملف الشخصي ضمن قائمة مزايا مستوى VIP.", icon: "🥇" },
  { value: "entry",  label: "انيميشن دخول (Entry)",  hint: "أنيميشن يُشغَّل عند دخول المستخدم إلى غرفة بث مباشر.", icon: "✨" },
  { value: "other",  label: "أخرى",                  hint: "ميزة عامة تظهر فقط في قائمة مزايا صفحة مستوى VIP.", icon: "🎁" },
];

const defaultBenefitForm = {
  titleAr: "", title: "", descriptionAr: "", description: "",
  type: "other", imageUrl: "", imageFile: null,
  lottieUrl: "", lottieFile: null, isLocked: false, isVisible: true, sortOrder: 0,
  // Frame/chat specific
  frameDisplayType: "image", // "image" | "designed"
  profileFrameBorderColor: "",
  profileFrameBorderWidth: 2,
  // Chat / comment frame colours (type=chat only)
  commentFrameBgColor: "",
  commentBubbleBgColor: "",
  commentTextColor: "",
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
  commentFrameBgColor: "rgba(0,0,0,0.5)",
  commentBubbleBgColor: "",
  profileFrameLottieUrl: "", profileFrameLottieFile: null,
  joinAnimationLottieUrl: "", joinAnimationLottieFile: null,
  joinSoundUrl: "", joinSoundFile: null,
  specialJoinText: "",
  benefits: [],
  features: {
    animatedCommentFrame: true,
    coloredUsername: true,
    specialBadge: true,
    specialJoinAnimation: true,
  },
  customFeatures: [],
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

const isLevelActiveForAssign = (level) => (
  level?.isActive === true ||
  level?.isActive === 1 ||
  level?.isActive === "1" ||
  level?.isActive === "true"
);

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
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [hasSearchedUser, setHasSearchedUser] = useState(false);
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
  const [activeModalTab, setActiveModalTab] = useState("basic");
  const [benefitImgUploading, setBenefitImgUploading] = useState(false);
  const [benefitImgUploaded, setBenefitImgUploaded] = useState(false);
  const [benefitLottieUploading, setBenefitLottieUploading] = useState(false);
  const [benefitLottieUploaded, setBenefitLottieUploaded] = useState(false);

  const fileInputRef = useRef(null);
  const badgeLottieRef = useRef(null);
  const commentFrameLottieRef = useRef(null);
  const profileFrameLottieRef = useRef(null);
  const joinAnimationLottieRef = useRef(null);
  const joinSoundRef = useRef(null);
  const benefitImgRef = useRef(null);
  const benefitLottieRef = useRef(null);

  const UPLOAD_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/admin/upload`;

  // Upload any file through the backend (backend handles Cloudinary signing)
  const uploadFileViaBackend = async (file, folder) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Upload failed");
    return data.url;
  };

  const uploadToCloudinary = (file) => uploadFileViaBackend(file, "tikbook/vip");
  const uploadLottieToCloudinary = (file) => uploadFileViaBackend(file, "tikbook/vip/lottie");
  const uploadSoundToCloudinary = (file) => uploadFileViaBackend(file, "tikbook/vip/sounds");

  // ── Benefit sub-form helpers ────────────────────────────────────────────────
  const openAddBenefit = () => {
    setEditingBenefitIdx(null);
    setBenefitForm({ ...defaultBenefitForm });
    setBenefitImgPreview(null);
    setBenefitLottieName("");
    setBenefitImgUploading(false);
    setBenefitImgUploaded(false);
    setBenefitLottieUploading(false);
    setBenefitLottieUploaded(false);
    setShowBenefitForm(true);
  };

  const openEditBenefit = (idx) => {
    const b = form.benefits[idx];
    setEditingBenefitIdx(idx);
    const inferredDisplayType = b.frameDisplayType || ((b.imageUrl || b.lottieUrl) ? "image" : "designed");
    setBenefitForm({
      ...defaultBenefitForm, ...b,
      imageFile: null, lottieFile: null,
      frameDisplayType: inferredDisplayType,
      isVisible: b.isVisible !== false, // default true
      // Pre-populate chat colours from main form if not stored in benefit
      commentFrameBgColor: b.commentFrameBgColor || (b.type === "chat" ? (form.commentFrameBgColor || "") : ""),
      commentBubbleBgColor: b.commentBubbleBgColor || (b.type === "chat" ? (form.commentBubbleBgColor || "") : ""),
      commentTextColor: b.commentTextColor || (b.type === "chat" ? (form.commentTextColor || "") : ""),
    });
    setBenefitImgPreview(b.imageUrl || null);
    setBenefitLottieName(b.lottieUrl ? "(ملف محفوظ)" : "");
    setBenefitImgUploading(false);
    setBenefitImgUploaded(!!b.imageUrl);
    setBenefitLottieUploading(false);
    setBenefitLottieUploaded(!!b.lottieUrl);
    setShowBenefitForm(true);
  };

  const saveBenefit = async () => {
    if (!benefitForm.titleAr) { setError("عنوان الميزة مطلوب"); return; }
    // Enforce max 1 per singleton type
    const singletonTypes = ["frame", "chat"];
    if (singletonTypes.includes(benefitForm.type)) {
      const dupIdx = form.benefits.findIndex((b, i) => b.type === benefitForm.type && i !== editingBenefitIdx);
      if (dupIdx !== -1) {
        setError(`يمكن إضافة "${BENEFIT_TYPES.find(t => t.value === benefitForm.type)?.label}" مرة واحدة فقط لكل مستوى`);
        return;
      }
    }
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
      const newForm = { ...form, benefits: updated };
      // Sync frame/badge URLs back to top-level for mobile app
      if (saved.type === "chat") {
        newForm.commentFrameLottieUrl = saved.frameDisplayType === "image" ? (saved.imageUrl || saved.lottieUrl || "") : "";
        if (saved.commentFrameBgColor !== undefined) newForm.commentFrameBgColor = saved.commentFrameBgColor;
        if (saved.commentBubbleBgColor !== undefined) newForm.commentBubbleBgColor = saved.commentBubbleBgColor;
        if (saved.commentTextColor !== undefined) newForm.commentTextColor = saved.commentTextColor;
      } else if (saved.type === "frame") {
        newForm.profileFrameLottieUrl = saved.frameDisplayType === "image" ? (saved.imageUrl || saved.lottieUrl || "") : "";
      } else if (saved.type === "badge") {
        newForm.imageUrl = saved.imageUrl || saved.lottieUrl || "";
      }
      setForm(newForm);
      setShowBenefitForm(false);
      setError("");
    } catch (e) {
      setError(e.message || "فشل رفع ملفات الميزة");
    } finally {
      setUploadingBenefit(false);
    }
  };

  const handleBenefitImgUpload = async () => {
    if (!benefitForm.imageFile) return;
    setBenefitImgUploading(true);
    setError("");
    try {
      const url = await uploadToCloudinary(benefitForm.imageFile);
      setBenefitForm(prev => ({ ...prev, imageUrl: url, imageFile: null }));
      setBenefitImgPreview(url);
      setBenefitImgUploaded(true);
    } catch (e) {
      setError(e.message || "فشل رفع الصورة");
    } finally {
      setBenefitImgUploading(false);
    }
  };

  const handleBenefitLottieUpload = async () => {
    if (!benefitForm.lottieFile) return;
    setBenefitLottieUploading(true);
    setError("");
    try {
      const url = await uploadLottieToCloudinary(benefitForm.lottieFile);
      setBenefitForm(prev => ({ ...prev, lottieUrl: url, lottieFile: null }));
      setBenefitLottieUploaded(true);
    } catch (e) {
      setError(e.message || "فشل رفع الانيميشن");
    } finally {
      setBenefitLottieUploading(false);
    }
  };

  const deleteBenefit = (idx) => {
    const b = form.benefits[idx];
    const updated = form.benefits.filter((_, i) => i !== idx);
    const newForm = { ...form, benefits: updated };
    if (b?.type === "chat") newForm.commentFrameLottieUrl = "";
    if (b?.type === "frame") newForm.profileFrameLottieUrl = "";
    setForm(newForm);
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
    setActiveModalTab("basic");
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
      commentFrameBgColor: lvl.commentFrameBgColor || "rgba(0,0,0,0.5)",
      commentBubbleBgColor: lvl.commentBubbleBgColor || "",
      profileFrameLottieUrl: lvl.profileFrameLottieUrl || "", profileFrameLottieFile: null,
      joinAnimationLottieUrl: lvl.joinAnimationLottieUrl || "", joinAnimationLottieFile: null,
      joinSoundUrl: lvl.joinSoundUrl || "", joinSoundFile: null,
      specialJoinText: lvl.specialJoinText || "",
    benefits: Array.isArray(lvl.benefits) ? (() => {
        // Deduplicate: for singleton types (frame, chat) keep only the last occurrence
        const singletonTypes = ["frame", "chat"];
        const seen = {};
        const deduped = [];
        for (let i = lvl.benefits.length - 1; i >= 0; i--) {
          const b = lvl.benefits[i];
          if (singletonTypes.includes(b.type)) {
            if (!seen[b.type]) { seen[b.type] = true; deduped.unshift(b); }
          } else {
            deduped.unshift(b);
          }
        }
        // Migrate top-level frame URLs into benefits (if not already there)
        if (lvl.commentFrameLottieUrl && !deduped.some(b => b.type === "chat")) {
          deduped.push({ titleAr: "إطار التعليق", title: "Comment Frame", descriptionAr: "", description: "", type: "chat", imageUrl: lvl.commentFrameLottieUrl, lottieUrl: "", isLocked: false, sortOrder: 0, frameDisplayType: "image", profileFrameBorderColor: "", profileFrameBorderWidth: 2 });
        }
        if (lvl.profileFrameLottieUrl && !deduped.some(b => b.type === "frame")) {
          deduped.push({ titleAr: "إطار الصورة الشخصية", title: "Profile Frame", descriptionAr: "", description: "", type: "frame", imageUrl: lvl.profileFrameLottieUrl, lottieUrl: "", isLocked: false, sortOrder: 0, frameDisplayType: "image", profileFrameBorderColor: "", profileFrameBorderWidth: 2 });
        }
        return deduped;
      })() : [],
      features: {
        animatedCommentFrame: lvl.features?.animatedCommentFrame !== false,
        coloredUsername: lvl.features?.coloredUsername !== false,
        specialBadge: lvl.features?.specialBadge !== false,
        specialJoinAnimation: lvl.features?.specialJoinAnimation !== false,
      },
      isActive: lvl.isActive,
      sortOrder: lvl.sortOrder || 0,
      customFeatures: Array.isArray(lvl.customFeatures) ? lvl.customFeatures : [],
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
    setActiveModalTab("basic");
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
        commentFrameBgColor: form.commentFrameBgColor ?? "",
        commentBubbleBgColor: form.commentBubbleBgColor ?? "",
        profileFrameLottieUrl: finalProfileFrameLottieUrl,
        joinAnimationLottieUrl: finalJoinAnimationLottieUrl,
        joinSoundUrl: finalJoinSoundUrl,
        features: {
          animatedCommentFrame: !!form.features?.animatedCommentFrame,
          coloredUsername: !!form.features?.coloredUsername,
          specialBadge: !!form.features?.specialBadge,
          specialJoinAnimation: !!form.features?.specialJoinAnimation,
        },
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
    const query = searchQuery.trim();
    if (!query) {
      setUserSearchResults([]);
      setHasSearchedUser(false);
      return;
    }
    setSearchingUsers(true);
    setHasSearchedUser(true);
    setError("");
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`, authHeader);
      const users = Array.isArray(res.data?.users)
        ? res.data.users
        : (Array.isArray(res.data) ? res.data : []);
      setUserSearchResults(users);
    } catch (e) {
      setUserSearchResults([]);
      setError(e.response?.data?.message || "فشل البحث عن المستخدم");
    } finally {
      setSearchingUsers(false);
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
              const firstLevel = levels.filter(isLevelActiveForAssign).sort((a,b) => a.level - b.level)[0];
              setAssignData({ userId: "", username: "", vipLevel: firstLevel?.level || 1, userImage: "" });
              setUserSearchResults([]);
              setSearchQuery("");
              setHasSearchedUser(false);
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

              {/* ── Tab Navigation ── */}
              <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: 20, overflowX: "auto" }}>
                {[
                  { id: "basic",      label: "البيانات الأساسية", icon: "📋" },
                  { id: "properties", label: "الخصائص",           icon: "⚙️" },
                  { id: "benefits",   label: "المزايا",            icon: "🎁" },
                  { id: "gifts",      label: "الهدايا",            icon: "🎀" },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveModalTab(tab.id)} style={{
                    flex: "0 0 auto", padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: 700,
                    fontSize: 13, borderBottom: activeModalTab === tab.id ? "3px solid #6366f1" : "3px solid transparent",
                    marginBottom: -2, background: activeModalTab === tab.id ? "#f5f3ff" : "transparent",
                    color: activeModalTab === tab.id ? "#6366f1" : "#64748b", transition: "all .15s", whiteSpace: "nowrap",
                  }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* ════════════════════════════════════════════════════════
                  TAB: البيانات الأساسية
                  ════════════════════════════════════════════════════════ */}
              {activeModalTab === "basic" && (<>
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

              {/* ── Sort order + Active (basic tab footer) ── */}
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
              </>)}

              {/* ════════════════════════════════════════════════════════
                  TAB: الخصائص
                  ════════════════════════════════════════════════════════ */}
              {activeModalTab === "properties" && (<>
              Comment bubble appearance
              {/* <div style={{ ...styles.formGroup, border: "1px solid #e0e7ff", borderRadius: 12, padding: 16, background: "#f8faff", marginBottom: 16 }}>
                <label style={{ ...styles.label, marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#3730a3" }}>💬 شكل فقاعة التعليق (وضع التصميم)</label>
                <div style={styles.twoCol}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>شكل الفقاعة</label>
                    <select style={styles.input} value={form.commentBubbleShape}
                      onChange={(e) => setForm({ ...form, commentBubbleShape: e.target.value })}>
                      <option value="classic">Classic (كلاسيكي)</option>
                      <option value="rounded">Rounded (مدوّر)</option>
                      <option value="square">Square (مربع)</option>
                      <option value="pill">Pill (بيضاوي)</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>سماكة الإطار (px)</label>
                    <input style={styles.input} type="number" min="0" max="8" step="0.5"
                      value={form.commentBorderWidth}
                      onChange={(e) => setForm({ ...form, commentBorderWidth: +e.target.value })} />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>لون نص التعليق</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={form.commentTextColor || "#FFFFFF"}
                      onChange={(e) => setForm({ ...form, commentTextColor: e.target.value })}
                      style={{ width: 40, height: 36, border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                    <input style={{ ...styles.input, flex: 1 }} value={form.commentTextColor} placeholder="#FFFFFF (افتراضي أبيض)"
                      onChange={(e) => setForm({ ...form, commentTextColor: e.target.value })} />
                    {form.commentTextColor && <button style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 11 }} onClick={() => setForm({ ...form, commentTextColor: "" })}>✕</button>}
                  </div>
                </div>
                <div style={{ marginTop: 10, background: "#0f0f1a", borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>معاينة الفقاعة</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: (form.color||"#FFD700")+"33", border: `2px solid ${form.color||"#FFD700"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 11, color: form.color||"#FFD700", fontWeight: 700 }}>م</span>
                    </div>
                    <div style={{ ...getBubbleShapeStyle(form.commentBubbleShape), border: `${normalizeBorderWidth(form.commentBorderWidth)}px solid ${form.color||"#FFD700"}`, background: "rgba(8,8,20,0.86)", padding: "7px 12px" }}>
                      <div style={{ color: form.color||"#FFD700", fontWeight: 700, fontSize: 11, marginBottom: 2 }}>VIP{form.level} مستخدم</div>
                      <div style={{ color: form.commentTextColor||"#fff", fontSize: 12 }}>شكل التعليق في البث ✨</div>
                    </div>
                  </div>
                </div>
              </div> */}

              {/* Feature toggles */}
              <div style={{ ...styles.formGroup, border: "1px solid #e0e7ff", borderRadius: 12, padding: 16, background: "#f8faff", marginBottom: 16 }}>
                <label style={{ ...styles.label, marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#3730a3" }}>✨ الخصائص الافتراضية</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { key: "animatedCommentFrame", label: "إطار تعليق متحرك",        icon: "💬" },
                    { key: "coloredUsername",      label: "اسم ملون في التعليقات",  icon: "🎨" },
                    { key: "specialBadge",          label: "شارة حصرية",              icon: "🏅" },
                    { key: "specialJoinAnimation", label: "انيميشن خاص عند الدخول", icon: "✨" },
                  ].map((f) => {
                    const enabled = !!form.features?.[f.key];
                    return (
                      <div key={f.key}
                        onClick={() => setForm({ ...form, features: { ...form.features, [f.key]: !enabled } })}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer", border: `2px solid ${enabled ? "#6366f1" : "#e2e8f0"}`, background: enabled ? "#6366f108" : "#fff", userSelect: "none", transition: "all .15s" }}>
                        <span style={{ fontSize: 18 }}>{f.icon}</span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: enabled ? "#3730a3" : "#94a3b8" }}>{f.label}</span>
                        <div style={{ width: 38, height: 22, borderRadius: 11, background: enabled ? "#6366f1" : "#e2e8f0", display: "flex", alignItems: "center", padding: "0 3px", justifyContent: enabled ? "flex-end" : "flex-start", transition: "all .15s" }}>
                          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom features editor */}
              <div style={{ ...styles.formGroup, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ ...styles.label, marginBottom: 0, fontWeight: 700, color: "#374151" }}>⚙️ خصائص مخصصة</label>
                  <button style={{ ...styles.saveBtn, padding: "6px 12px", fontSize: 12 }}
                    onClick={() => setForm({ ...form, customFeatures: [...(form.customFeatures||[]), { titleAr: "", title: "", icon: "🎁", isVisible: true, sortOrder: (form.customFeatures||[]).length }] })}>
                    <FiPlus size={12} /> إضافة خاصية
                  </button>
                </div>
                {(!form.customFeatures || form.customFeatures.length === 0) && (
                  <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>لا توجد خصائص مخصصة بعد — اضغط "إضافة خاصية"</div>
                )}
                {(form.customFeatures||[]).map((cf, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr auto auto auto", gap: 6, alignItems: "center", marginBottom: 8, padding: "8px 10px", background: cf.isVisible ? "#fff" : "#f8f8f8", borderRadius: 8, border: "1px solid #e2e8f0", opacity: cf.isVisible ? 1 : 0.6 }}>
                    <input style={{ ...styles.input, textAlign: "center", fontSize: 16, padding: "6px 0" }} value={cf.icon}
                      onChange={(e) => { const u=[...(form.customFeatures||[])]; u[idx]={...cf,icon:e.target.value}; setForm({...form,customFeatures:u}); }} placeholder="🎁" />
                    <input style={{ ...styles.input, fontSize: 12 }} value={cf.titleAr}
                      onChange={(e) => { const u=[...(form.customFeatures||[])]; u[idx]={...cf,titleAr:e.target.value}; setForm({...form,customFeatures:u}); }} placeholder="الاسم بالعربي" />
                    <input style={{ ...styles.input, fontSize: 12 }} value={cf.title}
                      onChange={(e) => { const u=[...(form.customFeatures||[])]; u[idx]={...cf,title:e.target.value}; setForm({...form,customFeatures:u}); }} placeholder="English name" />
                    <button title={cf.isVisible ? "إخفاء" : "إظهار"}
                      style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: "5px 8px", fontSize: 14, color: cf.isVisible ? "#22c55e" : "#94a3b8" }}
                      onClick={() => { const u=[...(form.customFeatures||[])]; u[idx]={...cf,isVisible:!cf.isVisible}; setForm({...form,customFeatures:u}); }}>
                      {cf.isVisible ? "👁" : "🙈"}
                    </button>
                    <input style={{ ...styles.input, width: 50, fontSize: 12, textAlign: "center" }} type="number" value={cf.sortOrder} title="الترتيب"
                      onChange={(e) => { const u=[...(form.customFeatures||[])]; u[idx]={...cf,sortOrder:+e.target.value}; setForm({...form,customFeatures:u}); }} />
                    <button style={styles.deleteBtn} onClick={() => setForm({...form,customFeatures:(form.customFeatures||[]).filter((_,i)=>i!==idx)})}>
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              </>)}

              {/* ════════════════════════════════════════════════════════
                  TAB: المزايا
                  ════════════════════════════════════════════════════════ */}
              {activeModalTab === "benefits" && (
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
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: b.isVisible === false ? "#f8f8f8" : "#fff", borderRadius: 8, marginBottom: 6, border: `1px solid ${b.isVisible === false ? "#e2e8f0" : "#e2e8f0"}`, opacity: b.isVisible === false ? 0.6 : 1 }}>
                    {/* Benefit icon in list */}
                    {(b.type === "frame" || b.type === "chat") && b.frameDisplayType === "designed"
                      ? <div style={{ width: 36, height: 36, borderRadius: b.type === "frame" ? "50%" : 6, border: `${b.profileFrameBorderWidth || 2}px solid ${b.profileFrameBorderColor || form.color || "#FFD700"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 14 }}>{b.type === "frame" ? "👤" : "💬"}</span></div>
                      : b.imageUrl ? <img src={b.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      : b.lottieUrl ? <span style={{ fontSize: 22 }}>🎞</span>
                      : <span style={{ fontSize: 22 }}>{b.type === "frame" ? "👤" : b.type === "chat" ? "💬" : "🎁"}</span>
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{b.titleAr}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>
                        {BENEFIT_TYPES.find(t => t.value === b.type)?.label || b.type}
                        {(b.type === "frame" || b.type === "chat") && <span style={{ marginRight: 4, color: b.frameDisplayType === "image" ? "#6366f1" : "#059669", fontWeight: 600 }}> — {b.frameDisplayType === "image" ? "📷 صورة" : "🎨 تصميم"}</span>}
                      </div>
                    </div>
                    {b.isLocked && <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>🔒</span>}
                    {/* Visibility toggle */}
                    <button
                      title={b.isVisible === false ? "إظهار الميزة" : "إخفاء الميزة"}
                      style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", padding: "3px 7px", fontSize: 14, color: b.isVisible === false ? "#94a3b8" : "#22c55e" }}
                      onClick={() => {
                        const updated = [...form.benefits];
                        updated[idx] = { ...b, isVisible: b.isVisible === false ? true : false };
                        setForm({ ...form, benefits: updated });
                      }}
                    >{b.isVisible === false ? "🙈" : "👁"}</button>
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
                    {/* ── Common fields: title + type + description ── */}
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
                          {BENEFIT_TYPES.map(t => {
                            const isSingleton = ["frame", "chat"].includes(t.value);
                            const alreadyUsed = isSingleton && form.benefits.some((b, i) => b.type === t.value && i !== editingBenefitIdx);
                            return <option key={t.value} value={t.value} disabled={alreadyUsed}>{t.label}{alreadyUsed ? " (مضاف مسبقاً)" : ""}</option>;
                          })}
                        </select>
                        {(() => {
                          const typeInfo = BENEFIT_TYPES.find(t => t.value === benefitForm.type);
                          if (!typeInfo) return null;
                          return (
                            <div style={{ marginTop: 6, display: "flex", alignItems: "flex-start", gap: 6, background: "#f0f4ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "7px 10px" }}>
                              <span style={{ fontSize: 16, lineHeight: 1 }}>{typeInfo.icon}</span>
                              <span style={{ fontSize: 11, color: "#4338ca", lineHeight: 1.5, direction: "rtl" }}>{typeInfo.hint}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div style={{ gridColumn: "1/-1" }}>
                        <label style={styles.label}>الوصف العربي</label>
                        <input style={styles.input} value={benefitForm.descriptionAr}
                          onChange={(e) => setBenefitForm({ ...benefitForm, descriptionAr: e.target.value })} placeholder="وصف قصير للميزة" />
                      </div>
                    </div>

                    {/* ── Frame / Chat: اختيار نوع الإطار ── */}
                    {(benefitForm.type === "frame" || benefitForm.type === "chat") && (
                      <div style={{ marginTop: 12, border: "1px solid #c7d2fe", borderRadius: 10, padding: 14, background: "#fafbff" }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 10 }}>
                          {benefitForm.type === "frame" ? "👤 إطار الصورة الشخصية" : "💬 إطار التعليق"} — اختر نوع الإطار
                        </div>
                        {/* Mutual-exclusive toggle — only ONE option active at a time */}
                        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                          <button type="button"
                            onClick={() => setBenefitForm({ ...benefitForm, frameDisplayType: "image" })}
                            style={{
                              flex: 1, padding: "14px 8px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                              border: `2px solid ${benefitForm.frameDisplayType === "image" ? "#6366f1" : "#e2e8f0"}`,
                              background: benefitForm.frameDisplayType === "image" ? "linear-gradient(135deg,#f5f3ff,#ede9fe)" : "#fff",
                              color: benefitForm.frameDisplayType === "image" ? "#6366f1" : "#64748b",
                              cursor: "pointer", fontWeight: 700, fontSize: 13,
                              boxShadow: benefitForm.frameDisplayType === "image" ? "0 0 0 3px #6366f128" : "none", transition: "all .2s",
                            }}>
                            <span style={{ fontSize: 26 }}>📷</span>
                            <span>صورة / Lottie مخصصة</span>
                            {benefitForm.frameDisplayType === "image" && (
                              <span style={{ fontSize: 10, background: "#6366f1", color: "#fff", borderRadius: 10, padding: "2px 10px", marginTop: 2 }}>✓ مفعّل الآن</span>
                            )}
                          </button>
                          <button type="button"
                            onClick={() => setBenefitForm({ ...benefitForm, frameDisplayType: "designed" })}
                            style={{
                              flex: 1, padding: "14px 8px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                              border: `2px solid ${benefitForm.frameDisplayType === "designed" ? "#059669" : "#e2e8f0"}`,
                              background: benefitForm.frameDisplayType === "designed" ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "#fff",
                              color: benefitForm.frameDisplayType === "designed" ? "#059669" : "#64748b",
                              cursor: "pointer", fontWeight: 700, fontSize: 13,
                              boxShadow: benefitForm.frameDisplayType === "designed" ? "0 0 0 3px #05966928" : "none", transition: "all .2s",
                            }}>
                            <span style={{ fontSize: 26 }}>🎨</span>
                            <span>تصميم مخصص (حدود)</span>
                            {benefitForm.frameDisplayType === "designed" && (
                              <span style={{ fontSize: 10, background: "#059669", color: "#fff", borderRadius: 10, padding: "2px 10px", marginTop: 2 }}>✓ مفعّل الآن</span>
                            )}
                          </button>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", background: "#f1f5f9", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>
                          ⚠️ يظهر في التطبيق <strong>نوع واحد فقط</strong> — تفعيل أحدهما يُلغي الآخر تلقائياً
                        </div>

                        {/* Image mode */}
                        {benefitForm.frameDisplayType === "image" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div>
                              <label style={styles.label}>📷 صورة الإطار (PNG/WebP)</label>
                              <input ref={benefitImgRef} type="file" accept="image/*,.json,application/json" style={{ display: "none" }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  setBenefitForm({ ...benefitForm, imageFile: f, imageUrl: "" });
                                  setBenefitImgPreview(URL.createObjectURL(f));
                                  setBenefitImgUploaded(false);
                                }} />
                              <div style={{ ...styles.uploadZone, padding: 10, minHeight: 60 }} onClick={() => benefitImgRef.current?.click()}>
                                {benefitImgPreview
                                  ? <img src={benefitImgPreview} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "contain" }} />
                                  : <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}><FiImage size={18} /><br/>PNG/WebP</div>}
                              </div>
                              {benefitForm.imageFile && !benefitImgUploaded && (
                                <button style={{ ...styles.saveBtn, marginTop: 6, padding: "5px 10px", fontSize: 11, width: "100%", justifyContent: "center" }}
                                  onClick={(e) => { e.stopPropagation(); handleBenefitImgUpload(); }}
                                  disabled={benefitImgUploading}>
                                  {benefitImgUploading ? "جاري الرفع..." : <><FiUpload size={11} /> رفع</>}
                                </button>
                              )}
                              {benefitImgUploaded && <div style={{ marginTop: 4, fontSize: 11, color: "#22c55e", fontWeight: 600, textAlign: "center" }}>✅ تم الرفع</div>}
                            </div>
                            <div>
                              <label style={styles.label}>🎞 Lottie JSON</label>
                              <input ref={benefitLottieRef} type="file" accept=".json,application/json" style={{ display: "none" }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0]; if (!f) return;
                                  setBenefitForm({ ...benefitForm, lottieFile: f, lottieUrl: "" });
                                  setBenefitLottieName(f.name);
                                  setBenefitLottieUploaded(false);
                                }} />
                              <div style={{ ...styles.uploadZone, padding: 10, minHeight: 60 }} onClick={() => benefitLottieRef.current?.click()}>
                                {benefitLottieName
                                  ? <div style={{ fontSize: 11, color: "#6366f1", textAlign: "center", fontWeight: 600 }}>🎞 {benefitLottieName}</div>
                                  : <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}>🎞<br/>Lottie JSON</div>}
                              </div>
                              {benefitForm.lottieFile && !benefitLottieUploaded && (
                                <button style={{ ...styles.saveBtn, marginTop: 6, padding: "5px 10px", fontSize: 11, width: "100%", justifyContent: "center" }}
                                  onClick={(e) => { e.stopPropagation(); handleBenefitLottieUpload(); }}
                                  disabled={benefitLottieUploading}>
                                  {benefitLottieUploading ? "جاري الرفع..." : <><FiUpload size={11} /> رفع</>}
                                </button>
                              )}
                              {benefitLottieUploaded && <div style={{ marginTop: 4, fontSize: 11, color: "#22c55e", fontWeight: 600, textAlign: "center" }}>✅ تم الرفع</div>}
                            </div>
                          </div>
                        )}

                        {/* Designed mode — chat */}
                        {benefitForm.frameDisplayType === "designed" && benefitForm.type === "chat" && (
                          <div style={{ background: "#f0f4ff", borderRadius: 8, padding: 12, border: "1px solid #c7d2fe" }}>
                            <div style={{ fontSize: 12, color: "#4338ca", fontWeight: 700, marginBottom: 8 }}>يستخدم إعدادات فقاعة التعليق من تبويب الخصائص:</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <span style={{ fontSize: 12, background: "#e0e7ff", color: "#4338ca", borderRadius: 6, padding: "3px 10px" }}>شكل: {form.commentBubbleShape}</span>
                              <span style={{ fontSize: 12, background: "#e0e7ff", color: "#4338ca", borderRadius: 6, padding: "3px 10px" }}>سماكة: {form.commentBorderWidth}px</span>
                              <span style={{ fontSize: 12, borderRadius: 6, padding: "3px 10px", background: (form.color || "#FFD700") + "22", color: form.color || "#FFD700", fontWeight: 700 }}>لون: {form.color || "#FFD700"}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#6366f1", marginTop: 6 }}>💡 عدّل من تبويب "الخصائص"</div>
                          </div>
                        )}

                        {/* Chat color controls — shown for both image and designed modes */}
                        {benefitForm.type === "chat" && (
                          <div style={{ marginTop: 12, border: "1px solid #fde68a", borderRadius: 10, padding: 14, background: "#fffbeb" }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 10 }}>🎨 ألوان التعليق</div>

                            {/* Bubble bg color */}
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ ...styles.label, fontSize: 12, color: "#92400e" }}>لون خلفية فقاعة التعليق</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="color"
                                  value={(() => { const c = benefitForm.commentBubbleBgColor || "#000000"; if (c.startsWith("#")) return c; const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,"0")).join("") : "#000000"; })()}
                                  onChange={(e) => { const hex = e.target.value; const cur = benefitForm.commentBubbleBgColor || ""; const a = (cur.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/) || [])[1] || "0.45"; const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); setBenefitForm({ ...benefitForm, commentBubbleBgColor: `rgba(${r},${g},${b},${a})` }); }}
                                  style={{ width: 36, height: 30, border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
                                <input type="range" min="0" max="1" step="0.05"
                                  value={(benefitForm.commentBubbleBgColor || "").match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/)?.[1] || "0.45"}
                                  onChange={(e) => { const cur = benefitForm.commentBubbleBgColor || "rgba(100,0,180,0.45)"; const m = cur.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/); const rgb = m ? `${m[1]},${m[2]},${m[3]}` : "100,0,180"; setBenefitForm({ ...benefitForm, commentBubbleBgColor: `rgba(${rgb},${e.target.value})` }); }}
                                  style={{ width: 80 }} />
                                <input style={{ ...styles.input, flex: 1, fontSize: 11 }} value={benefitForm.commentBubbleBgColor} placeholder="rgba(100,0,180,0.45)"
                                  onChange={(e) => setBenefitForm({ ...benefitForm, commentBubbleBgColor: e.target.value })} />
                                {benefitForm.commentBubbleBgColor && <button style={{ padding: "3px 7px", borderRadius: 5, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 10, color: "#6b7280" }} onClick={() => setBenefitForm({ ...benefitForm, commentBubbleBgColor: "" })}>✕</button>}
                              </div>
                            </div>

                            {/* Frame bg color — only when image mode */}
                            {benefitForm.frameDisplayType === "image" && (
                              <div style={{ marginBottom: 10 }}>
                                <label style={{ ...styles.label, fontSize: 12, color: "#92400e" }}>لون خلفية النص داخل الإطار</label>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <input type="color"
                                    value={(() => { const c = benefitForm.commentFrameBgColor || "#000000"; if (c.startsWith("#")) return c; const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? "#" + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,"0")).join("") : "#000000"; })()}
                                    onChange={(e) => { const hex = e.target.value; const cur = benefitForm.commentFrameBgColor || ""; const a = (cur.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/) || [])[1] || "0.5"; const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); setBenefitForm({ ...benefitForm, commentFrameBgColor: `rgba(${r},${g},${b},${a})` }); }}
                                    style={{ width: 36, height: 30, border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
                                  <input type="range" min="0" max="1" step="0.05"
                                    value={(benefitForm.commentFrameBgColor || "").match(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/)?.[1] || "0.5"}
                                    onChange={(e) => { const cur = benefitForm.commentFrameBgColor || "rgba(0,0,0,0.5)"; const m = cur.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/); const rgb = m ? `${m[1]},${m[2]},${m[3]}` : "0,0,0"; setBenefitForm({ ...benefitForm, commentFrameBgColor: `rgba(${rgb},${e.target.value})` }); }}
                                    style={{ width: 80 }} />
                                  <input style={{ ...styles.input, flex: 1, fontSize: 11 }} value={benefitForm.commentFrameBgColor} placeholder="rgba(0,0,0,0.5)"
                                    onChange={(e) => setBenefitForm({ ...benefitForm, commentFrameBgColor: e.target.value })} />
                                  {benefitForm.commentFrameBgColor && <button style={{ padding: "3px 7px", borderRadius: 5, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 10, color: "#6b7280" }} onClick={() => setBenefitForm({ ...benefitForm, commentFrameBgColor: "" })}>✕</button>}
                                </div>
                              </div>
                            )}

                            {/* Text color */}
                            <div>
                              <label style={{ ...styles.label, fontSize: 12, color: "#92400e" }}>لون نص التعليق</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="color" value={benefitForm.commentTextColor || "#FFFFFF"}
                                  onChange={(e) => setBenefitForm({ ...benefitForm, commentTextColor: e.target.value })}
                                  style={{ width: 36, height: 30, border: "none", borderRadius: 6, cursor: "pointer", flexShrink: 0 }} />
                                <input style={{ ...styles.input, flex: 1, fontSize: 11 }} value={benefitForm.commentTextColor} placeholder="#FFFFFF (افتراضي أبيض)"
                                  onChange={(e) => setBenefitForm({ ...benefitForm, commentTextColor: e.target.value })} />
                                {benefitForm.commentTextColor && <button style={{ padding: "3px 7px", borderRadius: 5, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 10, color: "#6b7280" }} onClick={() => setBenefitForm({ ...benefitForm, commentTextColor: "" })}>✕</button>}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Designed mode — profile frame */}
                        {benefitForm.frameDisplayType === "designed" && benefitForm.type === "frame" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div>
                              <label style={styles.label}>🎨 لون الإطار</label>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input type="color" value={benefitForm.profileFrameBorderColor || form.color || "#FFD700"}
                                  onChange={(e) => setBenefitForm({ ...benefitForm, profileFrameBorderColor: e.target.value })}
                                  style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                                <input style={{ ...styles.input, flex: 1 }} value={benefitForm.profileFrameBorderColor || form.color || "#FFD700"}
                                  onChange={(e) => setBenefitForm({ ...benefitForm, profileFrameBorderColor: e.target.value })} />
                              </div>
                            </div>
                            <div>
                              <label style={styles.label}>📏 سماكة الإطار (px)</label>
                              <input style={styles.input} type="number" min="1" max="12" step="0.5"
                                value={benefitForm.profileFrameBorderWidth || 2}
                                onChange={(e) => setBenefitForm({ ...benefitForm, profileFrameBorderWidth: +e.target.value })} />
                            </div>
                          </div>
                        )}

                        {/* Live Preview */}
                        <div style={{ marginTop: 14, background: "#0f0f1a", borderRadius: 10, padding: 14 }}>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontWeight: 600 }}>
                            {benefitForm.type === "frame" ? "👤 معاينة إطار البروفايل" : "💬 معاينة إطار التعليق"}
                          </div>
                          {benefitForm.type === "frame" && (
                            <div style={{ display: "flex", justifyContent: "center" }}>
                              <div style={{ position: "relative", width: 90, height: 90 }}>
                                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 62, height: 62, borderRadius: "50%", background: "linear-gradient(135deg,#374151,#6b7280)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 28 }}>👤</span>
                                </div>
                                {benefitForm.frameDisplayType === "image" && (benefitImgPreview || benefitForm.imageUrl) && (
                                  <img src={benefitImgPreview || benefitForm.imageUrl} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
                                )}
                                {benefitForm.frameDisplayType === "designed" && (
                                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: "50%", border: `${benefitForm.profileFrameBorderWidth || 2}px solid ${benefitForm.profileFrameBorderColor || form.color || "#FFD700"}`, boxShadow: `0 0 14px ${benefitForm.profileFrameBorderColor || form.color || "#FFD700"}55` }} />
                                )}
                                {benefitForm.frameDisplayType === "image" && !benefitImgPreview && !benefitForm.imageUrl && (
                                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: "50%", border: "2px dashed #6366f144", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: 10, color: "#6366f1" }}>ارفع صورة</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {benefitForm.type === "chat" && (
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: (form.color || "#FFD700") + "33", border: `2px solid ${form.color || "#FFD700"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: form.color || "#FFD700", fontWeight: 700 }}>م</span>
                              </div>
                              <div style={{ position: "relative", maxWidth: "75%" }}>
                                {/* Content bubble rendered first, frame image on top */}
                                <div style={{
                                  ...getBubbleShapeStyle(benefitForm.commentBubbleShape || form.commentBubbleShape),
                                  border: benefitForm.frameDisplayType === "designed"
                                    ? `${normalizeBorderWidth(benefitForm.commentBorderWidth ?? form.commentBorderWidth)}px solid ${form.color || "#FFD700"}`
                                    : "1px solid rgba(255,255,255,0.08)",
                                  background: benefitForm.frameDisplayType === "image"
                                    ? (benefitForm.commentFrameBgColor || "rgba(0,0,0,0.75)")
                                    : (benefitForm.commentBubbleBgColor || (form.color ? `${form.color}22` : "rgba(100,0,180,0.45)")),
                                  padding: "8px 14px", position: "relative", zIndex: 2
                                }}>
                                  <div style={{ color: form.color || "#FFD700", fontWeight: 700, fontSize: 11, marginBottom: 2 }}>مستخدم VIP{form.level}</div>
                                  <div style={{ color: benefitForm.commentTextColor || form.commentTextColor || "#fff", fontSize: 12 }}>شكل التعليق في البث ✨</div>
                                </div>
                                {/* Frame image on top */}
                                {benefitForm.frameDisplayType === "image" && (benefitImgPreview || benefitForm.imageUrl) && (
                                  <img src={benefitImgPreview || benefitForm.imageUrl} alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", zIndex: 3, borderRadius: 8 }} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* isLocked + isVisible + sortOrder */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" id="bLocked" checked={benefitForm.isLocked}
                              onChange={(e) => setBenefitForm({ ...benefitForm, isLocked: e.target.checked })} />
                            <label htmlFor="bLocked" style={{ fontSize: 13, color: "#374151" }}>مقفل (يحتاج مستوى أعلى)</label>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" id="bVisible" checked={benefitForm.isVisible !== false}
                              onChange={(e) => setBenefitForm({ ...benefitForm, isVisible: e.target.checked })} />
                            <label htmlFor="bVisible" style={{ fontSize: 13, color: "#374151" }}>ظاهر للمستخدم</label>
                          </div>
                          <div>
                            <label style={styles.label}>الترتيب</label>
                            <input style={styles.input} type="number" value={benefitForm.sortOrder}
                              onChange={(e) => setBenefitForm({ ...benefitForm, sortOrder: +e.target.value })} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Generic benefit types ── */}
                    {benefitForm.type !== "frame" && benefitForm.type !== "chat" && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {/* Benefit image upload */}
                          <div>
                            <label style={styles.label}>📷 صورة الميزة</label>
                            <input ref={benefitImgRef} type="file" accept="image/*" style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0]; if (!f) return;
                                setBenefitForm({ ...benefitForm, imageFile: f, imageUrl: "" });
                                setBenefitImgPreview(URL.createObjectURL(f));
                                setBenefitImgUploaded(false);
                              }} />
                            <div style={{ ...styles.uploadZone, padding: 10, minHeight: 60 }} onClick={() => benefitImgRef.current?.click()}>
                              {benefitImgPreview
                                ? <img src={benefitImgPreview} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />
                                : <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}><FiImage size={18} /><br/>صورة</div>}
                            </div>
                            {benefitForm.imageFile && !benefitImgUploaded && (
                              <button style={{ ...styles.saveBtn, marginTop: 6, padding: "5px 10px", fontSize: 11, width: "100%", justifyContent: "center" }}
                                onClick={(e) => { e.stopPropagation(); handleBenefitImgUpload(); }}
                                disabled={benefitImgUploading}>
                                {benefitImgUploading ? "جاري الرفع..." : <><FiUpload size={11} /> رفع الصورة</>}
                              </button>
                            )}
                            {benefitImgUploaded && <div style={{ marginTop: 4, fontSize: 11, color: "#22c55e", fontWeight: 600, textAlign: "center" }}>✅ تم الرفع بنجاح</div>}
                          </div>
                          {/* Benefit lottie upload */}
                          <div>
                            <label style={styles.label}>🎞 انيميشن (Lottie JSON)</label>
                            <input ref={benefitLottieRef} type="file" accept=".json,application/json" style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0]; if (!f) return;
                                setBenefitForm({ ...benefitForm, lottieFile: f, lottieUrl: "" });
                                setBenefitLottieName(f.name);
                                setBenefitLottieUploaded(false);
                              }} />
                            <div style={{ ...styles.uploadZone, padding: 10, minHeight: 60 }} onClick={() => benefitLottieRef.current?.click()}>
                              {benefitLottieName
                                ? <div style={{ fontSize: 11, color: "#6366f1", textAlign: "center", fontWeight: 600 }}>🎞 {benefitLottieName}</div>
                                : <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}>🎞<br/>Lottie JSON</div>}
                            </div>
                            {benefitForm.lottieFile && !benefitLottieUploaded && (
                              <button style={{ ...styles.saveBtn, marginTop: 6, padding: "5px 10px", fontSize: 11, width: "100%", justifyContent: "center" }}
                                onClick={(e) => { e.stopPropagation(); handleBenefitLottieUpload(); }}
                                disabled={benefitLottieUploading}>
                                {benefitLottieUploading ? "جاري الرفع..." : <><FiUpload size={11} /> رفع الانيميشن</>}
                              </button>
                            )}
                            {benefitLottieUploaded && <div style={{ marginTop: 4, fontSize: 11, color: "#22c55e", fontWeight: 600, textAlign: "center" }}>✅ تم الرفع بنجاح</div>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" id="bLocked" checked={benefitForm.isLocked}
                              onChange={(e) => setBenefitForm({ ...benefitForm, isLocked: e.target.checked })} />
                            <label htmlFor="bLocked" style={{ fontSize: 13, color: "#374151" }}>مقفل (يحتاج مستوى أعلى)</label>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" id="bVisible2" checked={benefitForm.isVisible !== false}
                              onChange={(e) => setBenefitForm({ ...benefitForm, isVisible: e.target.checked })} />
                            <label htmlFor="bVisible2" style={{ fontSize: 13, color: "#374151" }}>ظاهر للمستخدم</label>
                          </div>
                          <div>
                            <label style={styles.label}>الترتيب</label>
                            <input style={styles.input} type="number" value={benefitForm.sortOrder}
                              onChange={(e) => setBenefitForm({ ...benefitForm, sortOrder: +e.target.value })} />
                          </div>
                        </div>
                        {/* Generic preview */}
                        {(benefitImgPreview || benefitForm.imageUrl) && (
                          <div style={{ marginTop: 10, background: "#0f0f1a", borderRadius: 10, padding: 14 }}>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>🖼 معاينة الميزة</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <img src={benefitImgPreview || benefitForm.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "contain", background: "#1a1a2e", border: `2px solid ${(form.color || "#FFD700")}33` }} />
                              <div>
                                <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 13 }}>{benefitForm.titleAr || "اسم الميزة"}</div>
                                {benefitForm.descriptionAr && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{benefitForm.descriptionAr}</div>}
                                <div style={{ color: form.color || "#FFD700", fontSize: 11, fontWeight: 600, marginTop: 2 }}>{BENEFIT_TYPES.find(t => t.value === benefitForm.type)?.label}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                      <button style={styles.cancelBtn} onClick={() => setShowBenefitForm(false)}>إلغاء</button>
                      <button style={styles.saveBtn} onClick={saveBenefit} disabled={uploadingBenefit}>
                        {uploadingBenefit ? "جاري الرفع..." : <><FiCheck size={12} /> حفظ الميزة</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* ════════════════════════════════════════════════════════
                  TAB: الهدايا
                  ════════════════════════════════════════════════════════ */}
              {activeModalTab === "gifts" && (
              <div style={{ ...styles.formGroup, border: "1px solid #fef3c7", borderRadius: 12, padding: 20, background: "#fffbeb" }}>
                <label style={{ ...styles.label, marginBottom: 16, fontSize: 14, fontWeight: 700, color: "#92400e" }}>🎀 إعدادات الهدايا والترقية التلقائية</label>
                <div style={styles.twoCol}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>🎁 حد الهدايا للترقية (عدد العملات)</label>
                    <input style={styles.input} type="number" min="0" value={form.giftThreshold}
                      onChange={(e) => setForm({ ...form, giftThreshold: +e.target.value })}
                      placeholder="0 = معطّل" />
                    <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
                      عند بلوغ هذا الرقم من إنفاق الهدايا يُرقَّى المستخدم تلقائياً. اترك 0 لتعطيل هذه الميزة.
                    </span>
                  </div>
                  <div style={styles.formGroup}>
                    {form.giftThreshold > 0 ? (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 16, marginTop: 22 }}>
                        <div style={{ fontSize: 13, color: "#16a34a", fontWeight: 700, marginBottom: 6 }}>✅ الترقية التلقائية مفعّلة</div>
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          يُرقَّى المستخدم عند إنفاق <strong style={{ color: "#16a34a" }}>{form.giftThreshold.toLocaleString()}</strong> عملة على الهدايا
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 16, marginTop: 22 }}>
                        <div style={{ fontSize: 13, color: "#c2410c", fontWeight: 700, marginBottom: 6 }}>⛔ الترقية التلقائية معطّلة</div>
                        <div style={{ fontSize: 12, color: "#374151" }}>أدخل رقماً أكبر من 0 لتفعيل الترقية بالهدايا</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

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
          const assignableLevels = levels
            .filter(isLevelActiveForAssign)
            .sort((a, b) => a.level - b.level);
          const selectedLevelExists = assignableLevels.some((l) => l.level === assignData.vipLevel);
          const selectedVipLevel = selectedLevelExists
            ? assignData.vipLevel
            : (assignableLevels[0]?.level || 1);
          const selLevel = assignableLevels.find((l) => l.level === selectedVipLevel) || null;
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
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHasSearchedUser(false);
                    }}
                    placeholder="اسم المستخدم أو الإيميل"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                  />
                  <button
                    style={{ ...styles.saveBtn, opacity: (searchingUsers || !searchQuery.trim()) ? 0.7 : 1 }}
                    onClick={handleSearchUser}
                    disabled={searchingUsers || !searchQuery.trim()}
                  >
                    <FiUser size={14} /> {searchingUsers ? "جاري البحث..." : "بحث"}
                  </button>
                </div>
              </div>

              {hasSearchedUser && !searchingUsers && userSearchResults.length === 0 && (
                <div style={{ marginBottom: 12, fontSize: 13, color: "#64748b" }}>
                  لا توجد نتائج مطابقة.
                </div>
              )}

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
                ) : assignableLevels.length === 0 ? (
                  <div style={{ color: "#ef4444", fontSize: 13 }}>لا توجد مستويات VIP مفعّلة للتعيين.</div>
                ) : (
                  <select
                    style={styles.input}
                    value={selectedVipLevel}
                    onChange={(e) => setAssignData({ ...assignData, vipLevel: +e.target.value })}
                  >
                    {assignableLevels.map((l) => (
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
