const fs = require('fs');
const c = fs.readFileSync('mobile/src/screens/LiveRoomScreen.js', 'utf8');

// Use a substring that definitely exists (no apostrophe issue)
const old = "    const slots = Array(maxSeats).fill(null).map((_, i) => speakers[i] || null);\r\n    const rows = [];\r\n    for (let r = 0; r < Math.ceil(maxSeats / 4); r++) {";

const replacement = "    const listenerSlots = (room?.listeners || [])\r\n      .filter((l) => l.user && l.user._id !== hostId)\r\n      .map((l) => ({ user: l.user, isListener: true, isMuted: true }));\r\n    const combined = [...speakers, ...listenerSlots].slice(0, maxSeats);\r\n    const slots = Array(maxSeats).fill(null).map((_, i) => combined[i] || null);\r\n    const rows = [];\r\n    for (let r = 0; r < Math.ceil(maxSeats / 4); r++) {";

if (c.includes(old)) {
  fs.writeFileSync('mobile/src/screens/LiveRoomScreen.js', c.replace(old, replacement), 'utf8');
  console.log('OK');
} else {
  console.log('NOT FOUND - searching fragment...');
  console.log('has slots line:', c.includes('const slots = Array(maxSeats)'));
}
