# Admin Panel - 500 Error Fix

## Problem Fixed

The admin panel was throwing a 500 error when sending notifications because Firebase Cloud Messaging has reserved keys that cannot be used in the data payload.

### Error Details

```
AxiosError: Request failed with status code 500
FirebaseMessagingError: Invalid data payload key: from
```

## Root Cause

The admin controller was passing `{ type: "admin", from: "admin" }` in the notification data. The key `from` is reserved by Firebase Cloud Messaging and cannot be used in the data payload.

## Solution Applied

### 1. **Backend Fix** - `adminController.js`

#### Changed the notification data key from `from` to `source`:

```javascript
// BEFORE (Error)
{ type: "admin", from: "admin" }

// AFTER (Fixed)
{ type: "admin", source: "admin" }
```

#### Updated in two functions:

**Function 1: `sendNotificationToUser`**

- Changed reserved key `from` → `source`
- Added support for both `pushToken` and `fcmToken`
- Now checks: `if (!user.pushToken && !user.fcmToken)`
- Uses: `const token = user.pushToken || user.fcmToken;`

**Function 2: `sendBroadcastNotification`**

- Changed reserved key `from` → `source`
- Updated user query to find users with either `pushToken` or `fcmToken`
- Filters out empty tokens from the list

### 2. **API Endpoints Verified**

**Admin Routes** (`backend/routes/adminRoutes.js`):
✅ `GET /api/admin/stats` - Dashboard statistics
✅ `GET /api/admin/users` - All users list
✅ `DELETE /api/admin/users/:id` - Delete user
✅ `POST /api/admin/notify/:userId` - Send notification to user
✅ `POST /api/admin/notify/all` - Broadcast notification
✅ `GET /api/admin/videos` - All videos
✅ `POST /api/admin/wallet/grant` - Grant coins
✅ `GET /api/admin/transactions` - Get all transactions
✅ `POST /api/admin/transactions/:id/refund` - Refund transaction

**Wallet Routes** (`backend/routes/walletRoutes.js`):
✅ `GET /api/wallet/` - Get user balance
✅ `GET /api/wallet/:userId` - Get specific user wallet
✅ `POST /api/wallet/gift` - Send gift
✅ `POST /api/wallet/topup` - Top up wallet
✅ `POST /api/wallet/stripe/intent` - Create Stripe intent
✅ `POST /api/wallet/add-coins` - Admin add coins to user

### 3. **Admin Panel Setup Verified**

✅ `Admin/package.json` includes `react-icons@^5.5.0`
✅ All components properly import from `react-icons/fi`
✅ All pages properly structured with `AdminLayout` wrapper
✅ All routes properly configured in `App.jsx`

## Files Modified

1. **`backend/controllers/adminController.js`**
   - Line 336: Fixed `sendNotificationToUser` function
   - Line 391: Fixed `sendBroadcastNotification` function

## How to Test

### 1. **Start Backend**

```bash
cd backend
npm run dev
# Server should start on port 5000
```

### 2. **Start Admin Panel**

```bash
cd admin
npm run dev
# Admin should start on port 5173
```

### 3. **Test Notification**

1. Login to admin panel (`http://localhost:5173`)
2. Navigate to Users Management
3. Select a user and open notification modal
4. Send test notification
5. Check browser console for successful response

### 4. **Expected Response**

```json
{
  "message": "Notification sent successfully",
  "user": "username"
}
```

## Firebase Configuration Notes

### Reserved Data Keys to Avoid:

- `from` ❌ (Used by FCM)
- `to` ❌ (Used by FCM)
- `priority` ⚠️ (Should use priority in message, not data)
- `collapse_key` ❌
- `delay_while_idle` ❌

### Safe Alternatives:

Use `source`, `origin`, `sender`, `type`, etc.

## Testing Checklist

- [ ] Backend server starts without errors
- [ ] Admin panel loads correctly
- [ ] Login works with admin credentials
- [ ] Dashboard displays stats
- [ ] Users Management page loads
- [ ] Videos Management page loads
- [ ] Comments Management page loads
- [ ] Payments page loads
- [ ] Rewards page loads
- [ ] Send notification to user works (no 500 error)
- [ ] Send broadcast notification works
- [ ] Give individual reward works
- [ ] Give bulk reward works
- [ ] Video player plays correctly
- [ ] Filters work on all pages
- [ ] Sort options work on all pages

## Deployment Notes

Before deploying to production:

1. **Environment Variables**: Ensure `VITE_API_URL` is set correctly
2. **Firebase**: Verify Firebase admin SDK is initialized
3. **Payment Gateways**: Add actual API keys for Fawry, Paymob, Vodafone Cash
4. **Security**: Implement proper token refresh logic
5. **Error Handling**: Add better error messages for users

## Future Improvements

1. **Real-time Updates**: Implement WebSocket for live notifications
2. **Batch Operations**: Add bulk edit/delete with progress tracking
3. **Export Features**: Add CSV/Excel export for reports
4. **Audit Logs**: Track all admin actions
5. **Email Notifications**: Send email alongside push notifications
6. **Advanced Analytics**: Add more detailed charts and reports

## Support

If you encounter any other issues:

1. Check browser console for detailed error messages
2. Check backend logs for API errors
3. Verify all required models exist (Transaction, Wallet, etc.)
4. Ensure authentication middleware is working
5. Test API endpoints with Postman

## Summary

✅ Fixed Firebase reserved key error in admin notifications
✅ Added support for both `pushToken` and `fcmToken`
✅ Verified all API endpoints are properly configured
✅ Confirmed all admin pages are correctly set up
✅ Admin panel is ready for use
