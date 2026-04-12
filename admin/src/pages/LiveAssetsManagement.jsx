import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrash2, FiUpload, FiPlus } from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { api } from "../config/api";

const DEFAULT_GIFT_FORM = {
  name: "",
  coinPrice: 10,
  rarity: "common",
  animationType: "lottie",
  animationFile: null,
  thumbnailFile: null,
  soundFile: null,
};

const LiveAssetsManagement = ({ onLogout }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  const [loading, setLoading] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [giftForm, setGiftForm] = useState(DEFAULT_GIFT_FORM);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchData();
  }, [token, navigate]);

  const authHeader = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const giftsRes = await api.get("/live-engagement/gifts", authHeader);
      setGifts(giftsRes.data?.gifts || []);
    } catch (error) {
      console.error("Failed to fetch live assets:", error);
      alert("Failed to load live assets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGift = async (event) => {
    event.preventDefault();

    if (!giftForm.name || !giftForm.animationFile || !giftForm.thumbnailFile) {
      alert("Gift name, animation file and thumbnail are required.");
      return;
    }

    const data = new FormData();
    data.append("name", giftForm.name);
    data.append("nameAr", giftForm.name);
    data.append("coinPrice", String(giftForm.coinPrice));
    data.append("price", String(giftForm.coinPrice));
    data.append("rarity", giftForm.rarity);
    data.append("animationType", giftForm.animationType);
    data.append("animation", giftForm.animationFile);
    data.append("thumbnail", giftForm.thumbnailFile);
    if (giftForm.soundFile) {
      data.append("sound", giftForm.soundFile);
    }

    try {
      await api.post("/live-engagement/admin/gifts", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setGiftForm(DEFAULT_GIFT_FORM);
      fetchData();
    } catch (error) {
      console.error("Create gift failed:", error);
      alert("Failed to create gift");
    }
  };

  const handleDeleteGift = async (id) => {
    if (!window.confirm("Delete this gift?")) return;

    try {
      await api.delete(`/live-engagement/admin/gifts/${id}`, authHeader);
      fetchData();
    } catch (error) {
      console.error("Delete gift failed:", error);
      alert("Failed to delete gift");
    }
  };

  return (
    <AdminLayout title="Live Assets" onLogout={onLogout}>
      <div style={styles.page}>
        <h2 style={styles.heading}>أصول البث المباشر — الهدايا</h2>

        <div style={styles.grid}>
          <section style={styles.panel}>
            <h3 style={styles.panelTitle}>رفع هدية جديدة</h3>
            <form onSubmit={handleCreateGift} style={styles.form}>
              <input
                style={styles.input}
                placeholder="Gift name"
                value={giftForm.name}
                onChange={(e) =>
                  setGiftForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />

              <input
                style={styles.input}
                type="number"
                min={1}
                placeholder="Coin price"
                value={giftForm.coinPrice}
                onChange={(e) =>
                  setGiftForm((prev) => ({ ...prev, coinPrice: Number(e.target.value) }))
                }
              />

              <select
                style={styles.input}
                value={giftForm.rarity}
                onChange={(e) =>
                  setGiftForm((prev) => ({ ...prev, rarity: e.target.value }))
                }
              >
                {["common", "rare", "epic", "legendary", "mythic"].map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {rarity}
                  </option>
                ))}
              </select>

              <label style={styles.fileLabel}>
                <FiUpload /> Animation file (Lottie/video)
                <input
                  type="file"
                  accept=".json,.mp4,.mov,.avi,.mkv,.glb,.gltf"
                  onChange={(e) =>
                    setGiftForm((prev) => ({
                      ...prev,
                      animationFile: e.target.files?.[0] || null,
                    }))
                  }
                />
              </label>

              <label style={styles.fileLabel}>
                <FiUpload /> Thumbnail image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setGiftForm((prev) => ({
                      ...prev,
                      thumbnailFile: e.target.files?.[0] || null,
                    }))
                  }
                />
              </label>

              <label style={styles.fileLabel}>
                <FiUpload /> Sound (optional)
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) =>
                    setGiftForm((prev) => ({
                      ...prev,
                      soundFile: e.target.files?.[0] || null,
                    }))
                  }
                />
              </label>

              <button type="submit" style={styles.primaryBtn}>
                <FiPlus /> Save Gift
              </button>
            </form>

            <div style={styles.listWrap}>
              {gifts.map((gift) => (
                <div key={gift._id || gift.id} style={styles.assetRow}>
                  <div>
                    <div style={styles.assetTitle}>{gift.name}</div>
                    <div style={styles.assetMeta}>
                      {gift.coinPrice || gift.price} coins • {gift.rarity || "common"}
                    </div>
                  </div>
                  <button
                    style={styles.iconDanger}
                    onClick={() => handleDeleteGift(gift._id || gift.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {loading ? <p style={styles.loading}>Loading...</p> : null}
      </div>
    </AdminLayout>
  );
};

const styles = {
  page: {
    padding: 24,
    direction: "rtl",
  },
  heading: {
    margin: "0 0 16px",
    color: "#0f172a",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 16,
  },
  panel: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 8px rgba(15,23,42,0.05)",
  },
  panelTitle: {
    margin: "0 0 12px",
    color: "#1e293b",
    fontSize: 17,
  },
  form: {
    display: "grid",
    gap: 10,
    marginBottom: 16,
  },
  input: {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    padding: "10px 12px",
    background: "#f8fafc",
    boxSizing: "border-box",
  },
  fileLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    border: "1px dashed #94a3b8",
    borderRadius: 10,
    color: "#334155",
    cursor: "pointer",
  },
  primaryBtn: {
    border: "none",
    borderRadius: 10,
    background: "#0ea5e9",
    color: "#fff",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  listWrap: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
    display: "grid",
    gap: 8,
  },
  assetRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 10,
    background: "#f8fafc",
  },
  assetTitle: {
    color: "#0f172a",
    fontWeight: 700,
    fontSize: 13,
  },
  assetMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 2,
  },
  iconDanger: {
    border: "none",
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: 8,
    width: 34,
    height: 34,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    marginTop: 14,
    color: "#64748b",
  },
};

export default LiveAssetsManagement;

