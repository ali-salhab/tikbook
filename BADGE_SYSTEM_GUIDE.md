# Badge System Implementation Guide

## Overview
The badge system allows users to customize their profile appearance with decorative frames and live room backgrounds. Administrators can gift exclusive badges to users, and users can purchase badges using in-app diamonds.

## Features Implemented

### Backend (Node.js/Express/MongoDB)

#### 1. **Badge Model** (`backend/models/Badge.js`)
- Badge types: `frame` (profile frames) and `background` (live room backgrounds)
- Rarity levels: `common`, `rare`, `epic`, `legendary`
- Properties: animations, glow effects, particle effects
- Exclusive badges (admin gift only)
- Price in diamonds

#### 2. **User Model Updates** (`backend/models/User.js`)
- `ownedBadges`: Array of badges with acquisition date and gifted by info
- `activeBadge`: Currently active profile frame
- `ownedBackgrounds`: Array of background badges
- `activeBackground`: Currently active live room background

#### 3. **LiveRoom Model Updates** (`backend/models/LiveRoom.js`)
- `backgroundImage`: Custom background URL for the live room

#### 4. **Badge Controller** (`backend/controllers/badgeController.js`)
API endpoints:
- `GET /api/badges` - Get all available badges (with optional type filter)
- `GET /api/badges/my-badges` - Get user's owned badges and active selections
- `POST /api/badges/purchase/:badgeId` - Purchase a badge with diamonds
- `POST /api/badges/gift` - Admin: Gift badge to user
- `PUT /api/badges/set-active/:badgeId` - Set active profile frame
- `PUT /api/badges/set-active-background/:badgeId` - Set active background
- `POST /api/badges/create` - Admin: Create new badge
- `PUT /api/badges/:badgeId` - Admin: Update badge
- `DELETE /api/badges/:badgeId` - Admin: Delete badge

#### 5. **Badge Routes** (`backend/routes/badgeRoutes.js`)
All routes integrated into the main server

#### 6. **Seed Data** (`backend/seedBadges.js`)
Sample badges with different rarities and types for testing

### Mobile App (React Native)

#### 1. **Badge Service** (`mobile/src/services/badgeService.js`)
API client for all badge-related operations

#### 2. **ProfileBadgeFrame Component** (`mobile/src/components/ProfileBadgeFrame.js`)
Reusable component that displays profile image with badge frame overlay
- Accepts `profileImage`, `badgeImage`, and `size` props
- Centers profile image and overlays badge frame

#### 3. **Badge Shop Screen** (`mobile/src/screens/BadgeShopScreen.js`)
- Browse available badges (frames and backgrounds)
- Filter by type (tabs for frames vs backgrounds)
- Display rarity with color coding
- Purchase badges with diamonds
- Show owned badges differently
- Handle exclusive badges (admin gift only)

#### 4. **My Badges Screen** (`mobile/src/screens/MyBadgesScreen.js`)
- View all owned badges
- Preview current look with active badge
- Select/deselect badges
- See acquisition date and gift information
- Quick access to shop for more badges

#### 5. **Profile Screen Updates** (`mobile/src/screens/ProfileScreen.js`)
- Display active badge frame around profile image
- New badge button to access My Badges screen
- Integration with ProfileBadgeFrame component

#### 6. **User Profile Screen Updates** (`mobile/src/screens/UserProfileScreen.js`)
- Show other users' active badge frames
- View their profile with badge overlay

#### 7. **Live Room Screen Updates** (`mobile/src/screens/LiveRoomScreen.js`)
- Display host's active background as room background
- Show participant avatars with their badge frames
- Dark overlay for text readability over backgrounds

#### 8. **Navigation Updates** (`mobile/src/navigation/AppNavigator.js`)
- Added BadgeShop and MyBadges screens to navigation stack

## Usage Instructions

### For Users

