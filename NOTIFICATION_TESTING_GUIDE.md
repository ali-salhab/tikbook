# 🔔 Push Notification Testing Guide for TikBook

## Your Expo Push Token

```
ExponentPushToken[XCJnCCBTHNFSNLE8cZHflM]
```

---

## 🧪 Testing Methods

### Method 1: Using the Test Script (Recommended)

1. **Navigate to backend folder**:

   ```bash
   cd backend
   ```

2. **Install axios if not installed**:

   ```bash
   npm install axios
   ```

3. **Run the test script**:

   ```bash
   node testPushNotification.js
   ```

4. **Follow the interactive menu** to send different types of notifications

---

## 📋 Test Scenarios

### Scenario 1: App is CLOSED (Terminated)

1. Force quit the TikBook app completely
2. Run: `node testPushNotification.js`
3. Select option 1 or 2 to send a notification
4. **Expected**: Notification appears in system tray
5. **Tap the notification** - App should open and navigate to the screen specified in the data

### Scenario 2: App in BACKGROUND

1. Open TikBook app
2. Press home button to send app to background
3. Run: `node testPushNotification.js`
4. Select option 1 or 2
5. **Expected**: Notification appears in system tray while app is running in background
6. **Tap the notification** - App should come to foreground and navigate

### Scenario 3: App in FOREGROUND

1. Keep TikBook app open and visible
2. Run: `node testPushNotification.js`
3. Select option 1 or 2
4. **Expected**: Notification banner appears at top of the app (in-app notification)
5. The notification should be visible but not interrupt the current screen

---

## 🎯 Test Cases Included

### Test 1: Simple Notification

- No navigation
- Just displays a message

### Test 2: Navigate to Activity Screen

- Opens the Activity/Notifications screen
- Data: `{ screen: 'Activity' }`

### Test 3: Navigate to Specific Video

- Opens a specific video on Home screen
- Data: `{ screen: 'MainTabs', params: { screen: 'Home', params: { videoId: '...' }}}`

### Test 4: Navigate to User Profile

- Opens another user's profile
- Data: `{ screen: 'UserProfile', params: { userId: '...' }}`

### Test 5: Navigate to Chat

- Opens a chat conversation
- Data: `{ screen: 'Chat', params: { userId: '...', username: '...' }}`

### Test 6: Rich Notification

- Notification with emojis
- Navigates to Profile screen

---

## 🌐 Using Expo's Web Tool

You can also test using Expo's push notification tool:

1. Go to: https://expo.dev/notifications
2. Enter your token: `ExponentPushToken[XCJnCCBTHNFSNLE8cZHflM]`
3. Enter title and message
4. Add JSON data for navigation (optional):
   ```json
   {
     "screen": "Activity",
     "params": {}
   }
   ```
5. Click "Send a Notification"

---

## 🛠️ Using Backend API (If server is running)

Send a POST request to your backend:

```bash
# First, login and get your token
curl -X POST http://your-backend-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Then send test notification
curl -X POST http://your-backend-url/api/push-notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test من الباكند",
    "body": "هذا اشعار تجريبي",
    "data": {
      "screen": "Activity"
    }
  }'
```

---

## ✅ Verification Checklist

- [ ] Notification appears when app is closed
- [ ] Notification appears when app is in background
- [ ] Notification appears when app is in foreground (as banner)
- [ ] Tapping notification opens the app
- [ ] Navigation data works correctly (opens correct screen)
- [ ] Notification badge count updates (if implemented)
- [ ] Sound plays with notification
- [ ] Notification content is in Arabic and displays correctly

---

## 🐛 Troubleshooting

### Issue: No notifications received

**Solutions**:

1. Make sure your app has notification permissions enabled
2. Check that the token is saved in your user profile in the database
3. Verify the token format is correct (starts with `ExponentPushToken[`)
4. Make sure your app is connected to Expo's push service

### Issue: Notification received but navigation doesn't work

**Solutions**:

1. Check the data structure in the notification payload
2. Verify the screen names match your navigation structure
3. Check the logs in the app for navigation errors
4. Make sure `notificationListener` is set up correctly in AppNavigator

### Issue: Notifications only work in some states

**Solutions**:

1. Check App.json for notification configuration
2. Verify expo-notifications is properly configured
3. Check Android notification channel settings
4. Make sure background notification handler is set up

---

## 📱 App Configuration Check

Make sure your `app.json` has these settings:

```json
{
  "expo": {
    "notification": {
      "icon": "./assets/icon.png",
      "color": "#FE2C55",
      "androidMode": "default",
      "androidCollapsedTitle": "#{unread_notifications} اشعار جديد"
    },
    "android": {
      "useNextNotificationsApi": true,
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

---

## 🔄 Auto-Testing Script

Run all 6 tests automatically with delays:

```bash
node testPushNotification.js
# Select option: 1
```

This will send 6 different notifications with 3-second delays between each.

---

## 💡 Tips

1. **Test systematically**: Test each scenario (closed, background, foreground) separately
2. **Check logs**: Look at the console output when tapping notifications
3. **Use different devices**: Test on both physical device and emulator
4. **Test at different times**: Sometimes notifications are delayed by the OS
5. **Clear old notifications**: Clear all notifications before each test for clarity

---

## 📞 Support

If notifications still don't work after testing:

1. Check the app logs for errors
2. Verify your Expo project ID is correct
3. Make sure you're building with the correct profile
4. Check if axios is installed in backend: `npm install axios`

Good luck with testing! 🚀
