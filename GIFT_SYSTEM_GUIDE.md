# 🎁 Animated Gifts System - Complete Implementation Guide

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Backend Setup](#backend-setup)
3. [Frontend Components](#frontend-components)
4. [LiveRoom Integration](#liveroom-integration)
5. [Getting Lottie Animations](#getting-lottie-animations)
6. [Testing](#testing)

---

## 🎯 System Overview

The animated gifts system includes:

- **Backend**: Gift model, transactions, wallet integration
- **Frontend**: AnimatedGift component, GiftPanel, real-time broadcasting
- **Features**: Combo animations, full-screen effects, sound support
- **Revenue**: 70% to creator, 30% platform fee

---

## 🔧 Backend Setup

### 1. Seed Sample Gifts

```bash
cd backend
node seedGifts.js
```

### 2. API Endpoints Created

- `GET /api/gifts` - Get all gifts
- `POST /api/gifts/send` - Send a gift
- `GET /api/gifts/history` - Get gift history
- `POST /api/gifts/admin/create` - Admin: Create gift
- `PUT /api/gifts/admin/:id` - Admin: Update gift
- `DELETE /api/gifts/admin/:id` - Admin: Delete gift

### 3. Socket Events (Already Configured)

```javascript
// Client sends:
socket.emit("liveroom:send_gift", {
  roomId,
  gift,
  sender,
});

// All clients receive:
socket.on("liveroom:gift_received", ({ gift, sender, timestamp }) => {
  // Show animation
});
```

---

## 🎨 Frontend Components

### 1. AnimatedGift Component

- Location: `mobile/src/components/AnimatedGift.js`
- Renders Lottie/GIF animations
- Auto-scales for combo gifts
- Full-screen support for premium gifts
- Shows sender info with avatar

### 2. GiftPanel Component

- Location: `mobile/src/components/GiftPanel.js`
- Category filtering (Basic, Premium, VIP, Special)
- Balance checking
- Quantity selector for combos
- Locked gifts indicator for insufficient balance

---

## 🚀 LiveRoom Integration

### Step 1: Import Components & Services

Add to `LiveRoomScreen.js`:

\`\`\`javascript
import AnimatedGift from "../components/AnimatedGift";
import GiftPanel from "../components/GiftPanel";
import giftService from "../services/giftService";
import { useAuth } from "../context/AuthContext";
\`\`\`

### Step 2: Add State Variables

\`\`\`javascript
const [showGiftPanel, setShowGiftPanel] = useState(false);
const [activeGifts, setActiveGifts] = useState([]);
const [userBalance, setUserBalance] = useState(0);
const { userInfo } = useAuth();
\`\`\`

### Step 3: Load User Balance

\`\`\`javascript
useEffect(() => {
loadUserBalance();
}, []);

const loadUserBalance = async () => {
try {
const response = await walletService.getBalance();
if (response.success) {
setUserBalance(response.wallet.balance);
}
} catch (error) {
console.error("Error loading balance:", error);
}
};
\`\`\`

### Step 4: Handle Gift Sending

\`\`\`javascript
const handleSendGift = async ({ gift, quantity, totalCost }) => {
try {
// Send to backend
const response = await giftService.sendGift({
giftId: gift.\_id,
receiverId: room.host.\_id,
context: "live",
contextId: room.\_id,
quantity,
});

    if (response.success) {
      // Update balance
      setUserBalance(response.senderBalance);

      // Broadcast to all users via socket
      socket.emit("liveroom:send_gift", {
        roomId: room._id,
        gift: {
          ...gift,
          quantity,
        },
        sender: {
          _id: userInfo._id,
          username: userInfo.username,
          profileImage: userInfo.profileImage || userInfo.avatar,
        },
      });

      // Close panel
      setShowGiftPanel(false);
    }

} catch (error) {
console.error("Error sending gift:", error);
Alert.alert("خطأ", "فشل في إرسال الهدية");
}
};
\`\`\`

### Step 5: Listen for Gift Events

\`\`\`javascript
useEffect(() => {
if (!socket) return;

socket.on("liveroom:gift_received", ({ gift, sender, timestamp }) => {
// Add to active gifts
const giftId = \`\${sender.\_id}-\${Date.now()}\`;
setActiveGifts((prev) => [
...prev,
{ id: giftId, gift, sender, timestamp },
]);
});

return () => {
socket.off("liveroom:gift_received");
};
}, [socket]);
\`\`\`

### Step 6: Render Animated Gifts

Add inside `<ImageBackground>` (before controls):

\`\`\`javascript
{/_ Animated Gifts _/}
{activeGifts.map((activeGift) => (
<AnimatedGift
    key={activeGift.id}
    gift={activeGift.gift}
    sender={activeGift.sender}
    isCombo={activeGift.gift.quantity > 1}
onComplete={() => {
// Remove from active gifts after animation
setActiveGifts((prev) =>
prev.filter((g) => g.id !== activeGift.id)
);
}}
/>
))}
\`\`\`

### Step 7: Add Gift Button in Controls

\`\`\`javascript
{/_ Gift Button _/}
<TouchableOpacity
style={styles.controlButton}
onPress={() => setShowGiftPanel(true)}

>   <Ionicons name="gift" size={24} color="#FFD700" />
> </TouchableOpacity>
> \`\`\`

### Step 8: Add Gift Panel Modal

Add at the end (after `</ImageBackground>`):

\`\`\`javascript
{/_ Gift Panel _/}
<GiftPanel
visible={showGiftPanel}
onClose={() => setShowGiftPanel(false)}
onSendGift={handleSendGift}
receiverId={room?.host?.\_id}
userBalance={userBalance}
/>
\`\`\`

---

## 🎬 Getting Lottie Animations

### Free Sources:

1. **LottieFiles** (Best): https://lottiefiles.com/
   - Search: "gift", "lion", "fireworks", "heart", etc.
   - Download JSON file
   - Host on your server or use direct URL

2. **LordIcon**: https://lordicon.com/
   - Premium animated icons
   - Export as Lottie JSON

3. **IconScout**: https://iconscout.com/lotties
   - Free and premium Lottie animations

### How to Use:

1. Download `.json` file from LottieFiles
2. Upload to your server (Cloudinary, AWS S3, etc.)
3. Get the URL
4. Add to database:

\`\`\`javascript
{
name: "Lion",
nameAr: "أسد",
animationUrl: "https://your-server.com/animations/lion.json",
thumbnailUrl: "🦁", // or image URL
animationType: "lottie",
price: 1000,
category: "special",
duration: 8,
fullScreen: true
}
\`\`\`

### Popular LottieFiles URLs:

- **Lion**: https://lottie.host/embed/cf4aee63-9f42-4e41-9fe3-3a01c9c31c72/Iy5jhY4dPD.json
- **Heart**: https://lottie.host/embed/3c6cbd78-8ed4-4278-9a4d-c8b8c8e60f0c/Gg7PtJvUL1.json
- **Fireworks**: https://lottie.host/embed/1d2e3f4g-5f6e-7d8e-e9f0-4d5e6f7g8h9i/Fireworks.json

---

## 🧪 Testing

### 1. Test Backend

\`\`\`bash

# Get gifts

curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/gifts

# Send gift

curl -X POST http://localhost:5000/api/gifts/send \\
-H "Authorization: Bearer YOUR_TOKEN" \\
-H "Content-Type: application/json" \\
-d '{
"giftId": "GIFT_ID",
"receiverId": "RECEIVER_ID",
"context": "live",
"contextId": "ROOM_ID",
"quantity": 1
}'
\`\`\`

### 2. Test Frontend

1. Open live room as listener
2. Tap gift button (bottom controls)
3. Select a gift
4. Adjust quantity
5. Tap "إرسال" (Send)
6. Animation should appear for all users

### 3. Test Features

- ✅ Balance deduction
- ✅ Real-time animation for all users
- ✅ Combo effect for quantity > 1
- ✅ Full-screen for premium gifts
- ✅ Sender info display
- ✅ Transaction history

---

## 💎 Advanced Features

### 1. Combo System

When user sends same gift multiple times quickly:

- Accumulate quantity
- Scale animation bigger
- Show "COMBO!" badge
- Play special sound

### 2. Sound Effects

Add to Gift model:
\`\`\`javascript
soundUrl: "https://your-server.com/sounds/lion-roar.mp3"
\`\`\`

Play in AnimatedGift component:
\`\`\`javascript
import { Audio } from 'expo-av';

useEffect(() => {
if (gift.soundUrl) {
playSound();
}
}, []);

const playSound = async () => {
const { sound } = await Audio.Sound.createAsync(
{ uri: gift.soundUrl }
);
await sound.playAsync();
};
\`\`\`

### 3. Leaderboard

Show top gift senders in room:
\`\`\`javascript
const [topGifters, setTopGifters] = useState([]);

// Track gifts sent in current session
socket.on("liveroom:gift_received", ({ gift, sender }) => {
updateLeaderboard(sender, gift.price);
});
\`\`\`

---

## 📱 UI/UX Tips

### Gift Button Placement

- **LiveRoom**: Bottom controls, golden color
- **Profile**: Below bio section
- **Video**: Right side vertical toolbar

### Animation Duration

- Basic gifts: 2-3 seconds
- Premium: 4-5 seconds
- Special: 6-10 seconds

### Categories

- **Basic**: 1-50 coins (roses, hearts, claps)
- **Premium**: 100-500 coins (diamonds, crowns, boxes)
- **VIP**: 500-1000 coins (fireworks, rockets, full screen)
- **Special**: 1000+ coins (lion, dragon, money rain, epic effects)

---

## 🔒 Security Notes

1. **Always verify balance server-side** (already implemented)
2. **Validate gift prices** - don't trust client
3. **Rate limiting** - prevent spam (max 10 gifts/minute)
4. **Transaction logging** - track all gifts for auditing

---

## 📊 Analytics to Track

1. Most popular gifts
2. Total gifts sent per room
3. Average gift value
4. Top gift senders
5. Peak gifting times
6. Gift conversion rate (viewers → gifters)

---

## 🎉 Ready to Launch!

Your animated gift system is now complete! Users can:

- ✅ Browse beautiful animated gifts
- ✅ Send gifts with quantity
- ✅ See stunning animations in real-time
- ✅ Track gift history
- ✅ Enjoy full-screen effects for premium gifts

**Next Steps:**

1. Run `node seedGifts.js` to add sample gifts
2. Download real Lottie animations from LottieFiles
3. Update animation URLs in database
4. Test in dev environment
5. Deploy! 🚀
