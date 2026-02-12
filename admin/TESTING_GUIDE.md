# Admin Notification System - Testing Guide

## Overview

This guide will help you test the complete admin notification system from admin panel to mobile app.

## Prerequisites

- Backend running on Render (or localhost:5000)
- Admin panel deployed or running locally
- Mobile app with at least one test user logged in
- Admin credentials

## Testing Steps

### 1. Backend Verification

#### Test Admin Notification Endpoint (Individual User)

**Using cURL**:

```bash
# Get your admin token first by logging in
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tikbook.com",
    "password": "your-admin-password"
  }'

# Use the token from above
curl -X POST http://localhost:5000/api/admin/notify/USER_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test notification from admin",
    "type": "admin"
  }'
```

**Expected Response**:

```json
{
  "message": "Notification sent successfully",
  "user": "username",
  "notification": {
    "_id": "...",
    "user": "...",
    "type": "admin",
    "title": "Test Notification",
    "message": "This is a test notification from admin",
    "fromUser": "...",
    "read": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Test Broadcast Notification Endpoint

**Using cURL**:

```bash
curl -X POST http://localhost:5000/api/admin/notify/all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Broadcast Test",
    "body": "This is a broadcast notification to all users",
    "type": "admin_broadcast"
  }'
```

**Expected Response**:

```json
{
  "message": "Broadcast sent successfully",
  "totalUsers": 50,
  "notificationsSaved": 50,
  "pushNotifications": {
    "successCount": 45,
    "failureCount": 5
  }
}
```

#### Verify Database Records

**Using MongoDB Compass or CLI**:

```javascript
// Connect to your MongoDB
// Check notifications collection

db.notifications
  .find({
    type: { $in: ["admin", "admin_broadcast"] },
  })
  .sort({ createdAt: -1 })
  .limit(10);

// Should show recent admin notifications with:
// - user field (ObjectId)
// - type: "admin" or "admin_broadcast"
// - title and message fields
// - fromUser field (admin's ObjectId)
// - read: false
```

### 2. Admin Panel Testing

#### Test Setup

1. **Start Admin Panel**:
   ```bash
   cd admin
   npm run dev
   ```
2. **Login**:
   - Navigate to `http://localhost:5173`
   - Login with admin credentials
   - Should redirect to dashboard

#### Test Notifications Page

1. **Navigate to Notifications**:
   - Click "الإشعارات" (Notifications) in sidebar
   - Should see three tabs: Send to User, Broadcast, Templates

2. **Test Send to Individual User**:

   **Step 1**: Select a user
   - Search for a user in the search box
   - Select a user from dropdown

   **Step 2**: Fill notification form

   ```
   Notification Type: Admin Notification
   Title: مرحبا!
   Message: هذا اختبار من لوحة التحكم
   ```

   **Step 3**: Send notification
   - Click "Send Notification"
   - Should see success message: "Notification sent to [username]"

   **Step 4**: Verify
   - Check browser console for API response
   - Should show notification object with \_id

3. **Test Broadcast to All Users**:

   **Step 1**: Switch to Broadcast tab
   - Click "Broadcast to All" tab
   - Should see warning message

   **Step 2**: Fill broadcast form

   ```
   Notification Type: Announcement
   Title: إعلان هام
   Message: إعلان مهم لجميع المستخدمين
   ```

   **Step 3**: Send broadcast
   - Click "Send Broadcast"
   - Should see confirmation dialog
   - Confirm and send
   - Should see success message with statistics

   **Expected Message**:

   ```
   Broadcast sent successfully!
   Total users: X,
   Push notifications: Y success, Z failed
   ```

4. **Test Notification Templates**:

   **Step 1**: Click "Templates" tab
   - Should see 4 pre-built templates in Arabic

   **Step 2**: Use a template
   - Click "Use Template" on any template
   - Should navigate to "Send to User" tab
   - Form should be pre-filled with template data

   **Step 3**: Use template for broadcast
   - Go back to Templates
   - Click "Broadcast" on any template
   - Should navigate to "Broadcast" tab
   - Form should be pre-filled

