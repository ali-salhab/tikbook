# Quick Setup - Connect Admin to Render Backend

## ✅ Configuration Complete!

Your admin panel is now configured to use the production backend on Render.

### Backend URL

```
https://tikbook-1cdb.onrender.com
```

---

## 🚀 Steps to View Real Data

### 1. Restart the Admin Panel

**IMPORTANT**: The admin dev server must be restarted to load the new environment variables.

```bash
# Stop the current dev server (Ctrl+C if running)
# Then restart:

cd admin
npm run dev
```

The admin panel will be available at: `http://localhost:5173`

### 2. Login with Admin Credentials

```
Email: admin@tikbook.com
Password: 123456
```

### 3. You'll See Real Data From Production

Once logged in, the dashboard will display:

- ✅ **Real user count** from your production MongoDB
- ✅ **Real video count** from Cloudinary
- ✅ **Real comments** from all videos
- ✅ **Real revenue** from user wallets
- ✅ **Top users** by followers
- ✅ **Top videos** by likes
- ✅ **Monthly user growth** chart with actual registration data

---

## 🔧 Troubleshooting

### Issue: Still seeing "0" for all stats

**Cause**: Old dev server using localhost backend

**Fix**:

1. **Stop the dev server** completely (Ctrl+C)
2. **Clear browser cache** or open in incognito mode
3. **Restart dev server**: `npm run dev`
4. **Check .env file exists**: `admin/.env` should contain:
   ```
   VITE_API_URL=https://tikbook-1cdb.onrender.com
   ```

### Issue: CORS errors in browser console

**Solution**: Your backend already has CORS enabled for all origins, so this should work. If you see CORS errors:

1. Check backend is running on Render
2. Verify URL is correct: `https://tikbook-1cdb.onrender.com`
3. Check Render logs for errors

### Issue: Login fails

**Causes**:

1. Admin user doesn't exist in production database
2. Wrong credentials

**Fix**: Create admin user on production:

```bash
# SSH into Render or use Render Shell
cd backend
node createAdmin.js
```

Or use MongoDB Atlas/Compass to create admin manually:

```javascript
{
  "username": "admin",
  "email": "admin@tikbook.com",
  "password": "$2a$10$...", // hashed "123456"
  "isAdmin": true,
  "bio": "TikBook Administrator"
}
```

### Issue: Slow loading

**Cause**: Render free tier may have cold starts

**Solution**: Wait 30-60 seconds for first request. Subsequent requests will be faster.

---

## 📊 What You'll See

### Dashboard Cards (with real numbers):

```
المستخدمون: [actual user count]
الفيديوهات: [actual video count]
التعليقات: [actual comment count]
الإيرادات: [actual wallet balance sum] جنيه
```

### Charts:

- **User Growth**: Real monthly registration data
- **Activity Distribution**: Online/offline ratio

### Lists:

- **Top Users**: Sorted by follower count
- **Top Videos**: Sorted by likes

---

## 🎨 Layout Improvements Made

✅ Improved background color consistency
✅ Better padding and spacing
✅ Fixed responsive layout issues
✅ Updated sidebar gradient to TikBook colors
✅ Enhanced stat card hover effects
✅ Improved chart styling

---

## 📱 Deploy Admin Panel to Production (Optional)

Once you've tested locally, deploy to Vercel:

```bash
cd admin

# Install Vercel CLI if not already installed
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Then add environment variable in Vercel dashboard:

- Key: `VITE_API_URL`
- Value: `https://tikbook-1cdb.onrender.com`

---

## 🔐 Security Notes

1. **Change default admin password** in production!
2. **Add CORS whitelist** in backend for production:

   ```javascript
   // backend/server.js
   const allowedOrigins = [
     "http://localhost:5173",
     "https://your-admin.vercel.app",
   ];

   app.use(
     cors({
       origin: function (origin, callback) {
         if (!origin || allowedOrigins.includes(origin)) {
           callback(null, true);
         } else {
           callback(new Error("Not allowed by CORS"));
         }
       },
     }),
   );
   ```

3. **.env file** is now in `.gitignore` - don't commit it!

---

## ✅ Verification Checklist

- [ ] `.env` file created with Render URL
- [ ] Dev server restarted
- [ ] Admin login successful
- [ ] Dashboard shows real user count
- [ ] Dashboard shows real video count
- [ ] Top users list populated
- [ ] Top videos list populated
- [ ] Charts displaying data
- [ ] No console errors

---

**Need help?** Check:

- Render backend logs: https://dashboard.render.com
- Browser console (F12) for errors
- Network tab to see API requests/responses

**Next Steps**:

1. Restart dev server NOW
2. Login and verify data
3. Test all admin features (users, videos, notifications)
4. Deploy to Vercel when ready
