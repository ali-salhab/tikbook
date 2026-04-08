import React, { useEffect, useState, useRef } from "react";
import { api } from "../config/api";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { FiEdit, FiTrash2, FiPlus, FiX, FiCheck, FiBox, FiImage, FiMusic, FiGift, FiSliders } from "react-icons/fi";
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

// ─── CSS keyframes for live preview (injected once) ─────────────────────────
const PREVIEW_ANIM_ID = "gift-preview-css";
const ensurePreviewCSS = () => {
  if (document.getElementById(PREVIEW_ANIM_ID)) return;
  const s = document.createElement("style");
  s.id = PREVIEW_ANIM_ID;
  s.textContent = `
    @keyframes gift-wiggle  { 0%,100%{transform:rotate(0) translateX(0) scale(1)} 20%{transform:rotate(9deg) translateX(5px) scale(1.12)} 40%{transform:rotate(-9deg) translateX(-5px) scale(0.95)} 60%{transform:rotate(6deg) translateX(4px) scale(1.08)} 80%{transform:rotate(-5deg) translateX(-3px) scale(0.97)} }
    @keyframes gift-bounce  { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.22)} }
    @keyframes gift-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes gift-float   { 0%,100%{transform:translateX(0) scale(1)} 50%{transform:translateX(10px) scale(1.05)} }
    @keyframes gift-pulse   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.28)} }
    @keyframes entry-pop    { 0%{transform:scale(0.2);opacity:0} 60%{transform:scale(1.35);opacity:1} 80%{transform:scale(0.95)} 100%{transform:scale(1)} }
    @keyframes entry-zoom   { 0%{transform:scale(0.1) rotate(-10deg);opacity:0} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes entry-slide  { 0%{transform:translateY(80px);opacity:0} 100%{transform:translateY(0);opacity:1} }
    @keyframes entry-flip   { 0%{transform:rotateY(180deg) scale(0.5);opacity:0} 100%{transform:rotateY(0) scale(1);opacity:1} }
    @keyframes entry-rubber { 0%{transform:scale(0.1)} 40%{transform:scale(1.5)} 65%{transform:scale(0.75)} 82%{transform:scale(1.2)} 92%{transform:scale(0.9)} 100%{transform:scale(1)} }
    @keyframes float-up     { 0%{opacity:0;transform:translateY(0) scale(0.5) rotate(0deg)} 15%{opacity:1} 85%{opacity:0.7} 100%{opacity:0;transform:translateY(-90px) scale(1) rotate(${Math.random() > .5 ? '':'-'}${30+Math.round(Math.random()*60)}deg)} }
  `;
  document.head.appendChild(s);
};

const EFFECT_CHARS_PREVIEW = {
  sparkles:["✨","💫","⭐"],hearts:["❤️","🩷","💛"],stars:["⭐","🌟","✨"],
  confetti:["🎊","🎉","🎈"],bubbles:["🫧","⚪","🔵"],roses:["🌹","🌸","🌺"],
  fire:["🔥","💥","⚡"],snow:["❄️","🌨","⛄"],none:[],
};
const SIZE_MAP_P  = { tiny:11, small:15, medium:22, large:28, huge:36 };
const SPEED_MAP_P = { slow:2.8, medium:1.6, fast:0.8 };

