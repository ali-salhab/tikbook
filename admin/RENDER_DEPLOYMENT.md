# 🚀 Deploying TikBook Admin Panel to Render

This guide will help you deploy your React admin panel to Render as a static site.

## 📋 Prerequisites

- Render account (free tier available at https://render.com)
- Git repository (GitHub, GitLab, or Bitbucket)
- Backend already deployed on Render

---

## 🔧 Step 1: Prepare Your Admin Panel for Production

### 1.1 Update API Configuration

Edit `admin/src/config/api.js`:

```javascript
// admin/src/config/api.js
import axios from "axios";

// Production backend URL (your Render backend URL)
const API_URL =
  import.meta.env.VITE_API_URL || "https://tikbook-1cdb.onrender.com";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
```

### 1.2 Create Environment Variable File

Create `.env.production` in the `admin/` folder:

```env
# Backend API URL (your Render backend)
# Note: Do NOT include /api - it's added automatically in api.js
VITE_API_URL=https://tikbook-1cdb.onrender.com
```

### 1.3 Update Build Script

Check your `admin/package.json` has the build script:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 1.4 Test Production Build Locally

```bash
cd admin
npm run build
npm run preview
```

Visit `http://localhost:4173` to test the production build.

---

## 🌐 Step 2: Push to Git Repository

### 2.1 Create `.gitignore` (if not exists)

```
# admin/.gitignore
node_modules
dist
.env.local
.DS_Store
```

### 2.2 Commit and Push

```bash
cd admin
git add .
git commit -m "Prepare admin panel for Render deployment"
git push origin main
```

---

## ☁️ Step 3: Deploy to Render

### 3.1 Create New Static Site

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Static Site"**
3. Connect your Git repository
4. Select your repository and branch (e.g., `main`)

### 3.2 Configure Build Settings

Fill in the following settings:

| Setting               | Value                          |
| --------------------- | ------------------------------ |
| **Name**              | `tikbook-admin`                |
| **Root Directory**    | `admin`                        |
| **Build Command**     | `npm install && npm run build` |
| **Publish Directory** | `dist`                         |

### 3.3 Add Environment Variables

In the **Environment** section, add:

| Key            | Value                                        |
| -------------- | -------------------------------------------- |
| `VITE_API_URL` | `https://tikbook-1cdb.onrender.com` (no /api) |

### 3.4 Advanced Settings (Optional)

- **Auto-Deploy**: ✅ Enabled (deploys on every git push)
- **Branch**: `main` or your preferred branch

### 3.5 Create Static Site

Click **"Create Static Site"** and wait for deployment (5-10 minutes first time).

---

## 🔄 Step 4: Configure Backend CORS

Update your backend to allow the admin panel domain:

```javascript
// backend/server.js
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://tikbook-admin.onrender.com", // Your Render admin URL
  "https://your-custom-domain.com", // If you add custom domain
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
```

Redeploy your backend after this change.

---

## ✅ Step 5: Verify Deployment

### 5.1 Access Your Admin Panel

Your admin panel will be available at:

```
https://tikbook-admin.onrender.com
```

### 5.2 Test Key Features

- [ ] Login with admin credentials
- [ ] Dashboard loads correctly
- [ ] Can view users
- [ ] Can view videos
- [ ] Can send notifications
- [ ] Can manage app versions

---

## 🎨 Step 6: Add Custom Domain (Optional)

### 6.1 In Render Dashboard

1. Go to your static site settings
2. Click **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `admin.tikbook.com`)

### 6.2 Update DNS Records

Add these records to your domain provider (e.g., Namecheap, GoDaddy):

| Type    | Name    | Value                        |
| ------- | ------- | ---------------------------- |
| `CNAME` | `admin` | `tikbook-admin.onrender.com` |

Or for root domain:

| Type | Name | Value                        |
| ---- | ---- | ---------------------------- |
| `A`  | `@`  | Get IP from Render dashboard |

Wait 24-48 hours for DNS propagation.

---

## 🔧 Troubleshooting

### Issue: "Failed to fetch" errors

**Solution**: Check CORS settings in backend and ensure API_URL is correct.

```javascript
// admin/src/config/api.js
console.log("API URL:", import.meta.env.VITE_API_URL);
```

### Issue: Blank page after deployment

**Solution**: Check browser console for errors, verify build completed successfully.

### Issue: 404 on page refresh

**Solution**: Add `_redirects` file in `admin/public/`:

```
# admin/public/_redirects
/*    /index.html   200
```

Then rebuild.

### Issue: Environment variables not working

**Solution**:

- Ensure they start with `VITE_`
- Restart dev server after adding new env vars
- Rebuild on Render

---

## 🚀 Step 7: Continuous Deployment

After initial setup, every push to your repository will automatically deploy:

```bash
# Make changes
git add .
git commit -m "Update admin panel"
git push origin main

# Render will automatically build and deploy (takes 3-5 minutes)
```

---

## 📊 Monitoring

### Check Build Logs

1. Go to Render dashboard
2. Click on your static site
3. View **"Logs"** tab for build and deployment logs

### Check Site Status

Monitor your site status at:

```
https://dashboard.render.com
```

---

## 💰 Pricing

### Free Tier Includes:

- ✅ Automatic SSL/HTTPS
- ✅ Global CDN
- ✅ Unlimited bandwidth
- ✅ Automatic deploys
- ⚠️ Site sleeps after 15 min inactivity (paid plans don't sleep)

### Paid Plans (Optional):

- **Starter**: $7/month - No sleep, faster builds
- **Pro**: $25/month - Priority support, advanced features

---

## 📝 Summary

Your deployed setup will be:

```
┌─────────────────────────────────────────┐
│  Frontend (Admin Panel)                 │
│  https://tikbook-admin.onrender.com     │
│  (Static Site on Render)                │
└──────────────┬──────────────────────────┘
               │
               │ API Calls
               │
               ▼
┌─────────────────────────────────────────┐
│  Backend API                            │
│  https://tikbook-1cdb.onrender.com      │
│  (Web Service on Render)                │
└─────────────────────────────────────────┘
```

---

## 🎉 Next Steps

1. **Set up monitoring**: Use UptimeRobot or Render's built-in monitoring
2. **Configure backups**: Ensure your database is backed up regularly
3. **Enable 2FA**: Add two-factor authentication for admin accounts
4. **Add rate limiting**: Protect your API from abuse
5. **Monitor analytics**: Track admin panel usage

---

## 📞 Need Help?

- Render Docs: https://render.com/docs/static-sites
- TikBook Discord: [Your Discord Link]
- Email Support: [Your Email]

---

**Deployment Date**: February 12, 2026
**Version**: 1.0.0