#### Purchasing Badges:
1. Navigate to Profile tab
2. Tap the medal/badge icon button
3. Browse available badges in the shop
4. Select a badge and confirm purchase with diamonds
5. Badge will be added to "My Badges"

#### Equipping Badges:
1. Go to "My Badges" from profile or badge shop
2. Tap on an owned badge to equip it
3. View preview of your profile with the badge
4. Tap again to unequip

#### Using in Live Rooms:
- Profile frames appear around your avatar in live rooms
- Active background is displayed when you host a live room
- Other participants see your badge frame

### For Administrators

#### Gifting Badges:
```javascript
POST /api/badges/gift
Authorization: Bearer <admin_token>
Body: {
  "badgeId": "badge_id_here",
  "userId": "user_id_here"
}
```

#### Creating New Badges:
```javascript
POST /api/badges/create
Authorization: Bearer <admin_token>
Body: {
  "name": "Badge Name",
  "description": "Badge description",
  "imageUrl": "https://url-to-badge-image.png",
  "type": "frame", // or "background"
  "rarity": "legendary",
  "price": 5000,
  "isExclusive": true, // if admin gift only
  "properties": {
    "animation": "glow-pulse",
    "glowEffect": true,
    "particleEffect": "fire-sparks"
  }
}
```

#### Seeding Sample Badges:
```bash
cd backend
node seedBadges.js
```

## Database Schema

### Badge Document
```javascript
{
  name: String,
  description: String,
  imageUrl: String,
  type: "frame" | "background",
  rarity: "common" | "rare" | "epic" | "legendary",
  price: Number,
  isActive: Boolean,
  isExclusive: Boolean,
  properties: {
    animation: String,
    glowEffect: Boolean,
    particleEffect: String
  },
  sortOrder: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### User Badge Fields
```javascript
{
  ownedBadges: [{
    badge: ObjectId (ref: Badge),
    acquiredAt: Date,
    giftedBy: ObjectId (ref: User)
  }],
  activeBadge: ObjectId (ref: Badge),
  ownedBackgrounds: [{
    badge: ObjectId (ref: Badge),
    acquiredAt: Date
  }],
  activeBackground: ObjectId (ref: Badge)
}
```

## Image Requirements

### Profile Frame Badges:
- **Size**: 512x512px minimum
- **Format**: PNG with transparency
- **Design**: Central circular area transparent for profile image
- **Frame**: Decorative elements around the edges

### Background Images:
- **Size**: 1080x1920px (9:16 aspect ratio)
- **Format**: JPG or PNG
- **Design**: Dark or muted colors recommended for text readability

## Rarity Color Coding
- **Common**: #95A5A6 (Gray)
- **Rare**: #3498DB (Blue)
- **Epic**: #9B59B6 (Purple)
- **Legendary**: #FFD700 (Gold)

## Integration Points

1. **Wallet System**: Badge purchases deduct from user's diamond balance
2. **Transaction System**: Purchases create transaction records
3. **User Profiles**: Badges display on profile and other user views
4. **Live Rooms**: Backgrounds and frames show in live audio rooms
5. **Socket.io**: Real-time updates when users join/leave with badges

## Future Enhancements

- Badge animations (glow, pulse, particle effects)
- Limited edition time-based badges
- Achievement-based badge unlocks
- Badge gifting between users
- Badge trading marketplace
- Seasonal/event-specific badges
- Badge collections and sets with bonuses

## Testing

1. **Create admin user** using `backend/createAdmin.js`
2. **Seed sample badges** using `backend/seedBadges.js`
3. **Purchase badges** through mobile app badge shop
4. **Test admin gifting** via API calls
5. **Verify display** in profile, user profile, and live rooms
6. **Check transactions** in wallet history

## Notes

- Badge images should be hosted on a CDN (Cloudinary, S3, etc.)
- The example badges use placeholder URLs that should be replaced
- Exclusive badges can only be obtained through admin gifts
- Users can only have one active frame and one active background at a time
- Badge frames work with the ProfileBadgeFrame component for consistent display
