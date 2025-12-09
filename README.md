# TikBook - Social Video Sharing App

A TikTok-like social media application built with React Native (Expo) for mobile and Node.js/Express for the backend.

## 📱 Features

- **User Authentication**: Register/Login with email and OTP verification
- **Video Feed**: Scroll through videos with TikTok-like interface
- **Interactions**: Like, comment, and share videos
- **User Profiles**: Follow/unfollow users, view profiles and videos
- **Real-time Chat**: Direct messaging with Socket.io
- **Push Notifications**: Get notified about likes, comments, and follows
- **Admin Panel**: Manage users and content
- **RTL Support**: Full Arabic language support

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Android Studio (for Android development)
- Expo CLI

### Backend Setup

1. **Navigate to backend directory**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   - Edit `.env` file with your settings:

   ```env
   MONGO_URI=mongodb://localhost:27017/tikbook
   JWT_SECRET=tikbook_super_secret_key_2024
   PORT=5000
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

4. **Start MongoDB**

   - Make sure MongoDB is running on your system

5. **Seed the database with dummy data**

   ```bash
   npm run seed
   ```

6. **Create an admin user (optional)**

   ```bash
   npm run create-admin
   ```

7. **Start the backend server**

   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

### Mobile App Setup

1. **Navigate to mobile directory**

   ```bash
   cd mobile
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure API URL**

   - Open `src/config/api.js`
   - Update the `PHYSICAL_DEVICE` IP address if testing on a physical device
   - Find your IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

4. **Start Expo**

   ```bash
   npm start
   ```

5. **Run on device**
   - For Android Emulator: Press `a` in the terminal
   - For iOS Simulator: Press `i` in the terminal
   - For Physical Device: Scan QR code with Expo Go app

## 📦 Building APK

### Method 1: Using EAS Build (Recommended)

1. **Install EAS CLI**

   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**

   ```bash
   eas login
   ```

3. **Configure the project**

   ```bash
   eas build:configure
   ```

4. **Build APK**

   ```bash
   npm run build:apk
   ```

   Or directly:

   ```bash
   eas build -p android --profile preview
   ```

5. **Download APK**
   - Once the build completes, EAS will provide a download link
   - Download and install the APK on your Android device

### Method 2: Local Build

1. **Prebuild**

   ```bash
   npx expo prebuild
   ```

2. **Build APK**

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Find APK**
   - Located at: `android/app/build/outputs/apk/release/app-release.apk`

## 🧪 Testing

### Test Credentials

After running the seed script, you can login with:

- **Email**: ahmed@tikbook.com | **Password**: 123456
- **Email**: sara@tikbook.com | **Password**: 123456
- **Email**: mohamed@tikbook.com | **Password**: 123456

Or use the "Continue as Guest" button to test without logging in.

## 🔧 Troubleshooting

### Backend Issues

1. **MongoDB Connection Error**

   - Ensure MongoDB is running
   - Check MONGO_URI in .env file

2. **Port Already in Use**
   - Change PORT in .env file
   - Or stop the process using port 5000

### Mobile App Issues

1. **Cannot connect to backend**

   - For Android Emulator: Use `http://10.0.2.2:5000/api`
   - For physical device: Use your computer's IP address
   - Make sure backend is running
   - Check firewall settings

2. **Videos not loading**

   - The app includes dummy video files in `assets/videos/`
   - Real videos require backend upload functionality
   - Guest mode uses local video files

3. **Build errors**
   - Clear cache: `npx expo start -c`
   - Clean Android build: `cd android && ./gradlew clean`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

## 📁 Project Structure

```
tikbook/
├── backend/
│   ├── config/          # Database and Firebase config
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Authentication middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Email and notification services
│   ├── uploads/         # Uploaded videos and images
│   ├── server.js        # Express server
│   ├── seedData.js      # Database seeding script
│   └── createAdmin.js   # Admin user creation
│
├── mobile/
│   ├── android/         # Android native code
│   ├── assets/          # Images, videos, and fonts
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── config/      # App configuration
│   │   ├── context/     # React Context (Auth)
│   │   ├── i18n/        # Internationalization
│   │   ├── navigation/  # Navigation setup
│   │   ├── screens/     # App screens
│   │   └── services/    # API services
│   ├── App.js           # App entry point
│   └── app.json         # Expo configuration
│
└── admin/               # Admin panel (Web)
    └── src/             # Admin dashboard code
```

## 🔑 Key Technologies

### Backend

- **Express.js**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM for MongoDB
- **Socket.io**: Real-time messaging
- **JWT**: Authentication
- **Multer**: File uploads
- **Nodemailer**: Email service
- **Firebase Admin**: Push notifications

### Mobile

- **React Native**: Mobile framework
- **Expo**: Development platform
- **React Navigation**: Navigation
- **Axios**: HTTP client
- **Expo AV**: Video player
- **AsyncStorage**: Local storage
- **Socket.io Client**: Real-time messaging

## 📝 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Videos

- `GET /api/videos` - Get all videos
- `GET /api/videos/user/:id` - Get user videos
- `POST /api/videos` - Upload video
- `PUT /api/videos/:id/like` - Like/unlike video
- `POST /api/videos/:id/comment` - Comment on video

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/:id/follow` - Follow user
- `PUT /api/users/:id/unfollow` - Unfollow user

### Messages

- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages` - Send message

### Notifications

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

## 🔐 Security Notes

- Change JWT_SECRET in production
- Use proper email credentials
- Set up Firebase for push notifications
- Configure proper CORS settings
- Use HTTPS in production

## 📄 License

This project is for educational purposes.

## 👥 Contributors

- Your Team Name

## 📞 Support

For issues and questions, please open an issue in the repository.

---

Made with ❤️ for learning and development