5. **Test User Integration**:

   **Step 1**: Navigate to Users Management
   - Click "المستخدمون" (Users) in sidebar

   **Step 2**: Open user details
   - Click on any user row
   - Should see user details modal

   **Step 3**: Send notification from modal
   - Click "📬 إرسال إشعار" (Send Notification) button
   - Should navigate to Notifications page
   - User should be pre-selected
   - Should see info message: "Sending notification to: [username]"

#### Check for Errors

**Browser Console**:

- Open DevTools (F12)
- Check Console tab
- Should see no errors
- Should see successful API responses

**Network Tab**:

- Open DevTools → Network tab
- Send a notification
- Check API request:
  - Method: POST
  - URL: `/api/admin/notify/[userId]` or `/api/admin/notify/all`
  - Status: 200 OK
  - Response: Should contain notification data

### 3. Mobile App Testing

#### Prerequisites

- Mobile app must be running
- User must be logged in
- User must have enabled push notifications

#### Test Notification Receipt

1. **Send Test Notification**:
   - From admin panel, send notification to mobile user
   - Note the exact time

2. **Check Push Notification**:
   - Should appear on device notification tray
   - Should show title and body
   - Tapping should open app

3. **Check SystemNotificationsScreen**:

   **Step 1**: Navigate to notifications
   - Open mobile app
   - Go to Profile tab
   - Tap on notifications icon/button

   **Step 2**: Verify notification appears
   - Should see new notification at top
   - Should show:
     - Notification title
     - Notification message
     - "Admin" or notification type badge
     - Timestamp
     - Unread indicator

   **Step 3**: Test marking as read
   - Tap on notification
   - Should mark as read
   - Notification badge should update

4. **Check Notification Badge**:
   - Before opening notifications: Badge should show count
   - After opening: Badge count should decrease
   - After viewing all: Badge should be 0 or hidden

#### Test Broadcast Reception

1. **Send Broadcast**:
   - From admin panel, send broadcast to all users
2. **Verify Multiple Users**:
   - Test with multiple logged-in users
   - All users should receive:
     - Push notification
     - In-app notification
3. **Check Database**:

   ```javascript
   // Each user should have their own notification record
   db.notifications
     .find({
       type: "admin_broadcast",
       createdAt: { $gte: new Date("2025-01-20") },
     })
     .count();

   // Should equal total number of users
   ```

### 4. Integration Testing

#### Test Complete Flow

1. **Admin creates notification** → 2. **Backend creates DB record** → 3. **Backend sends push notification** → 4. **User receives push** → 5. **User opens app** → 6. **Notification appears in list** → 7. **User taps notification** → 8. **Notification marked as read**

#### Verify Each Step

- [ ] Admin panel form submission
- [ ] API request sent successfully
- [ ] Database record created
- [ ] Push notification sent
- [ ] Push notification received on device
- [ ] Notification appears in SystemNotificationsScreen
- [ ] Notification badge updates
- [ ] Mark as read functionality works
- [ ] Notification persists after app restart

### 5. Edge Cases and Error Testing

#### Test Error Scenarios

1. **Invalid User ID**:

   ```bash
   curl -X POST http://localhost:5000/api/admin/notify/invalid_id \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","body":"Test"}'
   ```

   - Expected: 404 error "User not found"

