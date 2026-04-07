const fs = require('fs');
const c = fs.readFileSync('mobile/src/screens/LiveRoomScreen.js', 'utf8');

const old = "SeatGrid = () => {\r\n    const hostId = room?.host?._id;\r\n    // Filter out the host from speakers so they don't appear in seat grid\r\n    const speakers = (room?.speakers || []).filter(\r\n      (s) => s.user._id !== hostId,\r\n    );\r\n    const maxSeats = Math.max(1, Math.min(12, room?.maxSpeakers ?? 8));\r\n    const slots = Array(maxSeats).fill(null).map((_, i) => speakers[i] || null);";

const replacement = "SeatGrid = () => {\r\n    const hostId = room?.host?._id;\r\n    // Speakers first (excluding host), then fill remaining seats with listeners\r\n    const speakers = (room?.speakers || []).filter(\r\n      (s) => s.user._id !== hostId,\r\n    );\r\n    const listenerSlots = (room?.listeners || [])\r\n      .filter((l) => l.user && l.user._id !== hostId)\r\n      .map((l) => ({ user: l.user, isListener: true, isMuted: true }));\r\n    const maxSeats = Math.max(1, Math.min(12, room?.maxSpeakers ?? 8));\r\n    const combined = [...speakers, ...listenerSlots].slice(0, maxSeats);\r\n    const slots = Array(maxSeats).fill(null).map((_, i) => combined[i] || null);";

if (c.includes(old)) {
  fs.writeFileSync('mobile/src/screens/LiveRoomScreen.js', c.replace(old, replacement), 'utf8');
  console.log('OK');
} else {
  console.log('NOT FOUND');
}
