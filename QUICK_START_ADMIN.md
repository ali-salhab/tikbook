# 🚀 Quick Start Guide - TikBook Admin Panel

## 5-Minute Setup

### Step 1: Start Backend (Port 5000)

```bash
cd backend
npm run dev
```

Expected output:

```
Server running on port 5000
MongoDB Connected: localhost
Firebase Admin initialized successfully
```

### Step 2: Start Admin Panel (Port 5173)

```bash
cd admin
npm run dev
```

Expected output:

```
VITE v6.0.1  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Step 3: Open Admin Panel

Navigate to: `http://localhost:5173`

### Step 4: Login

```
Email: admin@tikbook.com
Password: 123456
```

## ✅ What's Fixed

1. **Firebase Error** - Changed reserved key `from` → `source`
2. **Icon Error** - Changed non-existent `FiBarChart3` → `FiBarChart2`
3. **CSS Warning** - Added standard `line-clamp` property

## 🎯 Key Features Ready to Use

✅ Dashboard with real-time statistics
✅ User management with advanced filtering
✅ Video management with working player
✅ Comments moderation
✅ Payment gateway configuration
✅ Coin rewards system
✅ App version management
✅ Responsive mobile design

## 📍 Navigation

### Sidebar Menu

- 📊 **لوحة التحكم** (Dashboard)
- 👥 **المستخدمون** (Users)
- 🎬 **الفيديوهات** (Videos)
- 💬 **التعليقات** (Comments)
- 💳 **المدفوعات** (Payments)
- 🎁 **المكافآت والعملات** (Rewards)
- 📱 **إدارة الإصدارات** (App Versions)
- 🚪 **تسجيل الخروج** (Logout)

## 🎮 Demo Actions

### 1. View Dashboard

Click "لوحة التحكم" to see real-time statistics

### 2. Manage Users

- Click "المستخدمون"
- Use filters (search, status, date, activity)
- Click user to see details
- Delete users if needed

### 3. Manage Videos

- Click "الفيديوهات"
- Click any video to play
- Use video controls to pause/play/adjust volume
- Filter videos by date or search

### 4. Send Notifications

- Go to Users Management
- Click user → Send Notification
- Type title and body
- Send notification (no 500 error now!)

### 5. Distribute Coins

- Click "المكافآت والعملات"
- Click "Give Reward" on any user
- Enter coin amount and reason
- Submit

### 6. Bulk Rewards

- Click "المكافآت والعملات"
- Click "Bulk Reward"
- Enter amount per user
- Apply to all filtered users

## 🔍 Verification

### Backend Health Check

```bash
curl http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Admin Panel Health Check

1. Open browser DevTools (F12)
2. Check Console tab - should be empty (no errors)
3. Check Network tab - API calls should be 200 OK

## ⚠️ Common Issues

### Issue: "Cannot find module 'react-icons'"

**Solution:**

```bash
cd admin
npm install react-icons
```

### Issue: "Port 5000 already in use"

**Solution:**

```bash
npx kill-port 5000
npm run dev
```

### Issue: "Firebase not initialized"

**Solution:**
Ensure `backend/config/firebase-service-account.json` exists with valid credentials

### Issue: "Connection refused"

**Solution:**

- Check backend is running on port 5000
- Check MongoDB is running
- Check no firewall blocking connections

## 📊 Expected Performance

- **Initial Load:** 2-3 seconds
- **Dashboard Load:** < 1 second
- **Users List:** < 2 seconds
- **Video Player:** Instant play
- **Notifications:** Immediate response

## 🎓 Next Steps

1. Test all features thoroughly
2. Configure payment gateways with real API keys
3. Set up production environment variables
4. Deploy to production

## 📞 Support

If you encounter any issues:

1. Check browser console (F12) for error messages
2. Check backend logs in terminal
3. Verify all backend services are running
4. Check network requests in DevTools Network tab
5. Review detailed guides in:
   - `ADMIN_PANEL_GUIDE.md` - Complete feature documentation
   - `FIREBASE_FIX_GUIDE.md` - Firebase and notification fixes

## 🎉 Everything is Ready!

Your admin panel is fully functional. Start using it to manage your TikBook application!

**Backend:** http://localhost:5000
**Admin Panel:** http://localhost:5173
