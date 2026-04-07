const fs = require('fs');
let c = fs.readFileSync('mobile/src/screens/LiveRoomScreen.js', 'utf8');

// 1. Add settings_updated socket listener after liveroom:kicked listener
const afterKicked = '    });\r\n  };\r\n\r\n  // \u2500\u2500\u2500 BACKEND';
const newListener = '    });\r\n    socket.on("liveroom:settings_updated", fetchRoomData);\r\n  };\r\n\r\n  // \u2500\u2500\u2500 BACKEND';
if (!c.includes('liveroom:settings_updated')) {
  c = c.replace(afterKicked, newListener);
  console.log('socket listener added:', c.includes('liveroom:settings_updated'));
} else {
  console.log('socket listener already present');
}

// 2. Add seatEmpty style to seatCircle array in Seat component
const oldSeatStyles = '            styles.seatCircle,\r\n            !speaker?.isMuted && user && styles.seatActive,';
const newSeatStyles = '            styles.seatCircle,\r\n            !user && styles.seatEmpty,\r\n            !speaker?.isMuted && user && styles.seatActive,';
if (c.includes(oldSeatStyles)) {
  c = c.replace(oldSeatStyles, newSeatStyles);
  console.log('seatEmpty condition added: OK');
} else {
  console.log('WARN: seatEmpty condition not inserted');
}

// 3. seatGrid style
const oldSeatGrid = 'seatGrid: { paddingHorizontal: ms(8), gap: ms(6), marginTop: ms(4) },';
const newSeatGrid = 'seatGrid: {\r\n    paddingHorizontal: ms(4),\r\n    gap: ms(8),\r\n    marginTop: ms(10),\r\n    backgroundColor: "rgba(0,0,0,0.32)",\r\n    borderRadius: ms(18),\r\n    paddingVertical: ms(14),\r\n    marginHorizontal: ms(6),\r\n  },';
if (c.includes(oldSeatGrid)) {
  c = c.replace(oldSeatGrid, newSeatGrid);
  console.log('seatGrid style updated: OK');
}

// 4. seatRow
const oldSeatRow = 'seatRow: { flexDirection: "row", justifyContent: "space-around" },';
const newSeatRow = 'seatRow: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center" },';
if (c.includes(oldSeatRow)) {
  c = c.replace(oldSeatRow, newSeatRow);
  console.log('seatRow updated: OK');
}

// 5. seatWrap
const oldSeatWrap = 'seatWrap: { alignItems: "center", width: SEAT_SIZE + 12 },';
const newSeatWrap = 'seatWrap: { alignItems: "center", width: SEAT_SIZE + ms(14) },';
if (c.includes(oldSeatWrap)) {
  c = c.replace(oldSeatWrap, newSeatWrap);
  console.log('seatWrap updated: OK');
}

// 6. seatCircle - improve base style + add seatEmpty
const oldSeatCircle = 'seatCircle: {\r\n    width: SEAT_SIZE,\r\n    height: SEAT_SIZE,\r\n    borderRadius: SEAT_SIZE / 2,\r\n    backgroundColor: "rgba(0,0,0,0.52)",\r\n    borderWidth: 1.5,\r\n    borderColor: "rgba(255,255,255,0.22)",\r\n    justifyContent: "center",\r\n    alignItems: "center",\r\n    // No overflow:hidden \u2014 badge frames extend beyond the circle\r\n  },';
const newSeatCircle = 'seatCircle: {\r\n    width: SEAT_SIZE,\r\n    height: SEAT_SIZE,\r\n    borderRadius: SEAT_SIZE / 2,\r\n    backgroundColor: "rgba(255,255,255,0.07)",\r\n    borderWidth: 1.5,\r\n    borderColor: "rgba(255,255,255,0.2)",\r\n    justifyContent: "center",\r\n    alignItems: "center",\r\n  },\r\n  seatEmpty: {\r\n    borderStyle: "dashed",\r\n    borderColor: "rgba(255,255,255,0.28)",\r\n    backgroundColor: "rgba(255,255,255,0.04)",\r\n  },';
if (c.includes(oldSeatCircle)) {
  c = c.replace(oldSeatCircle, newSeatCircle);
  console.log('seatCircle + seatEmpty styles added: OK');
} else {
  console.log('WARN: seatCircle pattern not found');
}

// 7. seatActive
const oldSeatActive = 'seatActive: { borderColor: "#00BB55", borderWidth: 2 },';
const newSeatActive = 'seatActive: { borderColor: "#00CC55", borderWidth: 2.5 },';
if (c.includes(oldSeatActive)) {
  c = c.replace(oldSeatActive, newSeatActive);
  console.log('seatActive updated: OK');
}

// 8. seatNum - move to bottom-right, pink accent
const oldSeatNum = 'seatNum: {\r\n    position: "absolute",\r\n    bottom: ms(-2),\r\n    left: ms(-4),\r\n    backgroundColor: "rgba(0,0,0,0.72)",\r\n    paddingHorizontal: ms(4),\r\n    paddingVertical: ms(1),\r\n    borderRadius: ms(6),\r\n    minWidth: ms(16),\r\n    alignItems: "center",\r\n  },';
const newSeatNum = 'seatNum: {\r\n    position: "absolute",\r\n    bottom: ms(-2),\r\n    right: ms(-2),\r\n    backgroundColor: "rgba(254,44,85,0.82)",\r\n    paddingHorizontal: ms(3.5),\r\n    paddingVertical: ms(1),\r\n    borderRadius: ms(6),\r\n    minWidth: ms(14),\r\n    alignItems: "center",\r\n  },';
if (c.includes(oldSeatNum)) {
  c = c.replace(oldSeatNum, newSeatNum);
  console.log('seatNum updated: OK');
}

// 9. seatNumText
const oldSeatNumText = 'seatNumText: { color: "#FFF", fontSize: fs(8) },';
const newSeatNumText = 'seatNumText: { color: "#FFF", fontSize: fs(7.5), fontWeight: "700" },';
if (c.includes(oldSeatNumText)) {
  c = c.replace(oldSeatNumText, newSeatNumText);
  console.log('seatNumText updated: OK');
}

// 10. seatLabel - brighter
const oldSeatLabel = 'seatLabel: {\r\n    color: "rgba(255,255,255,0.75)",\r\n    fontSize: fs(9),\r\n    marginTop: ms(4),\r\n  },';
const newSeatLabel = 'seatLabel: {\r\n    color: "rgba(255,255,255,0.88)",\r\n    fontSize: fs(9.5),\r\n    marginTop: ms(5),\r\n    fontWeight: "500",\r\n  },';
if (c.includes(oldSeatLabel)) {
  c = c.replace(oldSeatLabel, newSeatLabel);
  console.log('seatLabel updated: OK');
}

fs.writeFileSync('mobile/src/screens/LiveRoomScreen.js', c);
console.log('Done. Lines:', c.split('\r\n').length);
