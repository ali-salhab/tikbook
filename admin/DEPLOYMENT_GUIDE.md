# Admin Panel - Deployment and Configuration Guide

## Overview

The TikBook Admin Panel is a React-based dashboard for managing users, videos, notifications, and more. This guide covers setup, configuration, and deployment to Vercel with Render backend.

## Architecture

- **Frontend**: React + Vite
- **Backend**: Node.js/Express on Render
- **UI Libraries**: React Router, Axios, Chart.js, React Icons
- **Styling**: Custom CSS

## Local Development

### Prerequisites

- Node.js 16+
- npm or yarn
- Backend server running (locally or on Render)

### Setup Steps

1. **Navigate to admin directory**:

   ```bash
   cd admin
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the admin directory:

   ```bash
   # For local development with local backend
   VITE_API_URL=http://localhost:5000

   # Or for local development with Render backend
   VITE_API_URL=https://your-app-name.onrender.com
   ```

4. **Start development server**:

   ```bash
   npm run dev
   ```

   The admin panel will be available at `http://localhost:5173`

## Production Deployment to Vercel

### Automatic Deployment (Recommended)

1. **Push your code to GitHub**

2. **Connect to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `admin` directory as the root directory

3. **Configure Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://your-backend.onrender.com
     ```

4. **Deploy Settings**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Deploy**: Vercel will automatically build and deploy your app

### Manual Deployment via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from admin directory
cd admin
vercel --prod

# Set environment variables
vercel env add VITE_API_URL production
# Enter your Render backend URL when prompted
```

## Backend Setup (Render)

Ensure your backend is deployed to Render with these requirements:

1. **CORS Configuration**: Update `backend/server.js` to allow your Vercel domain:

   ```javascript
   const allowedOrigins = [
     "http://localhost:5173",
     "https://your-admin-panel.vercel.app",
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

2. **Admin Routes**: Ensure admin routes are properly protected:
   - `/api/admin/stats`
   - `/api/admin/users`
   - `/api/admin/videos`
   - `/api/admin/notify/:userId`
   - `/api/admin/notify/all`

## Features

### 🎯 Dashboard

- User statistics
- Video analytics
- Real-time metrics
- Top users and videos

### 👥 Users Management

- View all users
- Search and filter users
- User details modal
- Send notifications to specific users
- Grant coins/rewards

### 🎬 Videos Management

- View all videos
- Video statistics
- Content moderation
- Delete videos

### 💬 Comments Management

- View all comments
- Moderate comments
- Delete inappropriate content

### 📬 **NEW: Notifications Management**

- **Send to Individual User**: Target specific users with custom notifications
- **Broadcast to All Users**: Send system-wide announcements
- **Notification Types**: Admin, System, Announcement, Promo, Update
- **Templates**: Pre-built notification templates in Arabic
- **Integration**: Quick notification button in user details modal
- **Database + Push**: Creates database records AND sends push notifications

### 💳 Payments Management

- View transactions
- Payment history
- Revenue analytics

### 🎁 Rewards Management

- Manage coin rewards
- User wallet management
- Grant/revoke coins

### 📊 Analytics

- Detailed analytics dashboard
- User engagement metrics
- Video performance

### 📱 App Versions

- Manage app versions
- Force update settings
- Version compatibility

## API Configuration

The admin panel uses `admin/src/config/api.js` for API communication:

```javascript
// Automatically uses VITE_API_URL from .env
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});
```

### Environment Variables

| Variable       | Description     | Example                            |
| -------------- | --------------- | ---------------------------------- |
| `VITE_API_URL` | Backend API URL | `https://tikbook-api.onrender.com` |

## Authentication

The admin panel uses JWT authentication:

1. **Login**: POST `/api/auth/login` with admin credentials
2. **Token Storage**: JWT stored in `localStorage` as `adminToken`
3. **Protected Routes**: All admin routes require valid admin token
4. **Logout**: Removes token from localStorage

### First Admin User

Create first admin via backend:

