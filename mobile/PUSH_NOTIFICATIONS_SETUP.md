# Push Notifications Setup Guide

## ⚠️ Important: Expo Go Limitation

**Push notifications do NOT work in Expo Go for SDK 53+**

You have two options:

## Option 1: Create Development Build (Recommended)

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Configure Project
```bash
cd mobile
eas build:configure
```

### Step 4: Create Development Build

**For Android:**
```bash
eas build --profile development --platform android
```

**For iOS:**
```bash
eas build --profile development --platform ios
```

### Step 5: Install on Device
- Download the build from the Expo dashboard
- Install on your physical device
- Push notifications will work!

## Option 2: Disable Push Notifications (Quick Fix)

If you just want to test other features without push notifications:

### Update `AuthContext.js`:

Comment out notification registration:
```javascript
// Register for notifications
// await notificationService.registerForPushNotifications(res.data.token, BASE_URL);
```

### Update `App.js`:

Remove notification setup:
```javascript
// notificationService.setupNotificationListeners(navigation);
```

## Network Error Fix

The "Network Error" for version checking means your device can't reach the backend.

### For Android Emulator:
- Use: `http://10.0.2.2:5000/api` ✅ (already set)

### For iOS Simulator:
- Use: `http://localhost:5000/api`

### For Physical Device:
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4)
   - Mac/Linux: `ifconfig` or `ip addr`
2. Update BASE_URL: `http://YOUR_IP:5000/api`
   - Example: `http://192.168.1.100:5000/api`
3. Make sure your phone and computer are on the same WiFi network

## Current Status

✅ Backend is ready for push notifications
✅ Firebase is configured
✅ Admin panel can send notifications
❌ Expo Go doesn't support push notifications
✅ Development build will work perfectly

## Recommendation

For full testing with push notifications, create a development build using Option 1.

For quick testing without notifications, use Option 2 to disable them temporarily.