const GiftLivePreview = ({ form, previews, editingGift }) => {
  useEffect(() => { ensurePreviewCSS(); }, []);

  const imgSrc = previews.png
    ? (typeof previews.png === "string" && previews.png.startsWith("data:") ? previews.png : null)
    : previews.thumbnail
      ? (typeof previews.thumbnail === "string" && previews.thumbnail.startsWith("data:") ? previews.thumbnail : null)
      : editingGift ? (editingGift.pngUrl || editingGift.thumbnailUrl || editingGift.animationUrl || null) : null;
  const isLottieImg = imgSrc && (imgSrc.endsWith(".json") || (editingGift?.animationType === "lottie"));

  const effectType  = form.effectType  || "sparkles";
  const effectCount = Math.min(Math.max(form.effectCount ?? 8, 0), 16);
  const pSize       = SIZE_MAP_P[form.effectSize   || "medium"] || 22;
  const spd         = SPEED_MAP_P[form.effectSpeed || "medium"] || 1.6;
  const glowColor   = form.glowColor   || "#FFD700";
  const glowOpacity = form.glowOpacity ?? 0.25;

  const danceKf  = { wiggle:"gift-wiggle", bounce:"gift-bounce", spin:"gift-spin", float:"gift-float", pulse:"gift-pulse", none:"none" }[form.danceStyle  || "wiggle"] || "gift-wiggle";
  const entryKf  = { pop:"entry-pop",      zoom:"entry-zoom",    slide:"entry-slide", flip:"entry-flip", rubber:"entry-rubber" }[form.entryEffect || "pop"]   || "entry-pop";

  const chars = effectType === "custom" ? [form.effectCustomChar || "✨"] : (EFFECT_CHARS_PREVIEW[effectType] || ["✨"]);

  const particles = effectType !== "none" && effectCount > 0
    ? Array.from({ length: effectCount }, (_, i) => ({
        key: i,
        char: chars[i % chars.length],
        left:  `${5 + ((i * 47) % 88)}%`,
        bottom:`${12 + ((i * 23) % 55)}%`,
        delay: `${((i * 0.18) % spd).toFixed(2)}s`,
        dur:   `${(spd + 0.2 + (i % 3) * 0.3).toFixed(2)}s`,
      }))
    : [];

  return (
    <div style={pvStyles.wrap}>
      <div style={pvStyles.header}>👁️ معاينة مباشرة</div>
      <div style={pvStyles.stage}>
        {/* Glow */}
        <div style={{ ...pvStyles.glow, background: glowColor, opacity: glowOpacity, boxShadow: `0 0 55px 25px ${glowColor}` }} />
        {/* Gift image */}
        {imgSrc && !isLottieImg ? (
          <img
            key={imgSrc}  /* re-trigger entry anim when image changes */
            src={imgSrc}
            style={{ ...pvStyles.giftImg, animation: `${entryKf} 0.55s cubic-bezier(.34,1.56,.64,1) forwards, ${danceKf === "none" ? "" : `${danceKf} ${spd + 0.4}s ease ${0.6}s infinite`}` }}
            alt="preview"
          />
        ) : (
          <div style={pvStyles.placeholder}>🎁<div style={{ fontSize: 11, marginTop: 6, color: "#94a3b8" }}>ارفع صورة للمعاينة</div></div>
        )}
        {/* Particles */}
        {particles.map(p => (
          <span key={p.key} style={{ position:"absolute", left:p.left, bottom:p.bottom, fontSize:pSize, animation:`float-up ${p.dur} ${p.delay} ease-out infinite`, pointerEvents:"none", zIndex:5, userSelect:"none" }}>{p.char}</span>
        ))}
        {/* Sender pill */}
        <div style={pvStyles.pill}>
          <div style={pvStyles.pillAvatar}>أ</div>
          <div>
            <div style={{ color:"#fff", fontSize:11, fontWeight:700 }}>المرسل</div>
            <div style={{ color:"#FFD700", fontSize:10 }}>🎁 {form.nameAr || "اسم الهدية"}</div>
          </div>
        </div>
        {/* Badges */}
        <div style={pvStyles.priceBadge}>💎 {form.price || 10}</div>
        {form.comboEnabled && <div style={pvStyles.comboBadge}>🔥 COMBO</div>}
      </div>
      <div style={pvStyles.footer}>
        <span style={{ color: "#6b7280", fontSize: 11 }}>الرقصة: <b>{form.danceStyle || "wiggle"}</b></span>
        <span style={{ color: "#6b7280", fontSize: 11 }}>الدخول: <b>{form.entryEffect || "pop"}</b></span>
        <span style={{ fontSize: 16 }}>{EFFECT_CHARS_PREVIEW[effectType]?.[0] || (effectType !== "none" ? form.effectCustomChar : "🚫")} ×{effectCount}</span>
      </div>
    </div>
  );
};

const RARITY_META = {
  common:    { label: "عادي",   color: "#6b7280", bg: "#f3f4f6" },
  rare:      { label: "نادر",   color: "#3b82f6", bg: "#eff6ff" },
  epic:      { label: "ملحمي",  color: "#8b5cf6", bg: "#f5f3ff" },
  legendary: { label: "أسطوري", color: "#f97316", bg: "#fff7ed" },
  mythic:    { label: "خرافي",  color: "#ec4899", bg: "#fdf2f8" },
};