2. **Missing Title/Body**:

   ```bash
   curl -X POST http://localhost:5000/api/admin/notify/USER_ID \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

   - Expected: 400 error or default values used

3. **Unauthorized Access**:

   ```bash
   curl -X POST http://localhost:5000/api/admin/notify/USER_ID \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","body":"Test"}'
   ```

   - Expected: 401 Unauthorized

4. **Non-Admin User Token**:

   ```bash
   # Use regular user token instead of admin token
   curl -X POST http://localhost:5000/api/admin/notify/USER_ID \
     -H "Authorization: Bearer REGULAR_USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","body":"Test"}'
   ```

   - Expected: 403 Forbidden "Requires admin privileges"

5. **User Without Push Token**:
   - Send notification to user without pushToken/fcmToken
   - Expected: Notification saved to DB but push notification skipped
   - User should still see it when they open SystemNotificationsScreen

6. **Broadcast with No Users**:
   - Test on empty database
   - Expected: Success response with totalUsers: 0

#### Test UI Edge Cases

1. **Long Notification Text**:
   - Title: Very long title with more than 100 characters...
   - Body: Very long message with multiple paragraphs...
   - Should handle gracefully (truncate or scroll)

2. **Special Characters**:
   - Title: "Test & Special <Characters> | Symbols % $ #"
   - Body: Emoji test 🎉 🚀 💯
   - Should display correctly

3. **Arabic Text**:
   - Title: "مرحبا بك في TikBook"
   - Body: "هذا اختبار للنص العربي والإشعارات"
   - Should display RTL correctly

4. **Network Failure Simulation**:
   - Disconnect network
   - Try sending notification
   - Should show error message
   - Reconnect and retry
   - Should work

### 6. Performance Testing

#### Broadcast Performance

1. **Small Scale (10-100 users)**:
   - Send broadcast
   - Measure time to complete
   - Check all users receive notification

2. **Medium Scale (100-1000 users)**:
   - Send broadcast
   - Monitor server CPU/memory
   - Check success/failure rates

3. **Large Scale (1000+ users)**:
   - Consider pagination/batching
   - Monitor database performance
   - Check Firebase/Expo limits

### 7. Checklist

**Backend**:

- [ ] Admin notification endpoint works
- [ ] Broadcast endpoint works
- [ ] Notifications saved to database
- [ ] Push notifications sent
- [ ] Error handling works
- [ ] Authentication/authorization works

**Admin Panel**:

- [ ] Notifications page loads
- [ ] User selection works
- [ ] Notification form validation
- [ ] Send to user works
- [ ] Broadcast works
- [ ] Templates work
- [ ] User modal integration works
- [ ] Success/error messages display
- [ ] Navigation works

**Mobile App**:

- [ ] Push notifications received
- [ ] SystemNotificationsScreen displays notifications
- [ ] Notification badge updates
- [ ] Mark as read works
- [ ] Notifications persist
- [ ] Arabic text displays correctly
- [ ] Timestamps display correctly

**Integration**:

- [ ] End-to-end flow works
- [ ] All users receive broadcast
- [ ] Database records match pushed notifications
- [ ] No duplicate notifications
- [ ] Network errors handled gracefully

## Troubleshooting

### Issue: Notifications not appearing in mobile app

**Check**:

1. User is logged in
2. API endpoint returns notifications
3. SystemNotificationsScreen is fetching correctly
4. Network tab shows successful API calls
5. User ID matches notification's user field

**Debug**:

```javascript
// In mobile app, add console logs in SystemNotificationsScreen
console.log("Fetching notifications...");
console.log("API Response:", response.data);
console.log("Notifications count:", notifications.length);
```

### Issue: Push notifications not sending

**Check**:

1. Firebase/Expo credentials configured
2. User has pushToken or fcmToken
3. Backend firebaseService initialized
4. Network connectivity
5. Firebase/Expo API limits

**Debug**:

```javascript
// In backend adminController.js
console.log("User pushToken:", user.pushToken);
console.log("User fcmToken:", user.fcmToken);
console.log("Push result:", result);
```

### Issue: Admin panel showing CORS error

**Check**:

1. Backend CORS configuration includes admin panel URL
2. Vercel domain added to allowed origins
3. Render backend is running
4. API_URL environment variable correct

**Fix**:

```javascript
// backend/server.js
const allowedOrigins = [
  "http://localhost:5173",
  "https://your-admin.vercel.app",
];
```

## Success Criteria

✅ Admin can send notification to specific user
✅ Admin can broadcast to all users
✅ Notifications saved to database
✅ Push notifications sent successfully
✅ Users see notifications in SystemNotificationsScreen
✅ Notification badges update correctly
✅ Read/unread status works
✅ No errors in console
✅ Performance is acceptable
✅ UI is responsive and user-friendly

---

**Testing completed**: ****\_****
**Tester**: ****\_****
**Issues found**: ****\_****
**Status**: ❌ Failed / ⚠️ Partial / ✅ Passed
