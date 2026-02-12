# Live Audio Rooms Feature - Documentation

## Overview

Complete implementation of TikTok-style live audio rooms feature, replacing the Friends tab with Live functionality.

## Features Implemented

### Backend (Node.js/Express)

✅ **LiveRoom Model** (`backend/models/LiveRoom.js`)

- Stores room information, participants, speakers, listeners
- Tracks hand-raised users, room status, categories
- Methods for managing participants and speakers

✅ **API Endpoints** (`backend/controllers/liveRoomController.js`, `backend/routes/liveRoomRoutes.js`)

- `POST /api/live-rooms/create` - Create new live room
- `GET /api/live-rooms` - Get all active live rooms (with category filter)
- `GET /api/live-rooms/:roomId` - Get specific room details
- `POST /api/live-rooms/:roomId/join` - Join a live room
- `POST /api/live-rooms/:roomId/leave` - Leave a live room
- `POST /api/live-rooms/:roomId/raise-hand` - Request to speak
- `POST /api/live-rooms/:roomId/lower-hand` - Cancel speaker request
- `POST /api/live-rooms/:roomId/make-speaker` - Grant speaker (host only)
- `POST /api/live-rooms/:roomId/remove-speaker` - Remove speaker (host only)
- `POST /api/live-rooms/:roomId/toggle-mute` - Mute/unmute microphone
- `POST /api/live-rooms/:roomId/end` - End live room (host only)
- `GET /api/live-rooms/my/rooms` - Get user's room history

✅ **Socket.io Real-time Events** (`backend/server.js`)

- `liveroom:join` - User joins room
- `liveroom:leave` - User leaves room
- `liveroom:user_joined` - Broadcast when someone joins
- `liveroom:user_left` - Broadcast when someone leaves
- `liveroom:raise_hand` - User requests to speak
- `liveroom:lower_hand` - User cancels request
- `liveroom:hand_raised` - Broadcast hand raised notification
- `liveroom:hand_lowered` - Broadcast hand lowered
- `liveroom:make_speaker` - User granted speaker role
- `liveroom:remove_speaker` - User removed from speakers
- `liveroom:speaker_added` - Broadcast new speaker
- `liveroom:speaker_removed` - Broadcast speaker removed
- `liveroom:toggle_mute` - Toggle microphone
- `liveroom:mute_toggled` - Broadcast mute status change
- `liveroom:update` - Room data updated
- `liveroom:updated` - Broadcast room update
- `liveroom:end` - Room ended by host
- `liveroom:ended` - Broadcast room ended
- `liveroom:send_gift` - Send gift in room
- `liveroom:gift_received` - Broadcast gift received

### Mobile App (React Native/Expo)

✅ **LiveRoomsListScreen** (`mobile/src/screens/LiveRoomsListScreen.js`)

- Browse active live rooms
- Category filtering (All, Music, Chat, Gaming, Education, Business)
- Pull-to-refresh functionality
- Grid layout with room cards
- Shows host, participant count, speaker count, category
- Live badge indicator
- Create room button

✅ **LiveRoomScreen** (`mobile/src/screens/LiveRoomScreen.js`)

- Join live room as listener
- Real-time participant display (speakers and listeners)
- Avatar grid with verification badges
- Microphone status indicators for speakers
- Raise/lower hand to request speaker role
- Host controls: accept speaker requests, remove speakers
- Mute/unmute controls for speakers
- Leave room functionality
- End room (host only)
- Real-time Socket.io updates

✅ **CreateLiveRoomScreen** (`mobile/src/screens/CreateLiveRoomScreen.js`)

- Create new live room
- Set title and description
- Choose category (Music, Chat, Gaming, Education, Business, Other)
- Privacy toggle (Public/Private)
- Start room immediately

✅ **Navigation Update** (`mobile/src/navigation/AppNavigator.js`)

- Replaced "Friends" tab with "Live Rooms" tab
- Changed icon from "people" to "radio"
- Updated label from "الأصدقاء" to "البث المباشر"
- Added LiveRoomScreen and CreateLiveRoomScreen to stack navigator

