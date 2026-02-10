# 🚀 Quick Start - Testing Push Notifications

Your Expo Token: `ExponentPushToken[XCJnCCBTHNFSNLE8cZHflM]`

---

## ⚡ Quick Commands

### Send a test notification RIGHT NOW:

```bash
cd backend
npm run send-notification
```

### Send with custom message:

```bash
npm run send-notification "عنوان الاشعار" "نص الإشعار"
```

### Send with navigation:

```bash
npm run send-notification "إشعار جديد" "لديك رسالة" "Activity"
```

### Interactive menu (best for testing):

```bash
npm run test-push
```

---

## 📱 Test ALL Scenarios

### 1️⃣ App is CLOSED

```bash
# 1. Force quit TikBook app
# 2. Run this:
cd backend
npm run send-notification "اشعار 1" "التطبيق مغلق"

# 3. Tap the notification - app should open
```

### 2️⃣ App in BACKGROUND

```bash
# 1. Open TikBook and minimize it
# 2. Run:
npm run send-notification "اشعار 2" "التطبيق في الخلفية"

# 3. Tap notification - app comes to foreground
```

### 3️⃣ App is OPEN (Foreground)

```bash
# 1. Keep TikBook open and visible
# 2. Run:
npm run send-notification "اشعار 3" "التطبيق مفتوح"

# 3. You should see in-app notification banner
```

---

## 🎯 Test Navigation

```bash
# To Activity Screen
npm run send-notification "نشاط جديد" "لديك إشعارات" "Activity"

# To Profile
npm run send-notification "الملف الشخصي" "شاهد ملفك" "Profile"

# To MainTabs->Home (complex navigation)
node quickSend.js "فيديو جديد" "شاهد هذا" "MainTabs"
```

---

## 🌐 Alternative: Use Expo's Web Tool

1. Go to: https://expo.dev/notifications
2. Paste token: `ExponentPushToken[XCJnCCBTHNFSNLE8cZHflM]`
3. Write your message
4. (Optional) Add JSON data:
   ```json
   { "screen": "Activity" }
   ```
5. Click Send

---

## ✅ What to Check

- [ ] Notification sound plays
- [ ] Notification appears in all 3 states (closed, background, foreground)
- [ ] Tapping notification opens the app
- [ ] Navigation to correct screen works
- [ ] Arabic text displays correctly
- [ ] Notification icon shows

---

## 🛠 Troubleshooting

**No notification?**

- Check if app has notification permission
- Make sure axios is installed: `npm install axios`
- Verify token is saved in database

**Navigation doesn't work?**

- Check console logs in app
- Verify screen names are correct
- Test with simple screen first (Activity, Profile)

---

## 📚 Full Documentation

See [NOTIFICATION_TESTING_GUIDE.md](../NOTIFICATION_TESTING_GUIDE.md) for complete details.

---

**Pro Tip**: Keep this terminal open and test quickly:

```bash
cd backend
# Then just run:
npm run send-notification
npm run send-notification "Test 2" "Another test"
npm run send-notification "Test 3" "With nav" "Activity"
```

Happy Testing! 🎉
