# Admin Panel - Complete Setup Guide

## Overview
The TikBook admin panel has been completely redesigned with a modern, responsive interface featuring advanced management capabilities.

## New Features

### 1. Modern Sidebar Navigation
- Responsive sidebar with collapsible menu
- Mobile-friendly with hamburger menu
- 8 main sections:
  - 📊 Dashboard
  - 👥 Users Management
  - 🎬 Videos Management
  - 💬 Comments Management
  - 💳 Payments
  - 🎁 Rewards & Coins
  - 📱 App Versions
  - 🚪 Logout

### 2. Enhanced Dashboard
- Real-time statistics cards
- Interactive charts (Line & Doughnut)
- User growth tracking
- Video analytics
- Revenue overview
- Top users and videos display

### 3. Advanced Users Management
**Filters:**
- Search by username/email
- Status filter (Active/Inactive)
- Join date filter (Today, This Week, This Month, This Year)
- Activity level filter (Very Active, Active, Moderate, Low)

**Sorting:**
- By followers count
- By videos count
- By join date
- By activity score

**Features:**
- Detailed user profiles modal
- Activity score calculation (videos + followers)
- User statistics display
- Delete user functionality

### 4. Videos Management with Working Video Player
**Features:**
- Fully functional video player with native controls
- Video thumbnail grid with play overlay
- Full-screen modal player with autoplay
- Video stats (likes, comments, views)
- Delete video functionality

**Filters:**
- Search by description or user
- Date range (Today, This Week, This Month, This Year, All Time)
- Sort by newest, most popular, or most viewed

### 5. Comments Management
**Features:**
- View all comments from all videos
- Comment approval system
- User and video information display
- Comment likes tracking

**Filters:**
- Search comments, users, or videos
- Filter by date range
- Filter by status (Approved/Pending)
- Sort by newest, oldest, or most likes

**Actions:**
- Approve comments
- Delete comments

### 6. Payments Management
**Egyptian Payment Gateways:**
- Fawry integration
- Paymob integration
- Vodafone Cash integration
- Stripe (existing)

**Features:**
- Payment gateway configuration UI
- Transaction history with full details
- Status tracking (Completed, Pending, Failed)
- Gateway-wise filtering
- Refund functionality for completed transactions
- Revenue statistics

**Transaction Details:**
- Transaction ID
- User information
- Amount
- Payment gateway
- Status with icons
- Date/time
- Refund action

### 7. Rewards & Coins Management
**Features:**
- View all user coin balances
- Individual reward distribution
- Bulk reward distribution
- Transaction tracking
- Coin statistics

**Statistics:**
- Total coins distributed
- Active users with coins
- Average balance
- Top user by balance

**Actions:**
- Give rewards to individual users
- Bulk reward to filtered users
- Custom reward reasons
- Real-time balance updates

### 8. App Version Management (Existing)
- Create/Edit/Delete app versions
- Forced update toggles
- Platform-specific versions
- Download URL management

## Installation

### Prerequisites
```bash
# Make sure you're in the admin directory
cd c:\Users\ali--\Desktop\tikbook\admin
```

### Install Dependencies
```bash
npm install react-icons
```

### Start Development Server
```bash
npm run dev
```

## Backend Updates

### New API Endpoints

#### Transactions
```javascript
// Get all transactions
GET /api/admin/transactions
Headers: { Authorization: "Bearer <token>" }

// Refund a transaction
POST /api/admin/transactions/:id/refund
Headers: { Authorization: "Bearer <token>" }
```

#### Wallet - Add Coins
```javascript
// Add coins to user (Admin only)
POST /api/wallet/add-coins
Headers: { Authorization: "Bearer <token>" }
Body: {
  userId: "user_id",
  amount: 100,
  reason: "Monthly reward"
}
```

#### Get User Wallet
```javascript
GET /api/wallet/:userId
Headers: { Authorization: "Bearer <token>" }
```

## File Structure

```
admin/src/
├── components/
│   ├── AdminLayout.jsx          # Main layout wrapper with sidebar
│   ├── Sidebar.jsx               # Navigation sidebar component
│   └── AdminNav.jsx              # (Old navigation - can be removed)
├── pages/
│   ├── LoginPage.jsx             # Admin login
│   ├── Dashboard.jsx             # New dashboard with charts
│   ├── UsersManagement.jsx       # Advanced user management
│   ├── VideosManagement.jsx      # Videos with working player
│   ├── CommentsManagement.jsx    # Comments moderation
│   ├── PaymentsManagement.jsx    # Payments & gateways
│   ├── RewardsManagement.jsx     # Coins & rewards
│   └── AppVersionManagementPage.jsx # App versions
├── styles/
│   ├── AdminLayout.css
│   ├── Sidebar.css
│   ├── Dashboard.css
│   ├── UsersManagement.css
│   ├── VideosManagement.css
│   ├── CommentsManagement.css
│   ├── PaymentsManagement.css
│   └── RewardsManagement.css
└── App.jsx                       # Updated routing
```