```bash
cd backend
node createAdmin.js
```

Follow prompts to create admin credentials.

## Notification System Architecture

### Backend Implementation

The notification system has two main endpoints:

#### 1. Send to Individual User

**Endpoint**: `POST /api/admin/notify/:userId`

**Request Body**:

```json
{
  "title": "Notification Title",
  "body": "Notification message",
  "type": "admin"
}
```

**What it does**:

- Creates a notification record in MongoDB
- Sends push notification via Firebase/Expo
- Returns notification details

#### 2. Broadcast to All Users

**Endpoint**: `POST /api/admin/notify/all`

**Request Body**:

```json
{
  "title": "Broadcast Title",
  "body": "Broadcast message",
  "type": "admin_broadcast"
}
```

**What it does**:

- Creates notification records for ALL users in MongoDB
- Sends push notifications to users with tokens
- Returns success/failure counts

### Frontend Implementation

Located in: `admin/src/pages/NotificationsManagement.jsx`

**Features**:

- Three tabs: Send to User, Broadcast, Templates
- User search and selection
- Notification type selection
- Pre-built templates
- Success/error feedback
- Integration with Users Management page

### Mobile App Integration

Users receive notifications in `mobile/src/screens/SystemNotificationsScreen.js`:

- Real-time notification updates
- Badge count updates
- Push notification integration
- In-app notification list

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check `VITE_API_URL` is set correctly
   - Verify backend is running
   - Check CORS configuration
   - Verify network connectivity

2. **Authentication Errors**
   - Clear localStorage: `localStorage.clear()`
   - Login again with admin credentials
   - Check token expiration

3. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear cache: `npm run build -- --force`
   - Check Node.js version compatibility

4. **Notifications Not Appearing in Mobile App**
   - Verify backend endpoints are working
   - Check mobile app is fetching from `/api/notifications`
   - Ensure user is logged in on mobile
   - Check push notification permissions

5. **CORS Errors**
   - Add your Vercel domain to backend CORS whitelist
   - Ensure backend `cors()` middleware is configured
   - Check Render logs for CORS errors

## File Structure

```
admin/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── AdminLayout.jsx
│   │   └── Sidebar.jsx
│   ├── config/          # Configuration files
│   │   └── api.js       # API configuration
│   ├── pages/           # Page components
│   │   ├── Dashboard.jsx
│   │   ├── UsersManagement.jsx
│   │   ├── VideosManagement.jsx
│   │   ├── NotificationsManagement.jsx  # NEW
│   │   └── ...
│   ├── styles/          # CSS files
│   │   └── ...
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```

## Scripts

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)

# Production
npm run build        # Build for production (creates dist/ folder)
npm run preview      # Preview production build locally

# Linting
npm run lint         # Run ESLint
```

## Performance Optimization

1. **Code Splitting**: React.lazy() for route-based splitting
2. **Image Optimization**: Use WebP format, lazy loading
3. **Caching**: Leverage Vercel CDN caching
4. **Minification**: Automatic in production build
5. **Compression**: Enable gzip/brotli on Vercel

## Security Best Practices

1. **Environment Variables**: Never commit `.env` to git
2. **HTTPS Only**: Ensure all API calls use HTTPS in production
3. **Token Security**: Store admin tokens securely
4. **Input Validation**: Validate all user inputs
5. **CORS**: Restrict origins to trusted domains only
6. **Rate Limiting**: Implement on backend for admin routes

## Monitoring and Analytics

### Vercel Analytics

- Enable Vercel Analytics in project settings
- Monitor page load times
- Track user interactions

### Backend Monitoring

- Check Render logs regularly
- Monitor API response times
- Track error rates
- Set up alerts for failures

## Support and Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Render Documentation**: https://render.com/docs
- **Vite Documentation**: https://vitejs.dev
- **React Router**: https://reactrouter.com

## License

Proprietary - TikBook Admin Panel

---

**Last Updated**: January 2025
**Version**: 2.0.0 (with Notifications Management)
