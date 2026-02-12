# Live Audio Rooms - Quick Start Guide

## Installation

### 1. Backend Setup

```bash
cd backend
npm install uuid
npm start
```

The backend should now be running with the new live room endpoints at `/api/live-rooms/*`.

### 2. Mobile App Setup

No new packages needed. The app is ready to run:

```bash
cd mobile
npm start
```

## Testing the Feature

### Test 1: Create a Live Room

1. Open the mobile app
2. Navigate to the "Live Rooms" tab (البث المباشر)
3. Tap the **+** button in the top right
4. Fill in room details:
   - Title: "Test Room"
   - Description: "Testing live audio feature"
   - Category: Chat
   - Privacy: Public
5. Tap "Start Live Room"
6. ✅ You should enter the room as host with speaker role

### Test 2: Browse Live Rooms

1. Open the app on second device/emulator
2. Navigate to "Live Rooms" tab
3. ✅ Should see the test room in the grid
4. ✅ Room card shows: host avatar, title, participant count, live badge
5. Try filtering by category
6. Pull down to refresh

### Test 3: Join a Room

1. On second device, tap on a room card
2. ✅ Should enter room as listener
3. ✅ Host and participants displayed in grid
4. ✅ Real-time participant count updates

### Test 4: Request Speaker Role

1. As listener, tap "Raise Hand" button
2. ✅ Button should turn yellow
3. On host device, check bottom section
4. ✅ Host should see hand-raised notification with user avatar

### Test 5: Grant Speaker Role

1. As host, tap on user in hand-raised section
2. ✅ User should move to speaker grid
3. ✅ Microphone badge should appear on avatar
4. On listener device:
5. ✅ "Raise Hand" button should change to "Mute" button

### Test 6: Toggle Mute

1. As speaker, tap the microphone button
2. ✅ Button should turn red (muted state)
3. ✅ All participants should see red microphone badge
4. Tap again to unmute
5. ✅ Button should turn gray (unmuted state)

### Test 7: Leave Room

1. As speaker/listener, tap "Leave" button
2. ✅ Should navigate back to LiveRoomsListScreen
3. On other devices:
4. ✅ Participant count should decrease
5. ✅ User should disappear from participant grid

### Test 8: End Room (Host)

1. As host, tap the close button in top right
2. Confirm ending the room
3. ✅ Should navigate back to LiveRoomsListScreen
4. On all other devices:
5. ✅ Alert should appear: "The host has ended this live room"
6. ✅ All users should be kicked out
7. Back in room list:
8. ✅ Room should no longer appear in active rooms

### Test 9: Real-time Updates

With multiple devices open in same room:

1. Join from device A
2. ✅ Device B should see participant count increase
3. Raise hand on device A
4. ✅ Device B (host) should see hand raised
5. Grant speaker on device B
6. ✅ Device A should see role change instantly
7. Toggle mute on device A
8. ✅ Device B should see mute status change

### Test 10: Category Filtering

1. Create rooms with different categories
2. In room list, tap different category chips
3. ✅ Room list should filter by selected category
4. ✅ "All" category shows all rooms

## API Testing (with Postman/cURL)

### Get All Active Rooms

```bash
GET https://tikbook-1cdb.onrender.com/api/live-rooms
```

### Create Room

```bash
POST https://tikbook-1cdb.onrender.com/api/live-rooms/create
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "title": "Test Room",
  "description": "Testing API",
  "category": "chat",
  "isPrivate": false
}
```

### Join Room

```bash
POST https://tikbook-1cdb.onrender.com/api/live-rooms/{roomId}/join
Authorization: Bearer YOUR_TOKEN
```

### Raise Hand

```bash
POST https://tikbook-1cdb.onrender.com/api/live-rooms/{roomId}/raise-hand
Authorization: Bearer YOUR_TOKEN
```

## Troubleshooting

### Room not appearing in list

- Check backend console for errors
- Verify room status is "active" in MongoDB
- Try pull-to-refresh on mobile app

### Socket.io not connecting

- Check SOCKET_URL in LiveRoomScreen.js
- Verify backend Socket.io is running
- Check browser/app console for connection errors

### Cannot create room

- Verify token is valid
- Check backend logs for validation errors
- Ensure uuid package is installed

### Real-time updates not working

- Check Socket.io connection in app console
- Verify socket events are being emitted
- Check if devices are in same room

## Expected Results Summary

✅ **Backend**

- 12 API endpoints working
- Socket.io events broadcasting
- Real-time participant management
- Proper authorization checks

✅ **Mobile**

- Live Rooms tab replaces Friends tab
- Browse and join active rooms
- Create new rooms with categories
- Real-time participant updates
- Host controls for speaker management
- Mute/unmute functionality
- Smooth navigation between screens

## Next Steps

After successful testing:

1. Deploy backend changes to production
2. Test on production API URL
3. Build mobile app for distribution
4. Consider adding audio integration (Agora/Twilio)
5. Add push notifications for room events
6. Implement analytics tracking

---

**Status**: Ready for testing
**Documentation**: See LIVE_AUDIO_ROOMS_FEATURE.md for complete details