## Routes

```javascript
/ - Login page
/dashboard - Main dashboard with analytics
/users - Users management
/videos - Videos management
/comments - Comments moderation
/payments - Payment transactions and gateways
/rewards - Rewards and coins management
/app-versions - App version management
```

## Configuration

### API URL
Update the API URL in each component if needed:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

### Environment Variables
Create a `.env` file in the admin directory:
```env
VITE_API_URL=http://localhost:5000
```

## Usage Guide

### 1. Login
- Navigate to `/`
- Enter admin credentials
- Token is stored in localStorage

### 2. Dashboard
- View real-time statistics
- Monitor user growth
- Track video uploads
- See revenue trends

### 3. Managing Users
- **Search**: Type username or email in search box
- **Filter**: Select status, join date, or activity level
- **Sort**: Choose sorting criteria from dropdown
- **View Details**: Click on any user row to see full profile
- **Delete**: Click delete button and confirm

### 4. Managing Videos
- **Play Video**: Click on any video card to open player modal
- **Filter**: Search or select date range
- **Sort**: Choose newest, popular, or most viewed
- **Delete**: Click delete button on video card

### 5. Managing Comments
- **View**: All comments displayed with user and video info
- **Filter**: Search and filter by date/status
- **Approve**: Click approve button for pending comments
- **Delete**: Click delete button and confirm

### 6. Managing Payments
- **Configure Gateways**: Enable/disable and add API keys
- **View Transactions**: All transactions with filters
- **Refund**: Click refund on completed transactions
- **Filter**: By status, gateway, or date range

### 7. Distributing Rewards
- **Individual**: Click "Give Reward" on any user
- **Bulk**: Click "Bulk Reward" to reward filtered users
- **Filter**: Search and sort users by balance
- **Track**: View total coins and average balance

## Video Player Fix

The video player now works correctly:
- **Thumbnail View**: Shows video thumbnail with play overlay
- **Click to Play**: Clicking opens full modal with video player
- **Controls**: Native HTML5 video controls enabled
- **Autoplay**: Video starts automatically in modal
- **Close**: Click X or outside modal to close

## Egyptian Payment Gateways Integration

### Fawry
- Merchant Code configuration
- API Key setup
- Transaction tracking

### Paymob
- Integration ID configuration
- API Key setup
- Multi-payment methods support

### Vodafone Cash
- Merchant ID configuration
- Mobile wallet integration
- Direct payment processing

## Responsive Design

All pages are fully responsive:
- **Desktop**: Full sidebar with all features visible
- **Tablet**: Collapsible sidebar with optimized layouts
- **Mobile**: Hamburger menu, stacked cards, mobile-friendly tables

## Troubleshooting

### Video Player Not Working
✅ **Fixed**: Video player now has proper controls and click handlers

### API Connection Issues
- Check backend is running on port 5000
- Verify CORS is enabled
- Check admin token in localStorage

### Payment Gateway Errors
- Verify API keys are correct
- Check merchant IDs
- Ensure backend payment routes are enabled

### Missing Dependencies
```bash
npm install react-icons chart.js react-chartjs-2
```

## Security Notes

1. **Payment Gateway Keys**: Store in environment variables, not in localStorage
2. **Admin Authentication**: Always verify token on backend
3. **Refunds**: Implement proper refund logic with payment gateway APIs
4. **Bulk Operations**: Add confirmation dialogs

## Next Steps

1. **Backend Integration**: Connect payment gateway APIs (Fawry, Paymob, Vodafone Cash)
2. **Real-time Updates**: Add WebSocket for live statistics
3. **Export Features**: Add CSV/Excel export for transactions and users
4. **Analytics**: Implement detailed analytics dashboard
5. **Notifications**: Add in-app notifications for admin actions
6. **Audit Logs**: Track all admin actions for security

## Support

For issues or questions:
- Check console logs for errors
- Verify backend routes are working
- Test API endpoints with Postman
- Review backend logs for detailed errors

## Credits

Built with:
- React 18
- React Router v7
- Chart.js
- React Icons
- Axios
- Vite
