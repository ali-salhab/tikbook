# Live Room Engagement System

## 1. Full architecture

### Client (React Native)
- `LiveRoomScreen`: orchestrates room state, socket connection, chat, gifts, and overlays.
- `LiveVideoPlayer`: base layer for live stream/audio room surface.
- `LiveChat`: virtualized high-throughput chat list (`FlatList`) with controlled input send.
- `VipCommentMessage`: renders VIP message bubble with optional Lottie frame behind content.
- `GiftSelector`: bottom sheet selector for gifts (icon/price/rarity/preview).
- `GiftOverlay` + `LiveGiftAnimation`: throttled queue playback for multiple gift effects.
- `JoinAnimation`: VIP join announcement with optional Lottie animation.
- `useLiveRoomSocket`: handles room join/leave, chat events, gift events, and viewer counts.

### Backend (Node.js + Socket.io + MongoDB)
- `liveEngagementRoutes`: REST catalog APIs + admin upload APIs.
- `liveEngagementController`: VIP tier catalog, VIP frame CRUD, gift catalog CRUD, room message history.
- `liveEngagementSocketService`: realtime event handlers for presence/chat/gifts with rate limiting and gift batching.
- Existing server keeps legacy events and adds a clean scalable namespace:
  - `live:room:*`
  - `live:chat:*`
  - `live:gift:*`

### Data layer
- `VipLevel` extended with engagement perks and style properties.
- `VipFrame` model for VIP frame assets.
- `Gift` extended for `coinPrice`, `rarity`, `lottieUrl`, and `previewImage`.
- `LiveChatMessage` model for transient room chat history with TTL index.

## 2. React Native code examples

### Sending chat message
```ts
const ok = await sendChatMessage(text, activeFrameUrl);
if (!ok) {
  // Optional retry/toast
}
```

### Sending gift event after purchase validation
```ts
const transaction = await onSendGiftTransaction?.(gift, 1);
if (!transaction || transaction.ok) {
  await sendGiftEvent(gift, 1, null);
}
```

### VIP frame rendering
```tsx
<VipCommentMessage
  avatar={item.avatar}
  username={item.username}
  message={item.message}
  vipLevel={Number(item.vipLevel || 0)}
  frameAnimationUrl={item.frameAnimationUrl}
  shouldAnimateFrame={index >= messages.length - 8}
/>
```

## 3. Component structure

Implemented at `mobile/src/live/components`:
- `LiveRoomScreen.tsx`
- `LiveVideoPlayer.tsx`
- `LiveChat.tsx`
- `VipCommentMessage.tsx`
- `LiveGiftAnimation.tsx`
- `GiftOverlay.tsx`
- `GiftButton.tsx`
- `GiftSelector.tsx`
- `JoinAnimation.tsx`

## 4. Database schema

### VIP_LEVELS (extended `VipLevel`)
```json
{
  "level": 5,
  "code": "VIP5",
  "name": "VIP5 Royal",
  "nameAr": "VIP5 ملكي",
  "price": 1299,
  "usernameColor": "#D64F4F",
  "badgeImageUrl": "https://cdn/.../badge.png",
  "commentFrameLottieUrl": "https://cdn/.../frame.json",
  "joinAnimationLottieUrl": "https://cdn/.../join.json",
  "features": {
    "animatedCommentFrame": true,
    "coloredUsername": true,
    "specialBadge": true,
    "specialJoinAnimation": true
  }
}
```

### VIP_FRAMES (`VipFrame`)
```json
{
  "id": "...",
  "name": "Royal Flame Frame",
  "vipLevel": 5,
  "lottieUrl": "https://cdn/.../vip5-frame.json",
  "previewImage": "https://cdn/.../vip5-frame.png",
  "isDefault": true,
  "isActive": true
}
```

### GIFTS (extended `Gift`)
```json
{
  "id": "...",
  "name": "Rose Storm",
  "coinPrice": 50,
  "lottieUrl": "https://cdn/.../rose-storm.json",
  "animationUrl": "https://cdn/.../rose-storm.json",
  "previewImage": "https://cdn/.../rose-storm.png",
  "soundUrl": "https://cdn/.../rose-storm.mp3",
  "rarity": "rare"
}
```

