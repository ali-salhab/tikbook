# Follow Notification System - Testing Guide

## Overview

The follow notification system is fully implemented and working. When a user follows another user, the following happens:

1. ✅ User follow relationship is established in database
2. ✅ Notification is created in the database
3. ✅ Push notification is sent to the followed user
4. ✅ Notification badge updates on the profile screen
5. ✅ Notification appears in the Activity screen

## Backend Implementation

### User Controller (`backend/controllers/userController.js`)

The `followUser` function handles:

- Creating follower/following relationships
- Creating notification record with type "follow"
- Sending push notification with Arabic text
- Error handling for each step

### Notification Controller (`backend/controllers/notificationController.js`)

Provides endpoints:

- `GET /api/notifications` - Get all notifications for user
- `GET /api/notifications/unread-count` - Get count of unread notifications
- `PUT /api/notifications/mark-read` - Mark all notifications as read

### Endpoints

```
PUT /api/users/:id/follow
Headers: Authorization: Bearer <token>
Response: { message: "User followed" }
```

## Mobile Implementation

### UserProfileScreen

- Follow button triggers `axios.put` to `/users/:id/follow`
- Updates local state immediately
- Backend creates notification automatically

### ActivityScreen

- Displays all notifications including "follow" type
- Shows green person-add icon for follow notifications
- Text: "{username} بدأ في متابعتك"
- Shows profile image of follower
- Tapping notification navigates to follower's profile

### Notification Badge

- Shows on bell icon in ProfileScreen header
- Shows on Inbox tab in bottom navigation
- Updates every 30 seconds
- Clears when viewing Activity screen

## Testing the Follow Notification

### Method 1: Manual Testing

1. Have two user accounts (User A and User B)
2. Log in as User A
3. Navigate to User B's profile
4. Press the "متابعة" (Follow) button
5. Log out and log in as User B
6. Check notification badge (should show 1)
7. Open Activity screen
8. See follow notification from User A
9. Badge should clear

### Method 2: Test Script

Run the test script:

```bash
cd backend
node testFollowNotification.js
```

This will:

- Connect to your database
- Find two users
- Simulate a follow action
- Create a notification
- Verify the notification was created
- Check unread count

### Method 3: Backend Logs

When testing, watch your backend console for these logs:

```
✅ Follow notification created: {followerUsername} -> {followedUsername}
✅ Push notification sent to {followedUsername}
📧 Fetched X notifications for user {userId}
📊 Unread count for user {userId}: X
✅ Marked X notifications as read for user {userId}
```

## Troubleshooting

### Notification not appearing

1. Check backend logs for errors
2. Verify user has followers/following arrays
3. Verify notification was created in MongoDB:
   ```javascript
   db.notifications.find({ type: "follow" }).sort({ createdAt: -1 });
   ```
4. Check if the followed user's token is valid

### Badge not updating

1. Check network connection
2. Verify polling is working (every 30 seconds)
3. Check if `/notifications/unread-count` endpoint returns correct count
4. Verify `fetchNotificationCount` is called on screen focus

### Push notification not received

1. Check if user has FCM token registered
2. Verify Firebase service account is configured
3. Check if Expo push token is valid (ExponentPushToken[...])
4. Review `firebaseService.js` and `expoPushService.js` logs

## Notification Types Supported

| Type        | Icon       | Color   | Trigger                     |
| ----------- | ---------- | ------- | --------------------------- |
| like        | heart      | #FE2C55 | User likes your video       |
| comment     | chatbubble | #4A90E2 | User comments on your video |
| follow      | person-add | #00C875 | User follows you            |
| new_video   | videocam   | #9B59B6 | Followed user posts video   |
| live_stream | radio      | #E74C3C | Followed user goes live     |

## Database Schema

### Notification Model

```javascript
{
  user: ObjectId,        // Who receives the notification
  type: String,          // 'follow', 'like', 'comment', 'new_video', 'live_stream'
  fromUser: ObjectId,    // Who triggered the notification
  video: ObjectId,       // Related video (optional)
  read: Boolean,         // false by default
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

The follow notification system has robust error handling:

- If notification creation fails, follow still succeeds
- If push notification fails, notification record still created
- Each step is logged for debugging
- Mobile app handles offline scenarios

## Production Checklist

✅ Follow endpoint creates notification
✅ Notification appears in Activity screen
✅ Badge shows unread count
✅ Badge clears when viewing notifications
✅ Push notifications sent (if FCM configured)
✅ Error handling prevents follow action from breaking
✅ Logging added for debugging
✅ HTTP method fixed (PUT not POST)
✅ Offline support implemented
✅ Auto-refresh every 30 seconds

## Next Steps

If you're still having issues:

1. Run the test script and check output
2. Watch backend logs during follow action
3. Check MongoDB notifications collection
4. Verify mobile app network requests in React Native Debugger
5. Test with different user accounts

The system is production-ready and working correctly!
