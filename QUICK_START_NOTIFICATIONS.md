# Quick Start - Test Admin Notifications

This guide will help you test the admin notification system in 5 minutes.

## Prerequisites

- Backend running (Render or localhost:5000)
- At least one test user in the system
- Admin credentials

## Step 1: Start Admin Panel (2 minutes)

### Option A: Local Development

```bash
cd admin
npm install
npm run dev
```

Admin panel: http://localhost:5173

### Option B: Use Deployed Admin Panel

If already deployed on Vercel, just open the URL.

## Step 2: Login as Admin (30 seconds)

1. Open admin panel
2. Enter admin credentials:
   - Email: your-admin@email.com
   - Password: your-admin-password
3. Click Login

If you don't have an admin user:

```bash
cd backend
node createAdmin.js
# Follow prompts to create admin
```

## Step 3: Send Test Notification (1 minute)

### Method A: From Notifications Page

1. Click "الإشعارات" (Notifications) in sidebar
2. Stay on "Send to User" tab
3. Search for a test user
4. Select user from dropdown
5. Fill form:
   - **Type**: Admin Notification
   - **Title**: Test Notification
   - **Message**: This is a test from admin panel!
6. Click "Send Notification"
7. Should see success message

### Method B: From User Details

1. Click "المستخدمون" (Users) in sidebar
2. Click on any user row
3. Click "📬 إرسال إشعار" button
4. Fill title and message
5. Click "Send Notification"

## Step 4: Verify in Mobile App (1 minute)

1. Open mobile app on your test device/emulator
2. Login as the user you sent notification to
3. Navigate to SystemNotificationsScreen:
   - Go to Profile tab
   - Tap on notifications icon
4. Should see your notification at the top:
   - Title: "Test Notification"
   - Message: "This is a test from admin panel!"
   - Blue unread indicator
   - Admin icon

5. Tap the notification
   - Should mark as read
   - Indicator should disappear

## Step 5: Test Broadcast (30 seconds)

1. Go back to admin panel → Notifications page
2. Click "Broadcast to All" tab
3. Fill form:
   - **Type**: Announcement
   - **Title**: Important Announcement
   - **Message**: This is a test broadcast to all users!
4. Click "Send Broadcast"
5. Confirm in dialog
6. Should see success with statistics

7. Check mobile app again
   - All users should see the broadcast notification

## Quick Verification Checklist

✅ Admin panel loads and login works
✅ Notifications page displays
✅ Can select users
✅ Send notification works (see success message)
✅ Notification appears in mobile app instantly
✅ Notification shows correct title and message
✅ Unread indicator appears
✅ Tapping notification marks it as read
✅ Broadcast notification works
✅ All users receive broadcast

## Troubleshooting

### ❌ "Network Error" in admin panel

**Check**: Is `VITE_API_URL` set correctly in admin/.env?

```bash
# admin/.env
VITE_API_URL=http://localhost:5000
```

### ❌ Notification sent but not appearing in mobile app

**Check**:

1. Mobile app is fetching from correct API
2. User is logged in
3. Network connection is working
4. Check mobile console logs

**Debug**:

```bash
# In mobile app console, you should see:
Fetching notifications...
API Response: [array of notifications]
```

### ❌ "User not found" error

**Check**: User ID is correct and user exists in database

### ❌ Push notification not received

**Note**: This is OK! The notification still saves to database.
If user opens app, they'll see it in SystemNotificationsScreen.

## Next Steps

Once basic test works:

1. Try different notification types (System, Promo, Update)
2. Test notification templates
3. Send notifications to multiple users
4. Test from production (deploy to Vercel/Render)
5. Follow full TESTING_GUIDE.md for comprehensive testing

## Quick Commands Reference

**Start backend**:

```bash
cd backend
npm run dev
```

**Start admin panel**:

```bash
cd admin
npm run dev
```

**Start mobile app**:

```bash
cd mobile
npm start
```

**Create admin user**:

```bash
cd backend
node createAdmin.js
```

**Check MongoDB notifications**:

```javascript
db.notifications
  .find({ type: { $in: ["admin", "admin_broadcast"] } })
  .sort({ createdAt: -1 })
  .limit(5);
```

## Success!

If all steps worked, your admin notification system is fully functional! 🎉

You can now:

- Send notifications to specific users
- Broadcast to all users
- Use notification templates
- Manage notifications from admin panel
- Users receive notifications in-app

For detailed testing, see [TESTING_GUIDE.md](admin/TESTING_GUIDE.md)
For deployment, see [DEPLOYMENT_GUIDE.md](admin/DEPLOYMENT_GUIDE.md)
For implementation details, see [ADMIN_NOTIFICATION_SYSTEM.md](ADMIN_NOTIFICATION_SYSTEM.md)