const CATEGORY_LABELS = { basic: "أساسي", premium: "مميز", vip: "VIP", special: "خاص" };
const ANIM_TYPES = ["lottie", "gif", "svga", "video", "glb", "webm_alpha", "png"];

const EFFECT_TYPES = [
  { value: "none",      label: "بلا تأثير",    emoji: "🚫" },
  { value: "sparkles",  label: "بريق",          emoji: "✨" },
  { value: "hearts",    label: "قلوب",          emoji: "❤️" },
  { value: "stars",     label: "نجوم",          emoji: "⭐" },
  { value: "confetti",  label: "كونفيتي",       emoji: "🎊" },
  { value: "bubbles",   label: "فقاعات",        emoji: "🫧" },
  { value: "roses",     label: "ورود",          emoji: "🌹" },
  { value: "fire",      label: "نار",           emoji: "🔥" },
  { value: "snow",      label: "ثلج",           emoji: "❄️" },
  { value: "custom",    label: "مخصص",          emoji: "🎨" },
];

const DANCE_STYLES = [
  { value: "wiggle", label: "اهتزاز (Wiggle)" },
  { value: "bounce", label: "قفز (Bounce)" },
  { value: "spin",   label: "دوران (Spin)" },
  { value: "float",  label: "طفو (Float)" },
  { value: "pulse",  label: "نبض (Pulse)" },
  { value: "none",   label: "بلا رقصة" },
];

const ENTRY_EFFECTS = [
  { value: "pop",    label: "انبثاق (Pop)" },
  { value: "zoom",   label: "تكبير (Zoom)" },
  { value: "slide",  label: "انزلاق (Slide)" },
  { value: "flip",   label: "قلب (Flip)" },
  { value: "rubber", label: "مطاطي (Rubber)" },
];

const defaultEffects = {
  effectType: "sparkles",
  effectCount: 8,
  effectSize: "medium",
  effectSpeed: "medium",
  effectColor: "",
  effectCustomChar: "✨",
  glowColor: "#FFD700",
  glowOpacity: 0.25,
  danceStyle: "wiggle",
  entryEffect: "pop",
};

