# TikBook Admin Panel

Complete admin dashboard for managing TikBook application with user management, content moderation, analytics, and notification system.

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd admin
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set VITE_API_URL to your backend URL

# 3. Start development server
npm run dev
```

Admin panel will be available at: http://localhost:5173

## 📋 Features

### 🎯 Dashboard

- Real-time statistics (users, videos, engagement)
- Top users and top videos
- Activity metrics and charts
- Quick access to all management sections

### 👥 Users Management

- View all registered users
- Search and filter by username/email
- Sort by followers, videos, join date, activity
- User details modal with:
  - Email, followers count, videos count
  - Join date and account statistics
  - **Send notification button** (NEW)
- Grant coins and rewards to users
- Delete users (with confirmation)

### 🎬 Videos Management

- View all uploaded videos
- Video statistics and engagement metrics
- Content moderation tools
- Delete inappropriate videos

### 💬 Comments Management

- View all comments across platform
- Comment moderation
- Filter by video or user
- Delete inappropriate comments

### 📬 Notifications Management (NEW)

Complete notification system with three main features:

#### Send to Individual User

- Search users by username or email
- Select notification type:
  - Admin Notification
  - System Message
  - Announcement
  - Promotion
  - App Update
- Custom title and message
- Real-time success/error feedback

#### Broadcast to All Users

- Send system-wide announcements
- Same notification types as individual
- Confirmation dialog for safety
- Detailed statistics after send:
  - Total users reached
  - Database notifications saved
  - Push notifications sent (success/failure)

#### Notification Templates

- 4 pre-built templates in Arabic:
  - Welcome message
  - App update notification
  - Special offer/promotion
  - Important announcement
- One-click to use in Send or Broadcast
- Fully customizable after loading

### 💳 Payments Management

- View all transactions
- Payment history
- Revenue analytics
- Transaction details

### 🎁 Rewards Management

- Manage coin rewards system
- User wallet management
- Grant or revoke coins
- Reward history and analytics

### 📊 Analytics

- Detailed analytics dashboard
- User engagement metrics
- Video performance tracking
- Growth charts and trends

### 📱 App Versions Management

- Manage app versions
- Force update settings
- Version compatibility
- Release notes

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the admin directory:

```env
# Backend API URL
# For local development with local backend:
VITE_API_URL=http://localhost:5000

# For local development with Render backend:
VITE_API_URL=https://your-app.onrender.com

# For production (Vercel):
VITE_API_URL=https://your-app.onrender.com
```

### API Endpoints Used

The admin panel communicates with these backend endpoints:

**Authentication**:

- POST `/api/auth/login` - Admin login

**Admin Routes** (all require admin authentication):

- GET `/api/admin/stats` - Dashboard statistics
- GET `/api/admin/users` - All users
- GET `/api/admin/videos` - All videos
- DELETE `/api/admin/users/:id` - Delete user
- DELETE `/api/admin/videos/:id` - Delete video
- POST `/api/admin/coins/:userId` - Grant coins
- **POST `/api/admin/notify/:userId`** - Send notification to user (NEW)
- **POST `/api/admin/notify/all`** - Broadcast notification (NEW)

## 🚀 Deployment

### Deploy to Vercel (Recommended)

#### Automatic Deployment (Easiest)

1. Push your code to GitHub

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Configure build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `admin`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Add environment variable:

   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```

5. Deploy!

#### Manual Deployment via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from admin directory
cd admin
vercel --prod

# Set environment variable
vercel env add VITE_API_URL production
# Enter your backend URL when prompted
```

### Backend Setup

Ensure your backend has CORS configured for the admin panel URL:

```javascript
// backend/server.js
const allowedOrigins = [
  "http://localhost:5173", // Local development
  "https://your-admin.vercel.app", // Production admin panel
  "https://your-admin-custom-domain.com",
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
    credentials: true,
  }),
);
```

## 🔐 Authentication

### First Admin User

If you don't have an admin user yet:

```bash
cd backend
node createAdmin.js
```

Follow the prompts to create your first admin account.

### Login Flow

1. Navigate to admin panel URL
2. Enter admin email and password
3. Token is stored in localStorage as `adminToken`
4. All subsequent API requests include this token
5. Token expires after 30 days (configurable in backend)

### Logout

Click "تسجيل الخروج" (Logout) in sidebar to:

- Remove token from localStorage
- Redirect to login page

## 🛠️ Development

### Prerequisites

- Node.js 16 or higher
- npm or yarn
- Backend server running (local or remote)

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Starts Vite dev server on http://localhost:5173 with hot reload.

### Build for Production

```bash
npm run build
```

Creates optimized production build in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

Preview the production build locally before deploying.

### Linting

```bash
npm run lint
```

## 📁 Project Structure

```
admin/
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AdminLayout.jsx  # Main layout wrapper
│   │   └── Sidebar.jsx      # Navigation sidebar
│   ├── config/
│   │   └── api.js          # API configuration & axios instance
│   ├── pages/              # Page components (routes)
│   │   ├── Dashboard.jsx
│   │   ├── UsersManagement.jsx
│   │   ├── VideosManagement.jsx
│   │   ├── CommentsManagement.jsx
│   │   ├── NotificationsManagement.jsx  # NEW
│   │   ├── PaymentsManagement.jsx
│   │   ├── RewardsManagement.jsx
│   │   ├── AnalyticsPage.jsx
│   │   ├── AppVersionManagementPage.jsx
│   │   └── LoginPage.jsx
│   ├── styles/             # CSS modules
│   │   ├── Sidebar.css
│   │   ├── UsersManagement.css
│   │   └── ...
│   ├── App.jsx             # Main app component with routing
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── .env.example            # Environment variables template
├── .gitignore
├── index.html
├── package.json
├── vite.config.js          # Vite configuration
├── DEPLOYMENT_GUIDE.md     # Detailed deployment instructions
└── TESTING_GUIDE.md        # Testing procedures
```

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Arabic Language Support**: RTL layout and Arabic text
- **Loading States**: Shows loading indicators for async operations
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages after actions
- **Search & Filter**: Easy data finding and filtering
- **Sorting**: Multiple sort options
- **Modal Dialogs**: Non-intrusive detail views
- **Confirmation Dialogs**: Prevent accidental deletions
- **Real-time Updates**: Immediate feedback on actions

## 🧪 Testing

### Quick Test

```bash
# 1. Start backend
cd backend
npm run dev

