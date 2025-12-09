# TikBook - Complete Setup & Testing Guide

## 🎯 Quick Overview

This is a complete TikTok-like social media application with:

- ✅ Backend API (Node.js + Express + MongoDB)
- ✅ Mobile App (React Native + Expo)
- ✅ Admin Panel (React + Vite)
- ✅ Real-time messaging (Socket.io)
- ✅ Push notifications (Firebase)
- ✅ Arabic RTL support

## 📋 Prerequisites Checklist

Before starting, install these:

- [ ] **Node.js** (v18+) - [Download](https://nodejs.org/)
- [ ] **MongoDB** - [Download](https://www.mongodb.com/try/download/community)
- [ ] **Git** - [Download](https://git-scm.com/)
- [ ] **Expo CLI** - Run: `npm install -g expo-cli`
- [ ] **Android Studio** (optional, for emulator)
- [ ] **VS Code** (recommended)

## 🚀 Setup Instructions

### Step 1: Backend Setup (15 minutes)

#### 1.1 Install Backend Dependencies

```powershell
cd c:\Users\ali--\Desktop\tikbook\backend
npm install
```

#### 1.2 Start MongoDB

**Windows:**

```powershell
# If MongoDB installed as service (auto-starts)
# Or manually:
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"
```

**Mac/Linux:**

```bash
sudo systemctl start mongod
# Or
brew services start mongodb-community
```

#### 1.3 Verify MongoDB is Running

```powershell
# Connect to MongoDB
mongosh
# Should show: connected to mongodb://localhost:27017
```

#### 1.4 Configure Environment Variables

The `.env` file is already configured with defaults:

```env
MONGO_URI=mongodb://localhost:27017/tikbook
JWT_SECRET=tikbook_super_secret_key_2024
PORT=5000
EMAIL_USER=noreply@tikbook.com
EMAIL_PASSWORD=your-app-password
```

**Optional**: Update EMAIL_USER and EMAIL_PASSWORD for OTP functionality.

#### 1.5 Seed Database with Dummy Data

```powershell
cd c:\Users\ali--\Desktop\tikbook\backend
npm run seed
```

This creates:

- ✅ 8 test users
- ✅ 15 sample videos
- ✅ Comments and likes
- ✅ Following relationships

#### 1.6 Start Backend Server

```powershell
cd c:\Users\ali--\Desktop\tikbook\backend
npm run dev
```

Expected output:

```
Firebase Admin initialized successfully
Server running on port 5000
MongoDB Connected: localhost
```

✅ **Backend is ready!** Keep this terminal open.

### Step 2: Mobile App Setup (10 minutes)

#### 2.1 Install Mobile Dependencies

Open a **NEW terminal** window:

```powershell
cd c:\Users\ali--\Desktop\tikbook\mobile
npm install
```

#### 2.2 Configure API URL

The API is pre-configured for Android Emulator. If using a physical device:

1. Find your computer's IP address:

   ```powershell
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. Open `mobile/src/config/api.js`
3. Update line 12:
   ```javascript
   PHYSICAL_DEVICE: 'http://YOUR_IP_HERE:5000/api',
   ```

#### 2.3 Start Expo Development Server

```powershell
cd c:\Users\ali--\Desktop\tikbook\mobile
npx expo start
```

Expected output:

```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

#### 2.4 Run on Device

**Option A: Android Emulator**

1. Open Android Studio
2. Start an emulator (Pixel 5, API 30+)
3. Press `a` in the Expo terminal

**Option B: Physical Android Device**

1. Install Expo Go from Play Store
2. Scan QR code from Expo terminal
3. Wait for app to load

**Option C: iOS Simulator (Mac only)**

1. Press `i` in the Expo terminal

✅ **Mobile app is running!**

### Step 3: Testing the Application (5 minutes)

#### 3.1 Login Options

**Option 1: Guest Mode (Fastest)**

1. Tap "Continue as Guest"
2. Start exploring immediately

**Option 2: Test Account**

1. Tap "Sign In"
2. Use credentials:
   - Email: `ahmed@tikbook.com`
   - Password: `123456`

**Option 3: Register New Account**

1. Tap "Sign Up"
2. Fill in details (OTP will fail if email not configured)

#### 3.2 Test Features

✅ **Video Feed**

- Scroll through videos
- Videos auto-play as you scroll
- Try vertical swipe gestures

✅ **Interactions**

- Tap ❤️ to like videos
- Tap 💬 to view comments
- Tap share icon to share

✅ **User Profiles**

- Tap username to view profile
- See follower counts
- View user's videos

✅ **Navigation**

- 🏠 Home: Video feed
- 👥 Users: Browse all users
- ➕ Upload: Upload new video
- 💬 Messages: Chat (requires login)
- 👤 Profile: Your profile

### Step 4: Build APK (Optional - 20 minutes)

See [BUILD_APK.md](BUILD_APK.md) for detailed instructions.

**Quick Build (EAS Cloud):**

```powershell
npm install -g eas-cli
eas login
cd c:\Users\ali--\Desktop\tikbook\mobile
eas build -p android --profile preview
```

## 🔧 Troubleshooting

### Backend Issues

#### Problem: MongoDB connection error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**

1. Make sure MongoDB is running
2. Check if mongod service is active
3. Verify connection string in `.env`

#### Problem: Port 5000 already in use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**

1. Change PORT in `.env` to 5001
2. Update `BASE_URL` in mobile app's `src/config/api.js`
3. Or kill process using port 5000:
   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID [PID_NUMBER] /F
   ```

#### Problem: JWT_SECRET warning

**Solution:**

- Already configured in `.env` file
- For production, use a long random string

### Mobile App Issues

#### Problem: Cannot connect to backend

```
Network Error / Timeout
```

**Solution:**

1. Verify backend is running (check terminal)
2. Test backend: Open browser → `http://localhost:5000`
3. For physical device:
   - Use computer's IP instead of localhost
   - Check firewall settings
   - Ensure device and computer on same WiFi

#### Problem: Videos not loading

**Solution:**

- Videos use dummy data from `assets/videos/`
- Real backend videos need upload functionality
- Guest mode always uses local videos

#### Problem: Expo won't start

```
Error: expo-cli not found
```

**Solution:**

```powershell
npm install -g expo-cli
# Or use npx:
npx expo start
```

#### Problem: Build errors in Android

**Solution:**

```powershell
# Clear cache
npx expo start --clear

# Clean Android build
cd android
.\gradlew clean
cd ..

# Delete and reinstall node_modules
Remove-Item node_modules -Recurse -Force
npm install
```

### Common Issues

#### Redis/Firebase Warnings

```
Firebase Admin not initialized
```

**Solution:**

- Firebase is optional for push notifications
- App works without it
- To enable: Add firebase-service-account.json to backend/config/

#### Module Not Found Errors

**Solution:**

```powershell
# Backend
cd backend
Remove-Item node_modules -Recurse -Force
npm install

# Mobile
cd mobile
Remove-Item node_modules -Recurse -Force
npm install
```

## 📱 Admin Panel Setup (Optional)

```powershell
cd c:\Users\ali--\Desktop\tikbook\admin
npm install
npm run dev
```

Access at: `http://localhost:5173`

## 🧪 Testing Checklist

Use this to verify everything works:

### Backend Tests

- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] Seed data loads correctly
- [ ] API responds at http://localhost:5000
- [ ] Version endpoint works: http://localhost:5000/api/version

### Mobile App Tests

- [ ] App loads without crashes
- [ ] Guest login works
- [ ] Video feed displays videos
- [ ] Videos auto-play
- [ ] Like button works
- [ ] Comments display
- [ ] User profiles load
- [ ] Navigation between screens works

### Integration Tests

- [ ] Mobile app connects to backend
- [ ] Real-time updates work
- [ ] Image uploads work
- [ ] Video uploads work (if implemented)

## 📊 Test Data Summary

After seeding, you have:

**Users (8):**

- ahmed@tikbook.com (أحمد_الفنان)
- sara@tikbook.com (سارة_المسافرة)
- mohamed@tikbook.com (محمد_الرياضي)
- noor@tikbook.com (نور_المصورة)
- khaled@tikbook.com (خالد_المرح)
- layla@tikbook.com (ليلى_الطباخة)
- omar@tikbook.com (عمر_التقني)
- fatima@tikbook.com (فاطمة_الكاتبة)

**Password for all**: `123456`

**Videos:** 15 videos with various descriptions, likes, and comments

## 🎨 Customization

### Change App Name

1. `mobile/app.json` → Update "name"
2. `mobile/android/app/src/main/res/values/strings.xml`

### Change App Icon

Replace files in `mobile/assets/`:

- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024)
- `splash.png` (1242x2436)

Then rebuild:

```powershell
npx expo prebuild --clean
```

### Change Colors/Theme

Edit `mobile/src/screens/[ScreenName].js` → StyleSheet section

### Change API URL

`mobile/src/config/api.js` → Update API_CONFIGS

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Express Guide](https://expressjs.com/en/guide/routing.html)
- [Socket.io Docs](https://socket.io/docs/v4/)

## 🆘 Getting Help

If you encounter issues:

1. **Check logs**:

   - Backend: Terminal where server is running
   - Mobile: Expo terminal or device logs
   - MongoDB: Check mongod.log

2. **Search errors**: Copy error message to Google

3. **Check dependencies**: Ensure Node.js and MongoDB versions are correct

4. **Restart everything**:
   ```powershell
   # Stop all servers (Ctrl+C)
   # Close all terminals
   # Restart backend
   # Restart mobile app
   ```

## ✅ Success Criteria

You should see:

✅ Backend terminal: "Server running on port 5000"
✅ Mobile app: Video feed with scrollable videos
✅ No red error screens in the app
✅ Likes and comments work
✅ Navigation works smoothly

## 🎉 Next Steps

Once everything works:

1. **Development**:

   - Add new features
   - Customize UI/UX
   - Add more test data

2. **Testing**:

   - Test on multiple devices
   - Test different network conditions
   - Test edge cases

3. **Deployment**:
   - Build production APK
   - Set up production backend
   - Deploy to cloud (AWS, Heroku, etc.)
   - Publish to Google Play Store

---

**Need help?** Check the troubleshooting section or open an issue in the repository.

**Happy coding!** 🚀
