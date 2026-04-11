const VipLevel = require("../models/VipLevel");

// In-memory cache for thresholds (refreshed every 5 minutes)
let _cachedThresholds = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Load VIP level thresholds from the database.
 * Returns sorted array of { level, giftThreshold } for levels where giftThreshold > 0.
 */
async function loadThresholdsFromDB() {
  const now = Date.now();
  if (_cachedThresholds && now - _cacheTime < CACHE_TTL) {
    return _cachedThresholds;
  }
  try {
    const levels = await VipLevel.find({ isActive: true, giftThreshold: { $gt: 0 } })
      .select("level giftThreshold")
      .sort({ level: -1 })
      .lean();
    _cachedThresholds = levels;
    _cacheTime = now;
    return levels;
  } catch {
    return _cachedThresholds || [];
  }
}

/** Invalidate the in-memory cache (call after admin changes thresholds) */
function invalidateLevelCache() {
  _cachedThresholds = null;
  _cacheTime = 0;
}

/**
 * Calculate user VIP level based on total coins spent — uses DB thresholds.
 * Falls back to static table if DB not available.
 * @param {number} totalSpent
 * @param {Array} thresholds - optional pre-loaded [{level, giftThreshold}] sorted desc
 * @returns {number} VIP level (0 = no level)
 */
function calculateLevelFromSpent(totalSpent, thresholds = null) {
  if (!totalSpent || totalSpent < 0) return 0;

  // If caller provided thresholds (loaded async), use them
  if (thresholds && thresholds.length > 0) {
    // thresholds sorted desc by level — find highest level whose threshold is met
    for (const t of thresholds) {
      if (totalSpent >= t.giftThreshold) return t.level;
    }
    return 0;
  }

  // Static fallback (used synchronously when DB thresholds not available)
  if (totalSpent < 1000) return 0;
  if (totalSpent < 5000) return 1;
  if (totalSpent < 10000) return 2;
  if (totalSpent < 25000) return 3;
  if (totalSpent < 50000) return 4;
  if (totalSpent < 100000) return 5;
  if (totalSpent < 200000) return 6;
  if (totalSpent < 500000) return 7;
  if (totalSpent < 1000000) return 8;
  if (totalSpent < 5000000) return 9;
  return 10;
}

module.exports = { calculateLevelFromSpent, loadThresholdsFromDB, invalidateLevelCache };