# 2. Start admin panel (in new terminal)
cd admin
npm run dev

# 3. Test login
# Navigate to http://localhost:5173
# Login with admin credentials

# 4. Test notifications
# Go to Notifications page
# Send test notification
# Verify in mobile app
```

### Comprehensive Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed testing procedures.

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing procedures and checklist
- **[../ADMIN_NOTIFICATION_SYSTEM.md](../ADMIN_NOTIFICATION_SYSTEM.md)** - Implementation details
- **[../QUICK_START_NOTIFICATIONS.md](../QUICK_START_NOTIFICATIONS.md)** - 5-minute quick start

## 🐛 Troubleshooting

### Issue: Can't connect to backend

**Check**:

1. Is backend server running?
2. Is `VITE_API_URL` correct in `.env`?
3. Is CORS configured on backend?

**Solution**:

```bash
# Verify backend is accessible
curl http://localhost:5000/api/health

# Check .env file
cat .env

# Restart admin panel after changing .env
npm run dev
```

### Issue: Login fails with "Invalid credentials"

**Check**:

1. Are you using admin credentials (not regular user)?
2. Does admin user exist in database?

**Solution**:

```bash
# Create admin user
cd backend
node createAdmin.js
```

### Issue: "Network Error" when sending notifications

**Check**:

1. Backend notifications routes enabled
2. Admin token valid
3. Network connectivity

**Debug**:

- Open browser DevTools → Network tab
- Try sending notification
- Check request/response
- Look for CORS or auth errors

### Issue: CORS errors in browser console

**Solution**: Add your admin panel URL to backend CORS whitelist:

```javascript
// backend/server.js
const allowedOrigins = [
  "http://localhost:5173",
  "https://your-admin.vercel.app",
];
```

## 🔧 Advanced Configuration

### Custom Port

```bash
# Start on different port
npm run dev -- --port 3001
```

### API Timeout

Edit `src/config/api.js`:

```javascript
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000, // 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Charts Configuration

Dashboard uses Chart.js. Customize in `src/pages/Dashboard.jsx`:

```javascript
const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
    },
    title: {
      display: true,
      text: "User Growth",
    },
  },
};
```

## 🚀 Performance Tips

1. **Bundle Size**: Keep dependencies minimal
2. **Code Splitting**: Use React.lazy() for routes
3. **Image Optimization**: Use WebP format, lazy loading
4. **Caching**: Leverage Vercel CDN
5. **API Calls**: Minimize unnecessary requests, implement pagination

## 🔒 Security

- ✅ JWT authentication required for all admin routes
- ✅ Tokens stored in localStorage (HTTPS only in production)
- ✅ CORS configured on backend
- ✅ Input validation on forms
- ✅ Confirmation dialogs for destructive actions
- ✅ Rate limiting on backend (recommended)

## 📈 Monitoring

### Vercel Analytics

Enable in Vercel dashboard:

- Page views
- Performance metrics
- Error tracking

### Backend Monitoring

Monitor on Render:

- API response times
- Error rates
- Resource usage

## 🤝 Contributing

This is a proprietary admin panel for TikBook. For access:

1. Contact project administrator
2. Follow code review process
3. Use consistent code style
4. Update documentation

## 📄 License

Proprietary - TikBook Admin Panel

## 🆘 Support

For issues or questions:

1. Check documentation files
2. Review troubleshooting section
3. Check console logs (browser & backend)
4. Contact development team

---

**Version**: 2.0.0 (with Notifications Management)
**Last Updated**: January 2025
**Status**: ✅ Production Ready