## Installation Instructions

### Backend Setup

1. Install the required package:

```bash
cd backend
npm install uuid
```

2. The backend server is already configured with Socket.io and the routes are registered in `server.js`.

### Mobile App Setup

No additional packages needed - `socket.io-client` is already installed.

## Database Schema

### LiveRoom Model

```javascript
{
  roomId: String (unique),
  title: String,
  description: String,
  host: ObjectId (ref: User),
  coverImage: String,
  status: "active" | "ended" | "scheduled",
  category: "music" | "chat" | "gaming" | "education" | "business" | "other",
  isPrivate: Boolean,
  speakers: [{
    user: ObjectId (ref: User),
    isMuted: Boolean,
    joinedAt: Date
  }],
  listeners: [{
    user: ObjectId (ref: User),
    joinedAt: Date
  }],
  handRaised: [{
    user: ObjectId (ref: User),
    raisedAt: Date
  }],
  maxParticipants: Number (default: 1000),
  maxSpeakers: Number (default: 20),
  totalViewers: Number,
  totalGifts: Number,
  startedAt: Date,
  endedAt: Date,
  scheduledFor: Date,
  agoraChannelName: String,
  agoraToken: String
}
```

## How It Works

### Creating a Room

1. User opens LiveRoomsListScreen and taps "Create Room" button
2. CreateLiveRoomScreen opens with form
3. User fills in title, description, category, privacy settings
4. On submit, POST request to `/api/live-rooms/create`
5. Backend creates LiveRoom document and adds host as first speaker
6. User is navigated to LiveRoomScreen with the new roomId

### Joining a Room

1. User browses active rooms in LiveRoomsListScreen
2. User taps on a room card
3. POST request to `/api/live-rooms/:roomId/join`
4. Backend adds user to listeners array
5. Socket.io emits `liveroom:join` event
6. All participants receive `liveroom:user_joined` event
7. UI updates with new participant count

### Requesting to Speak

1. Listener taps "Raise Hand" button
2. POST request to `/api/live-rooms/:roomId/raise-hand`
3. User added to handRaised array
4. Socket.io broadcasts `liveroom:hand_raised` to all participants
5. Host sees hand-raised indicator

### Granting Speaker Role

1. Host sees hand-raised users in special section
2. Host taps on user to grant speaker role
3. POST request to `/api/live-rooms/:roomId/make-speaker`
4. User moved from listeners to speakers array
5. Socket.io broadcasts `liveroom:speaker_added`
6. UI updates showing new speaker with microphone badge

### Leaving a Room

1. User taps "Leave" button
2. If host: room status set to "ended", all participants notified
3. If participant: removed from speakers/listeners arrays
4. Socket.io emits `liveroom:leave` event
5. All participants receive `liveroom:user_left`
6. User navigated back to LiveRoomsListScreen

## Real-time Updates

All room events are synchronized in real-time using Socket.io:

- Participant joins/leaves
- Speaker added/removed
- Hand raised/lowered
- Mute status changes
- Room updates
- Room ended

## Categories

The system supports 6 room categories:

- **Music** - Music performances, jam sessions
- **Chat** - Casual conversations, discussions
- **Gaming** - Game talk, strategy discussions
- **Education** - Learning, teaching, Q&A
- **Business** - Professional networking, meetings
- **Other** - Everything else

## Privacy Options

- **Public Rooms**: Anyone can discover and join
- **Private Rooms**: Only invited users can join (future feature)

## Host Controls

As a room host, you can:

- Accept/reject speaker requests
- Remove speakers
- End the room at any time

## Participant Roles

### Host

- Creates the room
- First speaker by default
- Can grant/revoke speaker permissions
- Can end the room

### Speakers

- Can unmute and talk
- Can mute themselves
- Displayed with microphone badge
- Limited to 20 per room (configurable)

### Listeners

- Can only listen
- Can raise hand to request speaker role
- Can view all participants
- Unlimited capacity (up to maxParticipants)

## Testing Checklist

### Backend Testing