### LIVE_ROOM_MESSAGES (`LiveChatMessage`)
```json
{
  "messageId": "msg_...",
  "roomId": "room_123",
  "userId": "...",
  "username": "ali",
  "avatar": "https://...",
  "message": "Hello room",
  "vipLevel": 3,
  "frameAnimationUrl": "https://cdn/.../vip3-frame.json",
  "createdAt": "2026-03-14T...",
  "expiresAt": "2026-03-16T..."
}
```

## 5. Lottie integration

### Remote JSON caching strategy
- `fetchLottieJson(url)` fetches and caches parsed JSON in-memory.
- `pendingFetches` prevents duplicate parallel network calls for the same URL.
- Cache is trimmed with an LRU-like eviction by insertion order.
- Used in `VipCommentMessage`, `LiveGiftAnimation`, `GiftSelector`, and `JoinAnimation`.

## 6. WebSocket event flow

### Join flow
1. Client emits `live:room:join` with `roomId` and user payload.
2. Server joins socket room `live:room:{roomId}`.
3. Server emits:
   - `live:room:user-joined`
   - `live:room:viewers`

### Chat flow
1. Client emits `live:chat:send`.
2. Server validates payload and rate limits per socket.
3. Server emits `live:chat:new` to room.
4. Server persists message to `LiveChatMessage` asynchronously.

### Gift flow
1. Client sends purchase/coin transaction request (REST).
2. On success, client emits `live:gift:send`.
3. Server rate limits and pushes event into per-room queue.
4. Server flushes batch (`live:gift:batch`) every ~140ms.
5. Client `GiftOverlay` plays up to 4 animations simultaneously, queues remaining.

## 7. Folder structure

```text
backend/
  controllers/
    liveEngagementController.js
  models/
    LiveChatMessage.js
    VipFrame.js
    Gift.js (extended)
    VipLevel.js (extended)
  routes/
    liveEngagementRoutes.js
  services/
    liveEngagementSocketService.js
  server.js (wired route + socket service)

mobile/src/live/
  components/
    LiveRoomScreen.tsx
    LiveVideoPlayer.tsx
    LiveChat.tsx
    VipCommentMessage.tsx
    LiveGiftAnimation.tsx
    GiftOverlay.tsx
    GiftButton.tsx
    GiftSelector.tsx
    JoinAnimation.tsx
    index.ts
  hooks/
    useLiveRoomSocket.ts
  services/
    liveEngagementApi.ts
    lottieCache.ts
  constants.ts
  types.ts
  index.ts

admin/src/
  pages/
    LiveAssetsManagement.jsx
  App.jsx (route added)
  components/
    Sidebar.jsx (menu entry added)
```

## 8. Performance tips for large live rooms

- Virtualize chat with bounded memory:
  - keep max ~200 messages in memory.
  - use `FlatList` windowing (`windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews`).
- Restrict expensive Lottie instances:
  - animate VIP frames only for latest visible messages.
  - use cached parsed Lottie JSON and avoid duplicate fetches.
- Batch gift broadcasts server-side:
  - queue gifts and flush in small timed batches.
  - limit simultaneous gift animations in UI to 3-4.
- Apply rate limits:
  - chat send throttle and gift send throttle at server and client.
- Keep payloads compact:
  - avoid sending oversized user objects in realtime events.
- Use TTL for room chat history:
  - prevent unbounded growth in message collection.

## API quick reference

### Public
- `GET /api/live-engagement/vip-levels`
- `GET /api/live-engagement/vip-frames`
- `GET /api/live-engagement/gifts`
- `GET /api/live-engagement/rooms/:roomId/messages?limit=80`

### Admin (Bearer token + admin)
- `POST /api/live-engagement/admin/seed-vip-levels`
- `POST /api/live-engagement/admin/vip-frames`
- `PUT /api/live-engagement/admin/vip-frames/:id`
- `DELETE /api/live-engagement/admin/vip-frames/:id`
- `POST /api/live-engagement/admin/gifts`
- `PUT /api/live-engagement/admin/gifts/:id`
- `DELETE /api/live-engagement/admin/gifts/:id`