const defaultForm = {
  name: "", nameAr: "", price: 10, rarity: "common", category: "basic",
  duration: 3, comboEnabled: true, fullScreen: false, isActive: true, sortOrder: 0,
  animationType: "lottie",
  animationFile: null, thumbnailFile: null, soundFile: null, webmFile: null, pngFile: null,
  ...defaultEffects,
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
  const [previews, setPreviews] = useState({ animation: null, thumbnail: null, sound: null, png: null });
  const [showEffects, setShowEffects] = useState(false);
  const animRef = useRef(null);
  const thumbRef = useRef(null);
  const soundRef = useRef(null);
  const webmRef = useRef(null);
  const pngRef = useRef(null);

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

  const setF = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const openCreate = () => {
    setEditingGift(null);
    setForm({ ...defaultForm });
    setPreviews({ animation: null, thumbnail: null, sound: null, png: null });
    setShowEffects(false);
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
      animationType: gift.animationType || "lottie",
      animationFile: null, thumbnailFile: null, soundFile: null, webmFile: null, pngFile: null,
      effectType: gift.effectType || "sparkles",
      effectCount: gift.effectCount ?? 8,
      effectSize: gift.effectSize || "medium",
      effectSpeed: gift.effectSpeed || "medium",
      effectColor: gift.effectColor || "",
      effectCustomChar: gift.effectCustomChar || "✨",
      glowColor: gift.glowColor || "#FFD700",
      glowOpacity: gift.glowOpacity ?? 0.25,
      danceStyle: gift.danceStyle || "wiggle",
      entryEffect: gift.entryEffect || "pop",
    });
    setPreviews({ animation: gift.thumbnailUrl || null, thumbnail: gift.thumbnailUrl || null, sound: null, png: gift.pngUrl || null });
    setShowEffects(false);
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
      if (type === "png") next.pngFile = file;
      return next;
    });
    if (type === "thumbnail" || type === "png" || (type === "animation" && file.type.startsWith("image/"))) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((p) => ({ ...p, [type]: reader.result }));
      reader.readAsDataURL(file);
    } else {
      setPreviews((p) => ({ ...p, [type]: file.name }));
    }
  };

  const handleSave = async () => {
    if (!form.nameAr) { setError("الاسم العربي مطلوب"); return; }
    if (!editingGift && !form.animationFile && !form.webmFile && !form.pngFile) {
      setError("ملف الحركة أو ملف PNG أو ملف WebM مطلوب للهدايا الجديدة"); return;
    }
    if (!editingGift && !form.thumbnailFile && !form.pngFile) {
      setError("الصورة المصغرة مطلوبة (أو ارفع PNG سيُستخدم كصورة مصغرة)"); return;
    }

    setSaving(true);
    setError("");
    try {
      const effectPayload = {
        effectType: form.effectType,
        effectCount: form.effectCount,
        effectSize: form.effectSize,
        effectSpeed: form.effectSpeed,
        effectColor: form.effectColor,
        effectCustomChar: form.effectCustomChar,
        glowColor: form.glowColor,
        glowOpacity: form.glowOpacity,
        danceStyle: form.danceStyle,
        entryEffect: form.entryEffect,
      };

      if (editingGift) {
        const payload = {
          name: form.name, nameAr: form.nameAr, price: Number(form.price),
          rarity: form.rarity, category: form.category, duration: Number(form.duration),
          comboEnabled: form.comboEnabled, fullScreen: form.fullScreen,
          isActive: form.isActive, sortOrder: Number(form.sortOrder),
          animationType: form.animationType,
          ...effectPayload,
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
        data.append("animationType", form.animationType || "lottie");
        Object.entries(effectPayload).forEach(([k, v]) => data.append(k, v));
        if (form.animationFile) data.append("animation", form.animationFile);
        if (form.webmFile) data.append("webm", form.webmFile);
        if (form.pngFile) data.append("png", form.pngFile);
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
    if (!window.confirm("سيتم إضافة 6 هدايا تجريبية. هل تريد المتابعة؟")) return;
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

  const selectedEffect = EFFECT_TYPES.find((e) => e.value === form.effectType) || EFFECT_TYPES[1];

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
              const effect = EFFECT_TYPES.find((e) => e.value === gift.effectType);
              return (
                <div key={gift._id} style={{ ...styles.card, borderColor: rarity.color + "66" }}>
                  <div style={{ ...styles.rarityStripe, background: rarity.color }} />
                  <div style={styles.thumbWrap}>
                    <GiftPreview
                      animationUrl={gift.pngUrl || gift.animationUrl}
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
                      <span style={{ ...styles.rarityBadge, color: rarity.color, background: rarity.bg }}>{rarity.label}</span>
                      <span style={styles.categoryBadge}>{CATEGORY_LABELS[gift.category] || gift.category}</span>
                    </div>
                    {effect && effect.value !== "none" && (
                      <div style={styles.effectChip}>{effect.emoji} {effect.label}</div>
                    )}
                    <div style={styles.priceRow}>
                      <span style={styles.price}>💎 {gift.price}</span>
                      <span style={{ ...styles.activeBadge, color: gift.isActive ? "#22c55e" : "#ef4444", background: gift.isActive ? "#f0fdf4" : "#fef2f2" }}>
                        {gift.isActive ? "مفعّل" : "معطّل"}
                      </span>
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button style={styles.editBtn} title="تعديل" onClick={() => openEdit(gift)}><FiEdit size={14} /></button>
                    <button style={styles.deleteBtn} title="حذف" onClick={() => handleDelete(gift._id)}><FiTrash2 size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
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

              {/* Basic info grid */}
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الاسم العربي *</label>
                  <input style={styles.input} value={form.nameAr} onChange={(e) => setF("nameAr", e.target.value)} placeholder="مثال: وردة" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الاسم الإنجليزي</label>
                  <input style={styles.input} value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="e.g. Rose" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>السعر (💎)</label>
                  <input style={styles.input} type="number" min="1" value={form.price} onChange={(e) => setF("price", +e.target.value)} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المدة (ثانية)</label>
                  <input style={styles.input} type="number" min="1" max="15" value={form.duration} onChange={(e) => setF("duration", +e.target.value)} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الندرة</label>
                  <select style={styles.input} value={form.rarity} onChange={(e) => setF("rarity", e.target.value)}>
                    {Object.entries(RARITY_META).map(([k, v]) => <option key={k} value={k}>{v.label} ({k})</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الفئة</label>
                  <select style={styles.input} value={form.category} onChange={(e) => setF("category", e.target.value)}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الترتيب</label>
                  <input style={styles.input} type="number" value={form.sortOrder} onChange={(e) => setF("sortOrder", +e.target.value)} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>نوع الحركة *</label>
                  <select style={styles.input} value={form.animationType} onChange={(e) => setF("animationType", e.target.value)}>
                    {ANIM_TYPES.map((t) => <option key={t} value={t}>{t === "png" ? "PNG شفاف" : t}</option>)}
                  </select>
                </div>
              </div>

              {/* Checkboxes */}
              <div style={styles.checkRow}>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.comboEnabled} onChange={(e) => setF("comboEnabled", e.target.checked)} />
                  تفعيل الكومبو
                </label>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.fullScreen} onChange={(e) => setF("fullScreen", e.target.checked)} />
                  شاشة كاملة
                </label>
                <label style={styles.checkLabel}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setF("isActive", e.target.checked)} />
                  مفعّل
                </label>
              </div>

              {/* Files section */}
              {!editingGift && (
                <div style={styles.filesSection}>
                  <div style={styles.filesTitle}><FiBox size={14} /> ملفات الهدية</div>

                  {/* PNG transparent file */}
                  <div style={{ ...styles.fileRow, border: "2px dashed #10b981", borderRadius: 10, padding: "10px 12px", background: "#f0fdf4", marginBottom: 10 }}>
                    <button style={{ ...styles.fileBtn, background: "#d1fae5", color: "#059669", fontWeight: 700 }} onClick={() => pngRef.current?.click()}>
                      🖼️ PNG شفاف (مُوصى به)
                    </button>
                    <div style={{ flex: 1 }}>
                      {previews.png && typeof previews.png === "string" && previews.png.startsWith("data:") ? (
                        <img src={previews.png} style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 8 }} alt="png preview" />
                      ) : (
                        <span style={styles.fileName}>{form.pngFile?.name || "لم يُختر"}</span>
                      )}
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>صورة PNG بخلفية شفافة — ستُعرض مع رقصة TikTok وتأثيرات</div>
                    </div>
                    <input ref={pngRef} type="file" accept="image/png,image/webp" style={{ display: "none" }} onChange={(e) => handleFileChange(e, "png")} />
                  </div>

                  <div style={styles.fileRow}>
                    <button style={styles.fileBtn} onClick={() => animRef.current?.click()}>
                      <FiBox size={14} /> ملف الحركة (Lottie/GIF)
                    </button>
                    <span style={styles.fileName}>{form.animationFile?.name || "لم يُختر"}</span>
                    <input ref={animRef} type="file" accept=".json,.mp4,.gif,.glb" style={{ display: "none" }} onChange={(e) => handleFileChange(e, "animation")} />
                  </div>
                  <div style={{ ...styles.fileRow, border: "1px dashed #a855f7", borderRadius: 8, padding: "8px 10px", background: "#faf5ff" }}>
                    <button style={{ ...styles.fileBtn, background: "#ede9fe", color: "#7c3aed" }} onClick={() => webmRef.current?.click()}>
                      🎬 WebM شفاف (Alpha)
                    </button>
                    <div style={{ flex: 1 }}>
                      <span style={styles.fileName}>{form.webmFile?.name || "لم يُختر"}</span>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>فيديو WebM بخلفية شفافة</div>
                    </div>
                    <input ref={webmRef} type="file" accept=".webm,video/webm" style={{ display: "none" }} onChange={(e) => handleFileChange(e, "webm")} />
                  </div>
                  <div style={styles.fileRow}>
                    <button style={styles.fileBtn} onClick={() => thumbRef.current?.click()}>
                      <FiImage size={14} /> صورة مصغرة *
                    </button>
                    {previews.thumbnail && typeof previews.thumbnail === "string" && previews.thumbnail.startsWith("data:image") ? (
                      <img src={previews.thumbnail} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} alt="thumb" />
                    ) : (
                      <span style={styles.fileName}>{form.thumbnailFile?.name || "لم تُختر (سيُستخدم PNG إن رُفع)"}</span>
                    )}
                    <input ref={thumbRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileChange(e, "thumbnail")} />
                  </div>
                  <div style={styles.fileRow}>
                    <button style={styles.fileBtn} onClick={() => soundRef.current?.click()}>
                      <FiMusic size={14} /> صوت (اختياري)
                    </button>
                    <span style={styles.fileName}>{form.soundFile?.name || "لم يُختر"}</span>
                    <input ref={soundRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={(e) => handleFileChange(e, "sound")} />
                  </div>
                </div>
              )}

              {editingGift && (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0", borderTop: "1px solid #f1f5f9" }}>
                  * لتغيير ملفات الهدية، احذفها وأنشئ هدية جديدة
                </div>
              )}

              {/* ─── Effects Control Panel ──────────────────────────────── */}
              <div style={styles.effectsSection}>
                <button style={styles.effectsToggle} onClick={() => setShowEffects(!showEffects)}>
                  <FiSliders size={15} />
                  🎨 إعدادات التأثيرات والحركة
                  <span style={{ marginRight: "auto", fontSize: 12, color: "#94a3b8" }}>{selectedEffect.emoji} {selectedEffect.label} · {DANCE_STYLES.find(d=>d.value===form.danceStyle)?.label || form.danceStyle}</span>
                  <span>{showEffects ? "▲" : "▼"}</span>
                </button>

                {showEffects && (
                  <div style={styles.effectsBody}>
                    {/* Effect type grid */}
                    <div style={styles.sectionLabel}>نوع الجسيمات حول الهدية</div>
                    <div style={styles.effectGrid}>
                      {EFFECT_TYPES.map((et) => (
                        <button
                          key={et.value}
                          style={{ ...styles.effectChipBtn, ...(form.effectType === et.value ? styles.effectChipBtnActive : {}) }}
                          onClick={() => setF("effectType", et.value)}
                        >
                          <span style={{ fontSize: 20 }}>{et.emoji}</span>
                          <span style={{ fontSize: 11 }}>{et.label}</span>
                        </button>
                      ))}
                    </div>

                    {form.effectType === "custom" && (
                      <div style={styles.formGroupRow}>
                        <label style={styles.label}>رمز مخصص</label>
                        <input style={{ ...styles.input, width: 80, textAlign: "center", fontSize: 20 }} value={form.effectCustomChar} onChange={(e) => setF("effectCustomChar", e.target.value)} maxLength={4} />
                      </div>
                    )}

                    <div style={styles.effectRow}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>عدد الجسيمات: <b>{form.effectCount}</b></label>
                        <input type="range" min={0} max={30} value={form.effectCount} onChange={(e) => setF("effectCount", +e.target.value)} style={{ width: "100%" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>الحجم</label>
                        <select style={styles.input} value={form.effectSize} onChange={(e) => setF("effectSize", e.target.value)}>
                          {["tiny","small","medium","large","huge"].map(s => <option key={s} value={s}>{s === "tiny" ? "صغير جداً" : s === "small" ? "صغير" : s === "medium" ? "متوسط" : s === "large" ? "كبير" : "ضخم"}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>السرعة</label>
                        <select style={styles.input} value={form.effectSpeed} onChange={(e) => setF("effectSpeed", e.target.value)}>
                          <option value="slow">بطيء</option>
                          <option value="medium">متوسط</option>
                          <option value="fast">سريع</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.effectRow}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>لون التوهج خلف الهدية</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="color" value={form.glowColor} onChange={(e) => setF("glowColor", e.target.value)} style={{ height: 36, width: 48, border: "none", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                          <input style={{ ...styles.input, fontFamily: "monospace", fontSize: 13 }} value={form.glowColor} onChange={(e) => setF("glowColor", e.target.value)} maxLength={7} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>شدة التوهج: <b>{Math.round(form.glowOpacity * 100)}%</b></label>
                        <input type="range" min={0} max={100} value={Math.round(form.glowOpacity * 100)} onChange={(e) => setF("glowOpacity", +e.target.value / 100)} style={{ width: "100%" }} />
                      </div>
                    </div>

                    {/* Glow preview */}
                    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                      <div style={{ width: 80, height: 80, borderRadius: 40, background: form.glowColor, opacity: form.glowOpacity, boxShadow: `0 0 40px 20px ${form.glowColor}88` }} />
                    </div>

                    <div style={styles.effectRow}>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>أسلوب الرقصة</label>
                        <select style={styles.input} value={form.danceStyle} onChange={(e) => setF("danceStyle", e.target.value)}>
                          {DANCE_STYLES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={styles.label}>تأثير الدخول</label>
                        <select style={styles.input} value={form.entryEffect} onChange={(e) => setF("entryEffect", e.target.value)}>
                          {ENTRY_EFFECTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live preview */}
              <GiftLivePreview form={form} previews={previews} editingGift={editingGift} />

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
  effectChip: { fontSize: 11, color: "#8b5cf6", background: "#f5f3ff", padding: "2px 8px", borderRadius: 20, fontWeight: 600, marginBottom: 4, display: "inline-block" },
  priceRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 14, fontWeight: 700, color: "#6366f1" },
  activeBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 },
  cardActions: { display: "flex", gap: 6, padding: "8px 12px", borderTop: "1px solid #f1f5f9" },
  editBtn: { flex: 1, padding: "6px 0", background: "#e0e7ff", color: "#6366f1", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 600 },
  deleteBtn: { flex: 1, padding: "6px 0", background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 640, maxHeight: "92vh", overflowY: "auto", direction: "rtl" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" },
  formGroup: { display: "flex", flexDirection: "column" },
  formGroupRow: { display: "flex", alignItems: "center", gap: 10, margin: "8px 0" },
  label: { fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 },
  input: { padding: "9px 11px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", background: "#f8fafc", boxSizing: "border-box", width: "100%" },
  checkRow: { display: "flex", gap: 16, margin: "14px 0", flexWrap: "wrap" },
  checkLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" },
  filesSection: { background: "#f8fafc", borderRadius: 10, padding: 14, marginTop: 4 },
  filesTitle: { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 },
  fileRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  fileBtn: { padding: "6px 12px", background: "#e0e7ff", color: "#4f46e5", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 },
  fileName: { fontSize: 12, color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  // Effects panel
  effectsSection: { border: "1px solid #e2e8f0", borderRadius: 10, marginTop: 14, overflow: "hidden" },
  effectsToggle: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#f8fafc", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#374151", textAlign: "right" },
  effectsBody: { padding: 16, borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 14 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 },
  effectGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 },
  effectChipBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", border: "2px solid #e2e8f0", borderRadius: 10, cursor: "pointer", background: "#fff", transition: "all 0.15s" },
  effectChipBtnActive: { border: "2px solid #6366f1", background: "#eef2ff" },
  effectRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 },
  saveBtn: { padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6 },
  cancelBtn: { padding: "10px 20px", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  errorBox: { background: "#fee2e2", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
};

// Preview panel styles
const pvStyles = {
  wrap:       { marginTop: 16, border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#0f172a" },
  header:     { padding: "8px 14px", background: "#1e293b", color: "#94a3b8", fontSize: 12, fontWeight: 700, letterSpacing: 1 },
  stage:      { position: "relative", height: 220, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "linear-gradient(160deg,#0f172a 0%,#1e1b4b 100%)" },
  glow:       { position: "absolute", width: 180, height: 180, borderRadius: "50%", pointerEvents: "none", zIndex: 0 },
  giftImg:    { width: 140, height: 140, objectFit: "contain", position: "relative", zIndex: 2, filter: "drop-shadow(0 0 18px rgba(255,215,0,0.5))" },
  placeholder:{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 48, textAlign: "center", color: "#475569", zIndex: 2 },
  pill:       { position: "absolute", bottom: 12, left: 12, display: "flex", alignItems: "center", gap: 7, background: "rgba(0,0,0,0.75)", padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", zIndex: 10 },
  pillAvatar: { width: 28, height: 28, borderRadius: 14, background: "rgba(160,32,240,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, border: "2px solid #FFD700" },
  priceBadge: { position: "absolute", top: 10, right: 12, background: "rgba(0,0,0,0.7)", color: "#6366f1", fontWeight: 800, fontSize: 13, padding: "3px 10px", borderRadius: 14, zIndex: 10 },
  comboBadge: { position: "absolute", top: 10, left: 12, background: "#FF4444", color: "#fff", fontWeight: 800, fontSize: 11, padding: "3px 9px", borderRadius: 12, border: "1.5px solid #FFD700", zIndex: 10, transform: "rotate(-8deg)" },
  footer:     { display: "flex", alignItems: "center", gap: 16, padding: "8px 14px", background: "#1e293b", justifyContent: "space-between" },
};

export default GiftManagement;