- [ ] Create live room returns room data
- [ ] List active rooms returns all active rooms
- [ ] Category filter works correctly
- [ ] Join room adds user to listeners
- [ ] Raise hand adds user to handRaised array
- [ ] Make speaker moves user from listeners to speakers
- [ ] Toggle mute updates speaker mute status
- [ ] Leave room removes user from participants
- [ ] End room (host) sets status to "ended"
- [ ] Socket events broadcast to all room participants

### Mobile Testing

- [ ] LiveRoomsListScreen displays active rooms
- [ ] Category filter updates room list
- [ ] Pull-to-refresh reloads rooms
- [ ] Create room button navigates to CreateLiveRoomScreen
- [ ] Room card shows correct info (host, participant count, etc.)
- [ ] Tap on room card joins room
- [ ] LiveRoomScreen displays participants correctly
- [ ] Speaker microphone badges show/hide correctly
- [ ] Raise hand button works
- [ ] Host sees hand-raised users
- [ ] Host can grant speaker role
- [ ] Speakers can toggle mute
- [ ] Leave button exits room
- [ ] Real-time updates reflect instantly
- [ ] Navigation between screens works smoothly

## Deployment Notes

### Backend

The backend changes are ready for deployment:

1. Push changes to Git repository
2. Deploy to Render (or your hosting platform)
3. The new `/api/live-rooms` routes will be automatically available

### Mobile App

After testing:

1. Build new APK/IPA with updated code
2. Test on physical devices
3. Submit to app stores if ready

## Future Enhancements

Potential features to add:

- [ ] Audio integration with Agora/Twilio
- [ ] Private room invitations
- [ ] Room scheduling
- [ ] Record live sessions
- [ ] Gifts/tips for hosts
- [ ] Room analytics (peak viewers, duration, etc.)
- [ ] Moderator role
- [ ] Block/report users
- [ ] Room search
- [ ] Following system (notify when followed users go live)
- [ ] Push notifications for room events

## API Routes Summary

| Method | Endpoint                                 | Auth       | Description          |
| ------ | ---------------------------------------- | ---------- | -------------------- |
| GET    | `/api/live-rooms`                        | No         | Get all active rooms |
| GET    | `/api/live-rooms/:roomId`                | No         | Get room details     |
| POST   | `/api/live-rooms/create`                 | Yes        | Create new room      |
| POST   | `/api/live-rooms/:roomId/join`           | Yes        | Join room            |
| POST   | `/api/live-rooms/:roomId/leave`          | Yes        | Leave room           |
| POST   | `/api/live-rooms/:roomId/raise-hand`     | Yes        | Request to speak     |
| POST   | `/api/live-rooms/:roomId/lower-hand`     | Yes        | Cancel request       |
| POST   | `/api/live-rooms/:roomId/make-speaker`   | Yes (Host) | Grant speaker        |
| POST   | `/api/live-rooms/:roomId/remove-speaker` | Yes (Host) | Remove speaker       |
| POST   | `/api/live-rooms/:roomId/toggle-mute`    | Yes        | Toggle mute          |
| POST   | `/api/live-rooms/:roomId/end`            | Yes (Host) | End room             |
| GET    | `/api/live-rooms/my/rooms`               | Yes        | Get user's rooms     |

## Files Created/Modified

### Backend

- ✅ Created: `backend/models/LiveRoom.js`
- ✅ Created: `backend/controllers/liveRoomController.js`
- ✅ Created: `backend/routes/liveRoomRoutes.js`
- ✅ Modified: `backend/server.js` (added routes and Socket.io events)

### Mobile

- ✅ Created: `mobile/src/screens/LiveRoomsListScreen.js`
- ✅ Created: `mobile/src/screens/LiveRoomScreen.js`
- ✅ Created: `mobile/src/screens/CreateLiveRoomScreen.js`
- ✅ Modified: `mobile/src/navigation/AppNavigator.js` (replaced Friends with Live Rooms)

---

**Status**: ✅ Feature completely implemented and ready for testing
**Next Step**: Install uuid package in backend and test the functionality
