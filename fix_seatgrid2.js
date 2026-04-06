const fs = require('fs');
const raw = fs.readFileSync('mobile/src/screens/LiveRoomScreen.js', 'utf8');
// Work with CRLF as-is
const old = "    const slots = Array(8)\r\n      .fill(null)\r\n      .map((_, i) => speakers[i] || null);\r\n    return (\r\n      <View style={styles.seatGrid}>\r\n        <View style={styles.seatRow}>\r\n          {[0, 1, 2, 3].map((i) => (\r\n            <Seat key={i} index={i} speaker={slots[i]} />\r\n          ))}\r\n        </View>\r\n        <View style={styles.seatRow}>\r\n          {[4, 5, 6, 7].map((i) => (\r\n            <Seat key={i} index={i} speaker={slots[i]} />\r\n          ))}\r\n        </View>\r\n      </View>\r\n    );\r\n  };";

const replacement = "    const maxSeats = Math.max(1, Math.min(12, room?.maxSpeakers ?? 8));\r\n    const slots = Array(maxSeats).fill(null).map((_, i) => speakers[i] || null);\r\n    const rows = [];\r\n    for (let r = 0; r < Math.ceil(maxSeats / 4); r++) {\r\n      rows.push(slots.slice(r * 4, r * 4 + 4));\r\n    }\r\n    return (\r\n      <View style={styles.seatGrid}>\r\n        {rows.map((row, r) => (\r\n          <View key={r} style={styles.seatRow}>\r\n            {row.map((speaker, i) => (\r\n              <Seat key={r * 4 + i} index={r * 4 + i} speaker={speaker} />\r\n            ))}\r\n          </View>\r\n        ))}\r\n      </View>\r\n    );\r\n  };";

if (raw.includes(old)) {
  fs.writeFileSync('mobile/src/screens/LiveRoomScreen.js', raw.replace(old, replacement));
  console.log('OK');
} else {
  console.log('NOT FOUND');
}
