# 🚀 Quick Deployment Checklist

## ✅ Before Deployment

- [ ] Backend is deployed and working on Render
- [ ] Backend URL is correct: `https://tikbook-1cdb.onrender.com`
- [ ] Admin panel builds successfully locally (`npm run build`)
- [ ] Git repository is up to date

## ✅ Render Configuration

- [ ] Create new Static Site on Render
- [ ] Root Directory: `admin`
- [ ] Build Command: `npm install && npm run build`
- [ ] Publish Directory: `dist`
- [ ] Environment Variable: `VITE_API_URL=https://tikbook-1cdb.onrender.com` (⚠️ WITHOUT /api at the end)

## ✅ Backend Updates

- [ ] Update CORS to allow Render admin URL
- [ ] Redeploy backend after CORS update

## ✅ Post-Deployment Testing

- [ ] Can access admin panel at Render URL
- [ ] Can login with admin credentials
- [ ] Dashboard loads without errors
- [ ] Can view users list
- [ ] Can view videos list
- [ ] Can send notifications
- [ ] Can manage app versions
- [ ] Can approve verification requests

## 🔧 Troubleshooting Commands

```bash
# Test production build locally
cd admin
npm run build
npm run preview

# Check environment variables
echo $VITE_API_URL

# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## 📝 Important URLs

- Backend API: https://tikbook-1cdb.onrender.com
- Admin Panel (after deploy): https://tikbook-admin.onrender.com
- Render Dashboard: https://dashboard.render.com

## 🆘 Common Issues

**Issue**: Blank page after deployment
**Fix**: Check browser console, verify `_redirects` file exists in `public/`

**Issue**: "Failed to fetch" errors
**Fix**: Verify CORS settings in backend and VITE_API_URL is correct

**Issue**: 404 on refresh
**Fix**: Add `_redirects` file with `/* /index.html 200`

---

For detailed instructions, see: [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)
