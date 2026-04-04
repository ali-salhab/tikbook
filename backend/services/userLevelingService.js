/**
 * Calculate user level based on total coins spent
 * @param {number} totalSpent - Total coins user has spent
 * @returns {number} User level (1 or higher)
 */
function calculateLevelFromSpent(totalSpent) {
  if (!totalSpent || totalSpent < 0) return 0;
  
  // Custom leveling logic based on threshold
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
  
  // Max level or logic for higher levels
  return 10;
}

module.exports = { calculateLevelFromSpent };
