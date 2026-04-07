const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'mobile/src/screens/LiveRoomScreen.js');
let c = fs.readFileSync(filePath, 'utf8');

// We need to:
// 1. Make the seatWrap a TouchableOpacity when seat is empty (calls handleRaiseHand)
// 2. The Seat component receives index and speaker — we need to pass handleRaiseHand or isListener/isHost info

// Current pattern:
const oldSeat = '    return (\r\n      <View style={styles.seatWrap}>\r\n        <View\r\n          style={[\r\n            styles.seatCircle,\r\n            !user && styles.seatEmpty,\r\n            !speaker?.isMuted && user && styles.seatActive,\r\n            isSpeaking && styles.seatSpeaking,\r\n          ]}\r\n        >';

if (!c.includes(oldSeat)) {
  console.log('ERROR: pattern not found');
  process.exit(1);
}

// Replace with TouchableOpacity wrapper for empty seats
// isHost and isListener checks done inline so we don't need to add props
const newSeat = '    const isListener = room?.listeners?.some((l) => l.user?._id === userInfo?._id);\r\n    const isHostSeat = room?.host?._id === userInfo?._id;\r\n    const isSpeakerAlready = room?.speakers?.some((s) => s.user?._id === userInfo?._id);\r\n    const canRequestSeat = !user && !isHostSeat && !isSpeakerAlready;\r\n\r\n    const SeatWrapper = canRequestSeat ? TouchableOpacity : View;\r\n    const wrapperProps = canRequestSeat\r\n      ? { onPress: handleRaiseHand, activeOpacity: 0.7 }\r\n      : {};\r\n\r\n    return (\r\n      <SeatWrapper style={styles.seatWrap} {...wrapperProps}>\r\n        <View\r\n          style={[\r\n            styles.seatCircle,\r\n            !user && styles.seatEmpty,\r\n            !speaker?.isMuted && user && styles.seatActive,\r\n            isSpeaking && styles.seatSpeaking,\r\n          ]}\r\n        >';

c = c.replace(oldSeat, newSeat);
console.log('seat wrapper added:', c.includes('SeatWrapper'));

// Also need to close with SeatWrapper instead of </View> at end of Seat component
// Find the closing of seatWrap
const oldClose = '      </View>\r\n    );\r\n  };\r\n\r\n  const SeatGrid';
const newClose = '      </SeatWrapper>\r\n    );\r\n  };\r\n\r\n  const SeatGrid';

if (!c.includes(oldClose)) {
  console.log('ERROR: closing View pattern not found');
  process.exit(1);
}
c = c.replace(oldClose, newClose);
console.log('seat closing replaced:', c.includes('</SeatWrapper>'));

fs.writeFileSync(filePath, c);
console.log('Done. Lines:', c.split('\r\n').length);
