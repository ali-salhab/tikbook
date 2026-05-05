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
  joinDisplayDurationMs: 5000,
  joinVideoUrl: "", joinVideoFile: null, joinVideoPreviewUrl: null,
  joinCardFrameImageUrl: "", joinCardFrameImageFile: null,
  joinLayoutStyle: "card",
  joinEffectPreset: "none",
  joinConfigPendingReview: false,
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

const JOIN_LAYOUT_LABELS = {
  card: "بطاقة علوية (Card)",
  ticker: "شريط زمني / ماركيز (Ticker)",
  "video-fullscreen": "فيديو انضمام بملء الشاشة",
};

const JOIN_EFFECT_LABELS = {
  none: "بدون",
  glow: "توهج",
  pulse: "نبض",
  aurora: "أورورا",
  ring: "حلقة",
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
  const [joinVideoName, setJoinVideoName] = useState("");
  const [joinCardFrameName, setJoinCardFrameName] = useState("");
  const [joinCardFramePreviewUrl, setJoinCardFramePreviewUrl] = useState(null);
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
  const joinVideoRef = useRef(null);
  const joinCardFrameRef = useRef(null);
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

  useEffect(() => {
    if (form.joinCardFrameImageFile) {
      const objectUrl = URL.createObjectURL(form.joinCardFrameImageFile);
      setJoinCardFramePreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setJoinCardFramePreviewUrl(form.joinCardFrameImageUrl || null);
    return undefined;
  }, [form.joinCardFrameImageFile, form.joinCardFrameImageUrl]);

  const hasJoinVideo = Boolean(
    form.joinVideoFile || form.joinVideoPreviewUrl || form.joinVideoUrl,
  );
  // Product rule: when join video exists, it must render fullscreen.
  const effectiveJoinLayoutStyle = hasJoinVideo
    ? "video-fullscreen"
    : form.joinLayoutStyle;

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
    setJoinVideoName("");
    setJoinCardFrameName("");
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
      joinDisplayDurationMs: typeof lvl.joinDisplayDurationMs === "number" ? lvl.joinDisplayDurationMs : 5000,
      joinVideoUrl: lvl.joinVideoUrl || "", joinVideoFile: null, joinVideoPreviewUrl: lvl.joinVideoUrl || null,
      joinCardFrameImageUrl: lvl.joinCardFrameImageUrl || "", joinCardFrameImageFile: null,
      joinLayoutStyle:
        lvl.joinLayoutStyle === "ticker"
          ? "ticker"
          : lvl.joinLayoutStyle === "video-fullscreen"
            ? "video-fullscreen"
            : "card",
      joinEffectPreset: ["none", "glow", "pulse", "aurora", "ring"].includes(String(lvl.joinEffectPreset || "").toLowerCase())
        ? String(lvl.joinEffectPreset).toLowerCase()
        : "none",
      joinConfigPendingReview: lvl.joinConfigPendingReview === true,
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
    setJoinVideoName(lvl.joinVideoUrl ? "(فيديو محفوظ)" : "");
    setJoinCardFrameName(lvl.joinCardFrameImageUrl ? "(إطار محفوظ)" : "");
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
      let finalJoinVideoUrl = form.joinVideoUrl;
      if (form.joinVideoFile) finalJoinVideoUrl = await uploadToCloudinary(form.joinVideoFile);
      let finalJoinCardFrameUrl = form.joinCardFrameImageUrl;
      if (form.joinCardFrameImageFile) finalJoinCardFrameUrl = await uploadToCloudinary(form.joinCardFrameImageFile);
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
        joinDisplayDurationMs: Math.min(
          30000,
          Math.max(2000, Number(form.joinDisplayDurationMs) || 5000),
        ),
        joinVideoUrl: finalJoinVideoUrl || "",
        joinCardFrameImageUrl: finalJoinCardFrameUrl || "",
        joinLayoutStyle: ["ticker", "video-fullscreen"].includes(effectiveJoinLayoutStyle)
          ? effectiveJoinLayoutStyle
          : "card",
        joinEffectPreset: ["none", "glow", "pulse", "aurora", "ring"].includes(String(form.joinEffectPreset || "").toLowerCase())
          ? String(form.joinEffectPreset).toLowerCase()
          : "none",
        joinConfigPendingReview: !!form.joinConfigPendingReview,
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
      delete payload.joinVideoFile;
      delete payload.joinVideoPreviewUrl; // Remove preview URL from payload
      delete payload.joinCardFrameImageFile;
      if (editingLevel) {
        await api.put(`/vip/admin/levels/${editingLevel.level}`, payload, authHeader);
      } else {
        await api.post("/vip/admin/levels", payload, authHeader);
      }
      await fetchLevels();
      setShowModal(false);
      setEditingLevel(null);
      // Clean up any object URLs to prevent memory leaks
      if (form.joinVideoPreviewUrl && form.joinVideoFile) {
        URL.revokeObjectURL(form.joinVideoPreviewUrl);
      }
      
      setForm({ ...defaultForm });
      setImagePreview(null);
      setBadgeLottieName("");
      setCommentFrameLottieName("");
      setCommentFramePreview(null);
      setProfileFrameLottieName("");
      setProfileFramePreview(null);
      setJoinAnimationLottieName("");
      setJoinSoundName("");
      setJoinVideoName("");
      setJoinCardFrameName("");
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
      <style>{`
        @keyframes vip-admin-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={styles.heroEyebrow}>لوحة التحكم · VIP</div>
            <h2 style={styles.title}>⭐ إدارة المستويات</h2>
            <p style={styles.subtitle}>إدارة مستويات التطبيق وتعيينها للمستخدمين — مع تخصيص كامل لكل مستوى</p>
          </div>
          <div style={styles.headerActions}>
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
          <div style={styles.loading}>
            <div style={styles.loadingSpinner} aria-hidden />
            <span>جاري التحميل...</span>
          </div>
        ) : (
          <div style={styles.grid}>
            {levels.length === 0 && (
              <div style={styles.emptyGrid}>
                <div style={styles.emptyGridIcon}>⭐</div>
                <div style={styles.emptyGridTitle}>لا توجد مستويات بعد</div>
                <div style={styles.emptyGridHint}>اضغط &quot;بيانات تجريبية&quot; لإضافة مستويات افتراضية</div>
              </div>
            )}
            {levels.map((lvl) => {
              const color = lvl.color || VIP_COLORS[lvl.level] || "#FFD700";
              const frameBenefit = (lvl.benefits || []).find((b) => b.type === "frame");
              const chatBenefit  = (lvl.benefits || []).find((b) => b.type === "chat");
              const frameIsPng  = frameBenefit?.frameDisplayType === "image" && (frameBenefit?.imageUrl || lvl.profileFrameLottieUrl);
              const chatIsPng   = chatBenefit?.frameDisplayType  === "image" && (chatBenefit?.imageUrl  || lvl.commentFrameLottieUrl);
              const profileFrameUrl = frameBenefit?.imageUrl || lvl.profileFrameLottieUrl;
              const commentFrameUrl = chatBenefit?.imageUrl || lvl.commentFrameLottieUrl;
              return (
                <div key={lvl.level} style={{
                  ...styles.card,
                  borderColor: `${color}55`,
                  background: `linear-gradient(165deg, #232228 0%, #2d2a32 45%, #1c1b20 100%)`,
                  boxShadow: `
                    0 14px 40px rgba(0,0,0,0.38),
                    0 0 0 1px ${color}38,
                    inset 0 1px 0 rgba(255,255,255,0.06)
                  `,
                }}>
                  {/* ── Top ribbon with level number ── */}
                  <div style={{
                    ...styles.cardBadge,
                    background: `linear-gradient(135deg, ${color}ee, ${color}99)`,
                    boxShadow: `0 2px 14px ${color}44`,
                  }}>
                    ⭐ المستوى {lvl.level}
                  </div>

                  {/* ══ SECTION 1: أيقونة المستوى ══ */}
                  <div style={{ width: "100%", marginTop: 6 }}>
                    <div style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 700, textAlign: "center", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
                      أيقونة المستوى
                    </div>
                    {/* Level icon — clean, no frame overlay */}
                    <div style={{ position: "relative", width: 92, height: 92, margin: "0 auto", overflow: "visible" }}>
                      {lvl.imageUrl ? (
                        <img
                          src={lvl.imageUrl}
                          alt={lvl.nameAr}
                          style={{
                            width: 92, height: 92,
                            objectFit: "contain",
                            filter: `drop-shadow(0 3px 10px ${color}77)`,
                            display: "block",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 92, height: 92, borderRadius: "50%",
                          background: `linear-gradient(135deg, ${color}55, ${color}11)`,
                          border: `3px solid ${color}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20, fontWeight: 800, color,
                        }}>VIP{lvl.level}</div>
                      )}
                      {/* Badge overlay bottom-right */}
                      {lvl.badgeLottieUrl && isImageUrl(lvl.badgeLottieUrl) && (
                        <img
                          src={lvl.badgeLottieUrl}
                          alt="badge"
                          style={{
                            position: "absolute", bottom: -6, right: -6, width: 32, height: 32,
                            objectFit: "contain",
                            filter: `drop-shadow(0 2px 5px ${color}99)`,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* ── Name + price ── */}
                  <div style={{ ...styles.cardName, color: "#f1f5f9" }}>{lvl.nameAr}</div>
                  {lvl.name && <div style={{ ...styles.cardNameEn, color: "#94a3b8" }}>{lvl.name}</div>}
                  <div style={{ ...styles.cardPrice, color }}>💎 {lvl.price.toLocaleString()}</div>

                  {/* ── Active/Inactive chip ── */}
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: lvl.isActive ? "#22c55e22" : "#ef444422",
                    color: lvl.isActive ? "#4ade80" : "#f87171",
                    border: `1px solid ${lvl.isActive ? "#22c55e44" : "#ef444444"}`,
                  }}>
                    {lvl.isActive ? "مفعّل" : "معطّل"}
                  </div>

                  {/* ── Feature chips ── */}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5, marginTop: 2, minHeight: 26 }}>
                    {profileFrameUrl && (
                      <span title={frameIsPng ? "إطار PNG" : "إطار مصمم"} style={{ ...styles.featureChip, background: "rgba(99,102,241,0.18)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                        🖼 إطار
                      </span>
                    )}
                    {lvl.badgeLottieUrl && (
                      <span style={{ ...styles.featureChip, background: "rgba(245,158,11,0.18)", color: "#fcd34d", border: "1px solid rgba(245,158,11,0.3)" }}>🏅 شارة</span>
                    )}
                    {lvl.joinAnimationLottieUrl && (
                      <span style={{ ...styles.featureChip, background: "rgba(239,68,68,0.18)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>✨ دخول</span>
                    )}
                    {lvl.joinSoundUrl && (
                      <span style={{ ...styles.featureChip, background: "rgba(34,197,94,0.18)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)" }}>🔊 صوت</span>
                    )}
                    {lvl.benefits?.length > 0 && (
                      <span style={{ ...styles.featureChip, background: "rgba(8,145,178,0.18)", color: "#67e8f9", border: "1px solid rgba(8,145,178,0.3)" }}>🎁 {lvl.benefits.length}</span>
                    )}
                  </div>

                  {/* ══ SECTION 2: إطار التعليق — separate labeled block ══ */}
                  <div style={{ width: "100%", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10, marginTop: 4 }}>
                    <div style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 700, textAlign: "center", letterSpacing: 0.5, marginBottom: 8 }}>
                      💬 إطار التعليق
                    </div>
                    {commentFrameUrl && chatIsPng ? (
                      <div style={{ width: "100%", borderRadius: 12, overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "16px 26px",
                            minHeight: 52,
                            boxSizing: "border-box",
                          }}
                        >
                          <img
                            src={commentFrameUrl}
                            alt=""
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "fill",
                              pointerEvents: "none",
                              zIndex: 0,
                            }}
                          />
                          <div
                            style={{
                              position: "relative",
                              zIndex: 1,
                              color: "#fafafa",
                              fontSize: 12,
                              fontWeight: 700,
                              textAlign: "center",
                              lineHeight: 1.5,
                              wordBreak: "break-word",
                              maxWidth: "100%",
                              textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                            }}
                          >
                            <span style={{ color, fontWeight: 800 }}>VIP{lvl.level}</span>
                            {" "}
                            نص التعليق
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        ...styles.cardPreviewBubble,
                        ...getBubbleShapeStyle(lvl.commentBubbleShape),
                        borderColor: color,
                        borderWidth: normalizeBorderWidth(lvl.commentBorderWidth),
                        borderStyle: "solid",
                        backgroundColor: lvl.commentFrameBgColor || "rgba(8,8,20,0.9)",
                        color: "#e2e8f0",
                        fontSize: 11,
                      }}>
                        <span style={{ color, fontWeight: 700, fontSize: 10 }}>VIP{lvl.level} </span>
                        نص التعليق
                      </div>
                    )}
                    {!commentFrameUrl && (
                      <div style={{ fontSize: 10, color: "#475569", textAlign: "center", marginTop: 4 }}>— لا يوجد إطار تعليق —</div>
                    )}
                  </div>

                  {/* ── Edit / Delete ── */}
                  <div style={styles.cardActions}>
                    <button
                      style={{ ...styles.editBtn, background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }}
                      onClick={() => openEdit(lvl)} title="تعديل"
                    >
                      <FiEdit size={14} />
                    </button>
                    <button
                      style={{ ...styles.deleteBtn, background: "rgba(239,68,68,0.18)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}
                      onClick={() => handleDelete(lvl.level)} title="حذف"
                    >
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
          <div style={styles.overlay} onClick={() => {
            // Clean up any object URLs to prevent memory leaks
            if (form.joinVideoPreviewUrl && form.joinVideoFile) {
              URL.revokeObjectURL(form.joinVideoPreviewUrl);
            }
            setShowModal(false);
          }}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>{editingLevel ? `تعديل المستوى ${editingLevel.level}` : "إضافة مستوى جديد"}</h3>
                <button style={styles.closeBtn} onClick={() => {
                  // Clean up any object URLs to prevent memory leaks
                  if (form.joinVideoPreviewUrl && form.joinVideoFile) {
                    URL.revokeObjectURL(form.joinVideoPreviewUrl);
                  }
                  setShowModal(false);
                }}><FiX /></button>
              </div>
              {error && <div style={styles.errorBox}>{error}</div>}

              {/* ── Tab Navigation ── */}
              <div style={styles.tabsRow}>
                {[
                  { id: "basic",      label: "البيانات الأساسية", icon: "📋" },
                  { id: "properties", label: "الخصائص",           icon: "⚙️" },
                  { id: "benefits",   label: "المزايا",            icon: "🎁" },
                  { id: "gifts",      label: "الهدايا",            icon: "🎀" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModalTab(tab.id)}
                    style={{
                      ...styles.tabBtn,
                      ...(activeModalTab === tab.id ? styles.tabBtnActive : {}),
                    }}
                  >
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

              {/* ── Join card behaviour (live room) ── */}
              <div style={{ ...styles.twoCol, marginTop: 8 }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>مدة ظهور كارت الانضمام (ثانية)</label>
                  <input style={styles.input} type="number" min={2} max={30} step={0.5}
                    value={(Number(form.joinDisplayDurationMs) || 5000) / 1000}
                    onChange={(e) => setForm({
                      ...form,
                      joinDisplayDurationMs: Math.min(30000, Math.max(2000, (Number(e.target.value) || 5) * 1000)),
                    })} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>شكل الظهور</label>
                  <select
                    style={styles.input}
                    value={effectiveJoinLayoutStyle}
                    disabled={hasJoinVideo}
                    onChange={(e) => setForm({ ...form, joinLayoutStyle: e.target.value })}>
                    <option value="card">بطاقة علوية (Card)</option>
                    <option value="ticker">شريط زمني / ماركيز (Ticker)</option>
                    <option value="video-fullscreen">فيديو انضمام بملء الشاشة</option>
                  </select>
                  {hasJoinVideo ? (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>
                      تم تثبيت نمط الظهور على "فيديو بملء الشاشة" لأن فيديو الانضمام مضاف.
                    </div>
                  ) : null}
                </div>
              </div>
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>مؤثر حول الكارت</label>
                  <select style={styles.input} value={form.joinEffectPreset}
                    onChange={(e) => setForm({ ...form, joinEffectPreset: e.target.value })}>
                    <option value="none">بدون</option>
                    <option value="glow">توهج</option>
                    <option value="pulse">نبض</option>
                    <option value="aurora">أورورا</option>
                    <option value="ring">حلقة</option>
                  </select>
                </div>
                <div style={{ ...styles.formGroup, display: "flex", alignItems: "center", paddingTop: 24 }}>
                  <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                    <input type="checkbox" checked={!!form.joinConfigPendingReview}
                      onChange={(e) => setForm({ ...form, joinConfigPendingReview: e.target.checked })} />
                    قيد المراجعة (لم يعتمد للعرض النهائي)
                  </label>
                </div>
              </div>
              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>فيديو الانضمام (Full Screen · اختياري)</label>
                  <input ref={joinVideoRef} type="file" accept="video/*,.mp4,.webm,.mov" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setForm({ ...form, joinVideoFile: file, joinVideoUrl: "", joinLayoutStyle: "video-fullscreen" });
                      setJoinVideoName(file.name);
                      
                      // Create a preview URL for the video
                      if (file) {
                        const videoPreviewUrl = URL.createObjectURL(file);
                        setForm(prev => ({ ...prev, joinVideoPreviewUrl: videoPreviewUrl }));
                      }
                    }} />
                  <div style={styles.uploadZone} onClick={() => joinVideoRef.current?.click()}>
                    {joinVideoName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span style={{ fontSize: 22 }}>🎬</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{joinVideoName}</div>
                          {form.joinVideoUrl && <div style={{ fontSize: 10, color: "#64748b" }}>محفوظ ✓</div>}
                        </div>
                        <button style={{ ...styles.removeImgBtn, position: "static" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setJoinVideoName("");
                            setForm({ ...form, joinVideoFile: null, joinVideoUrl: "", joinVideoPreviewUrl: null });
                            
                            // Revoke the object URL to avoid memory leaks
                            if (form.joinVideoPreviewUrl) {
                              URL.revokeObjectURL(form.joinVideoPreviewUrl);
                            }
                          }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>📹</div>
                        <div style={{ fontSize: 12 }}>سيظهر الفيديو بملء الشاشة عند الانضمام</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Video Preview */}
                  {(form.joinVideoPreviewUrl || form.joinVideoUrl) && (
                    <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', maxWidth: '100%', border: '1px solid #e2e8f0' }}>
                      <video
                        src={form.joinVideoPreviewUrl || form.joinVideoUrl}
                        style={{ width: '100%', maxHeight: 150, objectFit: 'contain' }}
                        controls
                        autoPlay={false}
                        muted
                        loop
                      />
                      <div style={{ padding: 8, background: '#f8fafc', fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                        معاينة فيديو الانضمام
                      </div>
                    </div>
                  )}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    إطار PNG/WebP حول كارت الانضمام بالكامل (شفاف في الوسط لإظهار المحتوى)
                  </label>
                  <input ref={joinCardFrameRef} type="file" accept="image/png,image/webp,.png,.webp" style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setForm({ ...form, joinCardFrameImageFile: file, joinCardFrameImageUrl: "" });
                      setJoinCardFrameName(file.name);
                    }} />
                  <div style={styles.uploadZone} onClick={() => joinCardFrameRef.current?.click()}>
                    {joinCardFrameName ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span style={{ fontSize: 22 }}>🖼</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{joinCardFrameName}</div>
                          {form.joinCardFrameImageUrl && <div style={{ fontSize: 10, color: "#64748b" }}>محفوظ ✓</div>}
                        </div>
                        <button style={{ ...styles.removeImgBtn, position: "static" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setJoinCardFrameName("");
                            setForm({ ...form, joinCardFrameImageFile: null, joinCardFrameImageUrl: "" });
                          }}>
                          <FiX size={12} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>✴️</div>
                        <div style={{ fontSize: 12 }}>يُرسَم فوق الكارت والصورة البارزة</div>
                      </div>
                    )}
                  </div>

                  {/* Review: join card frame + selected settings */}
                  <div
                    style={{
                      marginTop: 10,
                      borderRadius: 12,
                      border: "1px solid #dbeafe",
                      background: "#f8fbff",
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#1e3a8a", fontSize: 13 }}>
                        🔎 مراجعة كارد الانضمام
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: form.joinConfigPendingReview ? "#b45309" : "#047857",
                          background: form.joinConfigPendingReview ? "#fef3c7" : "#d1fae5",
                          border: `1px solid ${form.joinConfigPendingReview ? "#f59e0b" : "#10b981"}`,
                          borderRadius: 999,
                          padding: "2px 8px",
                        }}
                      >
                        {form.joinConfigPendingReview ? "قيد المراجعة" : "جاهز للاعتماد"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#334155" }}>
                        <strong>نمط الظهور:</strong> {JOIN_LAYOUT_LABELS[effectiveJoinLayoutStyle] || effectiveJoinLayoutStyle}
                      </div>
                      <div style={{ fontSize: 12, color: "#334155" }}>
                        <strong>المؤثر:</strong> {JOIN_EFFECT_LABELS[form.joinEffectPreset] || form.joinEffectPreset}
                      </div>
                      <div style={{ fontSize: 12, color: "#334155" }}>
                        <strong>مدة العرض:</strong> {Math.round((Number(form.joinDisplayDurationMs) || 5000) / 1000)} ثانية
                      </div>
                      <div style={{ fontSize: 12, color: "#334155" }}>
                        <strong>فيديو الانضمام:</strong> {form.joinVideoFile || form.joinVideoUrl ? "موجود" : "غير مضاف"}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "#334155", marginBottom: 8 }}>
                      <strong>النص الخاص:</strong>{" "}
                      {form.specialJoinText?.trim() ? form.specialJoinText : "—"}
                    </div>

                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        minHeight: 120,
                        borderRadius: 12,
                        border: "1px solid #cbd5e1",
                        background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))",
                        overflow: "hidden",
                        padding: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, zIndex: 2 }}>
                        <div style={{ color: form.usernameColor || form.color || "#F8FAFC", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
                          {form.specialJoinText?.trim() || `انضم VIP${form.level} إلى الغرفة`}
                        </div>
                        <div style={{ color: "#cbd5e1", fontSize: 11, marginBottom: 6 }}>
                          معاينة شاملة لكل إعدادات كارد الانضمام المختارة.
                        </div>
                        <div style={{ color: "#93c5fd", fontSize: 11, fontWeight: 700 }}>
                          {joinCardFramePreviewUrl ? "إطار الكارد ظاهر في المعاينة" : "لا يوجد إطار كارد مضاف"}
                        </div>
                      </div>

                      {joinCardFramePreviewUrl ? (
                        <img
                          src={joinCardFramePreviewUrl}
                          alt="Join card frame preview"
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "fill",
                            pointerEvents: "none",
                            zIndex: 3,
                          }}
                        />
                      ) : null}
                    </div>

                    {(form.joinVideoPreviewUrl || form.joinVideoUrl) ? (
                      <div
                        style={{
                          marginTop: 10,
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid #cbd5e1",
                          background: "#020617",
                        }}
                      >
                        <div style={{ padding: "8px 10px", fontSize: 11, color: "#cbd5e1", borderBottom: "1px solid #1e293b" }}>
                          معاينة فيديو الانضمام (بملء الشاشة — خارج كارد الانضمام)
                        </div>
                        <video
                          src={form.joinVideoPreviewUrl || form.joinVideoUrl}
                          style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }}
                          muted
                          autoPlay
                          loop
                          controls
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
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
                <button style={styles.cancelBtn} onClick={() => {
                  // Clean up any object URLs to prevent memory leaks
                  if (form.joinVideoPreviewUrl && form.joinVideoFile) {
                    URL.revokeObjectURL(form.joinVideoPreviewUrl);
                  }
                  setShowModal(false);
                }}>إلغاء</button>
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
                <h3 style={styles.modalTitle}>تعيين VIP لمستخدم</h3>
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

              {/* ── Preview section ──
                   Shows the ACTUAL PNG frames / badges / icons the user will
                   see after we assign this VIP level. Updates instantly as
                   the admin changes the VIP dropdown above. */}
              {selLevel && (() => {
                const frameBen = (selLevel.benefits || []).find((b) => b.type === "frame");
                const chatBen  = (selLevel.benefits || []).find((b) => b.type === "chat");
                const frameIsPng = frameBen?.frameDisplayType === "image" && (frameBen?.imageUrl || selLevel.profileFrameLottieUrl);
                const chatIsPng  = chatBen?.frameDisplayType  === "image" && (chatBen?.imageUrl  || selLevel.commentFrameLottieUrl);
                const profileFrameUrl = frameBen?.imageUrl || selLevel.profileFrameLottieUrl;
                const commentFrameUrl = chatBen?.imageUrl || selLevel.commentFrameLottieUrl;
                const borderCol  = frameBen?.profileFrameBorderColor || lvlColor;
                const borderW    = frameBen?.profileFrameBorderWidth || 3;
                const avatarFallback = (
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: lvlColor + "33", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18, color: lvlColor, fontWeight: 800 }}>{(assignData.username || "م")[0].toUpperCase()}</span>
                  </div>
                );
                const renderAvatar = (size) => {
                  const overhang = Math.round(size * 0.25);
                  return (
                    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                      {/* Profile frame: explicit top/left, 25% overhang each side */}
                      {profileFrameUrl && frameIsPng ? (
                        <img
                          src={profileFrameUrl}
                          alt=""
                          style={{
                            position: "absolute",
                            top: -overhang,
                            left: -overhang,
                            width: size + overhang * 2,
                            height: size + overhang * 2,
                            objectFit: "contain",
                            pointerEvents: "none",
                            zIndex: 2,
                          }}
                        />
                      ) : null}
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden",
                        border: frameIsPng ? "none" : `${borderW}px solid ${borderCol}`,
                        background: "#0f0f1a",
                      }}>
                        {assignData.userImage
                          ? <img src={assignData.userImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : avatarFallback}
                      </div>
                      {/* Badge overlay */}
                      {selLevel.badgeLottieUrl && isImageUrl(selLevel.badgeLottieUrl) && (
                        <img
                          src={selLevel.badgeLottieUrl}
                          alt=""
                          style={{
                            position: "absolute",
                            bottom: -Math.round(size * 0.12),
                            right: -Math.round(size * 0.12),
                            width: Math.max(22, size * 0.38),
                            height: Math.max(22, size * 0.38),
                            objectFit: "contain",
                            zIndex: 3,
                            filter: `drop-shadow(0 2px 6px ${lvlColor}88)`,
                          }}
                        />
                      )}
                    </div>
                  );
                };

                /* ── tiny shared card style ── */
                const previewCard = {
                  background: "linear-gradient(165deg, #100e1a 0%, #0c0a14 100%)",
                  border: `1px solid ${lvlColor}38`,
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.35)",
                };
                const previewTitle = {
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                };

                return (
                  <div style={{ marginBottom: 14 }}>
                    {/* Section header */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 10,
                      paddingBottom: 8,
                      borderBottom: `1px solid ${lvlColor}22`,
                    }}>
                      <span style={{ fontSize: 13 }}>🎨</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", letterSpacing: ".4px" }}>
                        معاينة المستوى
                      </span>
                      <span style={{
                        marginRight: "auto",
                        fontSize: 10, fontWeight: 800,
                        color: lvlColor,
                        background: lvlColor + "18",
                        border: `1px solid ${lvlColor}44`,
                        borderRadius: 20, padding: "2px 10px",
                      }}>
                        VIP {selLevel.level} — {selLevel.nameAr || selLevel.name}
                      </span>
                    </div>

                    {/* ── 2 × 2 compact grid ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

                      {/* 1 ── Profile frame */}
                      <div style={previewCard}>
                        <div style={previewTitle}>👤 إطار البروفايل</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* Avatar with frame — size 52, overhang 13 so container = 78 */}
                          <div style={{ width: 78, height: 78, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {renderAvatar(52)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>
                              {assignData.username || "المستخدم"}
                            </div>
                            <div style={{
                              display: "inline-block",
                              fontSize: 9, fontWeight: 800,
                              color: frameIsPng ? "#a78bfa" : profileFrameUrl ? "#22d3ee" : "#4b5563",
                              background: frameIsPng ? "#a78bfa18" : profileFrameUrl ? "#22d3ee18" : "#1e1e2e",
                              border: `1px solid ${frameIsPng ? "#a78bfa44" : profileFrameUrl ? "#22d3ee44" : "#2d2b55"}`,
                              borderRadius: 20, padding: "2px 8px", marginTop: 2,
                            }}>
                              {frameIsPng ? "🖼 PNG" : profileFrameUrl ? "🎨 مصمم" : "بلا إطار"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2 ── Comment bubble */}
                      <div style={previewCard}>
                        <div style={previewTitle}>💬 إطار التعليق</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexDirection: "row-reverse" }}>
                          {/* tiny avatar */}
                          <div style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {renderAvatar(32)}
                          </div>
                          {commentFrameUrl && chatIsPng ? (
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  position: "relative",
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "14px 18px",
                                  minHeight: 48,
                                  boxSizing: "border-box",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                }}
                              >
                                <img
                                  src={commentFrameUrl}
                                  alt=""
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "fill",
                                    pointerEvents: "none",
                                    zIndex: 0,
                                  }}
                                />
                                <div style={{ position: "relative", zIndex: 1, color: "#fff", fontSize: 10, width: "100%", wordBreak: "break-word" }}>
                                  <div style={{ fontWeight: 800, color: lvlColor, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                                    <span>{assignData.username || "المستخدم"}</span>
                                    <span style={{ background: lvlColor, color: "#fff", fontSize: 8, fontWeight: 800, borderRadius: 6, padding: "2px 6px" }}>VIP{selLevel.level}</span>
                                  </div>
                                  <div style={{ fontSize: 10, lineHeight: 1.45, textShadow: "0 1px 3px rgba(0,0,0,0.85)" }}>نص التعليق هنا...</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              ...getBubbleShapeStyle(bubbleShape),
                              border: `${borderWidth}px solid ${lvlColor}`,
                              background: selLevel.commentFrameBgColor || "rgba(8,8,20,0.9)",
                              padding: "6px 10px", flex: 1,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: lvlColor }}>{assignData.username || "المستخدم"}</span>
                                <span style={{ background: lvlColor, color: "#fff", fontSize: 8, fontWeight: 800, borderRadius: 6, padding: "1px 5px" }}>VIP{selLevel.level}</span>
                              </div>
                              <span style={{ color: "#e2e8f0", fontSize: 10 }}>نص التعليق هنا...</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 9, color: chatIsPng ? "#a78bfa" : "#4b5563", marginTop: 0 }}>
                          {chatIsPng ? "🖼 PNG" : "🎨 تصميم مخصص"}
                        </div>
                      </div>

                      {/* 3 ── Level icon */}
                      <div style={previewCard}>
                        <div style={previewTitle}>🏅 أيقونة المستوى</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                            {selLevel.imageUrl ? (
                              <img src={selLevel.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: "contain", filter: `drop-shadow(0 2px 6px ${lvlColor}88)` }} />
                            ) : (
                              <div style={{ width: 52, height: 52, borderRadius: 10, background: `linear-gradient(135deg,${lvlColor}44,${lvlColor}11)`, border: `1.5px solid ${lvlColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: lvlColor }}>V{selLevel.level}</div>
                            )}
                            {selLevel.badgeLottieUrl && isImageUrl(selLevel.badgeLottieUrl) && (
                              <img src={selLevel.badgeLottieUrl} alt="" style={{ position: "absolute", bottom: -4, right: -4, width: 20, height: 20, objectFit: "contain", filter: `drop-shadow(0 1px 4px ${lvlColor}88)` }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: lvlColor, fontWeight: 800, fontSize: 13 }}>VIP {selLevel.level}</div>
                            <div style={{ color: "#94a3b8", fontSize: 11 }}>{selLevel.nameAr}</div>
                            <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 2 }}>💎 {(selLevel.price || 0).toLocaleString()} عملة</div>
                          </div>
                        </div>
                      </div>

                      {/* 4 ── Join message */}
                      <div style={previewCard}>
                        <div style={previewTitle}>🚪 رسالة الانضمام</div>
                        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6, flexDirection: "row-reverse" }}>
                          <div style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {renderAvatar(28)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ color: lvlColor, fontWeight: 800, fontSize: 11 }}>{assignData.username || "المستخدم"}</span>
                            <span style={{ color: "#94a3b8", fontSize: 11 }}> {selLevel.specialJoinText || "انضم إلى الغرفة"}</span>
                          </div>
                          <span style={{ background: lvlColor, color: "#fff", fontSize: 8, fontWeight: 800, borderRadius: 6, padding: "2px 6px", flexShrink: 0 }}>VIP{selLevel.level}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {selLevel.joinAnimationLottieUrl && <span style={{ fontSize: 9, color: "#34d399", background: "#052e1b", borderRadius: 6, padding: "1px 7px" }}>✨ انيميشن</span>}
                          {selLevel.joinSoundUrl && <span style={{ fontSize: 9, color: "#60a5fa", background: "#0b1a33", borderRadius: 6, padding: "1px 7px" }}>🔊 صوت</span>}
                        </div>
                      </div>

                    </div>

                    {/* Benefits row */}
                    {Array.isArray(selLevel.benefits) && selLevel.benefits.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                        {selLevel.benefits.slice(0, 5).map((b, i) => (
                          <span key={i} style={{
                            fontSize: 10, color: "#94a3b8",
                            background: "#12102a",
                            border: `1px solid ${lvlColor}33`,
                            borderRadius: 20, padding: "2px 9px",
                            display: "flex", alignItems: "center", gap: 3,
                          }}>
                            <span style={{ color: lvlColor, fontSize: 8 }}>●</span>
                            {b.titleAr}
                          </span>
                        ))}
                        {selLevel.benefits.length > 5 && (
                          <span style={{ fontSize: 10, color: "#4b5563", padding: "2px 6px" }}>+{selLevel.benefits.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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

const fontStack = 'system-ui, -apple-system, "Segoe UI", Tahoma, "Arial Unicode MS", sans-serif';

const styles = {
  container: {
    padding: "28px 24px 48px",
    direction: "rtl",
    maxWidth: 1320,
    margin: "0 auto",
    fontFamily: fontStack,
    minHeight: "100%",
    boxSizing: "border-box",
    background: "linear-gradient(165deg, #eef2ff 0%, #f8fafc 28%, #f1f5f9 100%)",
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#6366f1",
    marginBottom: 8,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 20,
    padding: "26px 28px",
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid rgba(15, 23, 42, 0.06)",
    boxShadow:
      "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 40px -16px rgba(15, 23, 42, 0.12)",
  },
  headerActions: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  title: {
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    color: "#0f172a",
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
  },
  subtitle: {
    color: "#64748b",
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.65,
    maxWidth: 560,
    marginBottom: 0,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 20px",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 1px 2px rgba(79, 70, 229, 0.28), 0 4px 12px -4px rgba(79, 70, 229, 0.45)",
  },
  assignBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 20px",
    backgroundColor: "#ea580c",
    color: "#fff",
    border: "none",
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    boxShadow: "0 1px 2px rgba(234, 88, 12, 0.35), 0 4px 14px -6px rgba(234, 88, 12, 0.45)",
  },
  seedBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 20px",
    backgroundColor: "#ecfdf5",
    color: "#047857",
    border: "1px solid rgba(16, 185, 129, 0.35)",
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: "52px 24px",
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid rgba(15, 23, 42, 0.06)",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    color: "#475569",
    fontSize: 14,
    fontWeight: 600,
  },
  loadingSpinner: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "3px solid #e2e8f0",
    borderTopColor: "#4f46e5",
    animation: "vip-admin-spin 0.7s linear infinite",
  },
  emptyGrid: {
    gridColumn: "1 / -1",
    textAlign: "center",
    padding: "52px 28px",
    background: "#ffffff",
    borderRadius: 18,
    border: "1px dashed rgba(99, 102, 241, 0.28)",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
  },
  emptyGridIcon: { fontSize: 42, marginBottom: 12, lineHeight: 1 },
  emptyGridTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a" },
  emptyGridHint: { fontSize: 14, marginTop: 8, color: "#64748b", lineHeight: 1.55 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(232px, 1fr))",
    gap: 22,
  },
  card: {
    borderRadius: 18,
    padding: "22px 18px 16px",
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    position: "relative",
    overflow: "visible",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
  },
  cardBadge: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 18px",
    letterSpacing: 0.3,
  },
  cardImg: { width: 72, height: 72, objectFit: "contain", borderRadius: 12 },
  cardName: { fontWeight: 700, fontSize: 16, marginTop: 4 },
  cardNameEn: { fontSize: 12, opacity: 0.95 },
  cardPrice: { fontSize: 15, fontWeight: 800 },
  statusBadge: { fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 14px" },
  featureChip: {
    fontSize: 10,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  cardPreviewWrap: { width: "100%", marginTop: 4, padding: "6px 8px" },
  cardPreviewBubble: {
    backgroundColor: "rgba(8,8,20,0.9)",
    color: "#e2e8f0",
    fontSize: 11,
    textAlign: "center",
    padding: "8px 12px",
  },
  cardActions: { display: "flex", gap: 10, marginTop: 8, width: "100%", justifyContent: "center" },
  editBtn: {
    padding: "8px 14px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  deleteBtn: {
    padding: "8px 14px",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    backdropFilter: "blur(5px)",
    WebkitBackdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
    boxSizing: "border-box",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: "28px 32px 32px",
    width: "100%",
    maxWidth: 860,
    maxHeight: "92vh",
    overflowY: "auto",
    direction: "rtl",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.28)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 18,
    borderBottom: "1px solid #f1f5f9",
    gap: 12,
  },
  modalTitle: { margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#f1f5f9",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    color: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tabsRow: {
    display: "flex",
    gap: 8,
    marginBottom: 24,
    padding: 7,
    background: "#f1f5f9",
    borderRadius: 14,
    overflowX: "auto",
    border: "1px solid #e2e8f0",
  },
  tabBtn: {
    flex: "0 0 auto",
    padding: "11px 18px",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    borderRadius: 11,
    background: "transparent",
    color: "#64748b",
    whiteSpace: "nowrap",
    fontFamily: fontStack,
  },
  tabBtnActive: {
    background: "#ffffff",
    color: "#4338ca",
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)",
  },
  modalFooter: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 28,
    paddingTop: 20,
    borderTop: "1px solid #f1f5f9",
    flexWrap: "wrap",
  },
  formGroup: { marginBottom: 18 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 11,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: fontStack,
  },
  saveBtn: {
    padding: "11px 22px",
    backgroundColor: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 1px 2px rgba(79, 70, 229, 0.25)",
    fontFamily: fontStack,
  },
  cancelBtn: {
    padding: "11px 22px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    border: "none",
    borderRadius: 11,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    fontFamily: fontStack,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    padding: "12px 16px",
    borderRadius: 11,
    marginBottom: 18,
    fontSize: 14,
    border: "1px solid #fecaca",
  },
  previewWrap: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
  },
  previewBubble: { backgroundColor: "rgba(8,8,20,0.86)", padding: "10px 12px", color: "#fff" },
  previewHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  previewUsername: { fontSize: 13, fontWeight: 700 },
  previewChip: { color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 10, padding: "2px 7px", display: "inline-block" },
  previewMessage: { color: "#fff", fontSize: 13, lineHeight: "18px" },
  uploadZone: {
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    padding: 22,
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: "#fafbfc",
    minHeight: 92,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "border-color 0.2s, background 0.2s",
    boxSizing: "border-box",
  },
  imagePreview: {
    width: 96,
    height: 96,
    objectFit: "contain",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#0f172a",
    padding: 4,
  },
  removeImgBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.35)",
  },
  userList: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    background: "#fff",
  },
  userItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 14px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s",
  },
  selectedUser: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
};

export default VipManagement;
