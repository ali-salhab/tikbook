# Building APK for TikBook Mobile App

This guide explains how to build an APK file for the TikBook mobile application.

## Prerequisites

Before building the APK, ensure you have:

1. ✅ **Node.js** installed (v18 or higher)
2. ✅ **Expo CLI** installed globally: `npm install -g expo-cli eas-cli`
3. ✅ **Java Development Kit (JDK)** 17 or higher
4. ✅ **Android Studio** (if building locally)
5. ✅ **Expo Account** (for EAS Build)

## Method 1: EAS Build (Cloud Build - Recommended)

This method builds your APK in the cloud without requiring local Android setup.

### Step 1: Install EAS CLI

```powershell
npm install -g eas-cli
```

### Step 2: Login to Expo

```powershell
eas login
```

Enter your Expo credentials or create a free account at https://expo.dev/signup

### Step 3: Navigate to Mobile Directory

```powershell
cd c:\Users\ali--\Desktop\tikbook\mobile
```

### Step 4: Configure EAS Build (First Time Only)

```powershell
eas build:configure
```

This will create an `eas.json` file (already created in this project).

### Step 5: Build APK

```powershell
eas build -p android --profile preview
```

Options:

- `-p android` - Build for Android platform
- `--profile preview` - Use preview profile (creates APK instead of AAB)

### Step 6: Wait for Build

The build process takes 10-20 minutes. EAS will:

1. Upload your code
2. Install dependencies
3. Build the APK
4. Provide a download link

### Step 7: Download and Install

1. Once complete, you'll receive a download link
2. Download the APK file
3. Transfer to your Android device
4. Enable "Install from Unknown Sources" in Android settings
5. Install the APK

## Method 2: Local Build

This method requires Android Studio and full Android SDK setup.

### Step 1: Install Dependencies

```powershell
cd c:\Users\ali--\Desktop\tikbook\mobile
npm install
```

### Step 2: Prebuild Android Project

```powershell
npx expo prebuild --platform android
```

This generates the native Android project in the `android` folder.

### Step 3: Build Debug APK (Quick)

```powershell
cd android
.\gradlew assembleDebug
```

The APK will be at: `android\app\build\outputs\apk\debug\app-debug.apk`

### Step 4: Build Release APK (Production)

```powershell
cd android
.\gradlew assembleRelease
```

The APK will be at: `android\app\build\outputs\apk\release\app-release.apk`

## Method 3: Using Android Studio

### Step 1: Open Project in Android Studio

1. Open Android Studio
2. Click "Open an Existing Project"
3. Navigate to `c:\Users\ali--\Desktop\tikbook\mobile\android`
4. Wait for Gradle sync to complete

### Step 2: Build APK

1. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. Click "locate" in the notification to find the APK

## Troubleshooting

### Error: "Expo account required"

**Solution**: Login with `eas login` or create a free account at expo.dev

### Error: "Android SDK not found"

**Solution**:

- Install Android Studio
- Set ANDROID_HOME environment variable
- Add platform-tools to PATH

### Error: "Java JDK not found"

**Solution**:

- Install JDK 17 from https://adoptium.net/
- Set JAVA_HOME environment variable

### Build takes too long

**Solution**:

- Use EAS Build (cloud) instead of local build
- Clear build cache: `cd android && .\gradlew clean`

### APK won't install on device

**Solution**:

- Enable "Install from Unknown Sources"
- Check minimum Android version (API 21+)
- Uninstall previous version first

## Configuration Files

### eas.json

Controls EAS Build profiles:

- **development**: Debug build with dev client
- **preview**: Creates APK for testing
- **production**: Creates AAB for Google Play

### app.json

Expo configuration:

- App name, version, icon
- Package name: `com.tikbook.app`
- Permissions and plugins

### build.gradle

Android build configuration:

- Minimum SDK: 24 (Android 7.0)
- Target SDK: Latest
- Version code and name

## Build Profiles Explained

### Preview Profile (APK)

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

Creates standalone APK file for:

- Direct installation on devices
- Sharing with testers
- Testing without Google Play

### Production Profile (AAB)

```json
"production": {
  "android": {
    "buildType": "app-bundle"
  }
}
```

Creates App Bundle for:

- Google Play Store upload
- Optimized size
- Play Store submission

## Testing the APK

### Before Installation

1. ✅ Backend server is running on port 5000
2. ✅ MongoDB has seed data
3. ✅ API URL is configured correctly in `src/config/api.js`

### After Installation

1. Open the app
2. Click "Continue as Guest" or login with test credentials:
   - Email: ahmed@tikbook.com
   - Password: 123456
3. Test video scrolling, likes, comments
4. Test profile viewing and following

## Next Steps After APK Build

### For Testing

1. Share APK with testers
2. Collect feedback
3. Fix bugs and rebuild

### For Production

1. Build production AAB: `eas build -p android --profile production`
2. Create Google Play Console account
3. Upload AAB to Play Store
4. Complete store listing
5. Submit for review

## Signing the APK (Production)

For production releases, you need to sign the APK:

### Generate Keystore

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore tikbook.keystore -alias tikbook -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing in build.gradle

```gradle
signingConfigs {
    release {
        storeFile file('tikbook.keystore')
        storePassword 'your-password'
        keyAlias 'tikbook'
        keyPassword 'your-password'
    }
}
```

### Build Signed APK

```powershell
cd android
.\gradlew assembleRelease
```

**⚠️ Important**: Keep your keystore file safe! You'll need it for all future updates.

## Useful Commands

```powershell
# Check Expo CLI version
expo --version

# Check EAS CLI version
eas --version

# View build status
eas build:list

# View build logs
eas build:view [build-id]

# Cancel build
eas build:cancel

# Clear Expo cache
npx expo start --clear

# Clean Android build
cd android
.\gradlew clean

# View Android log
adb logcat | Select-String -Pattern "ReactNative"
```

## Cost and Limits

### EAS Build Free Tier

- ✅ Unlimited builds for open source projects
- ✅ 30 builds per month for free accounts
- ✅ Priority builds with paid plans

### Local Build

- ✅ Completely free
- ✅ Requires local setup
- ✅ Takes longer initially

## Support

For build issues:

1. Check Expo documentation: https://docs.expo.dev/
2. Search Expo forums: https://forums.expo.dev/
3. Check GitHub issues

---

**Note**: The first build always takes longer as dependencies are downloaded and cached. Subsequent builds are much faster!

Good luck with your build! 🚀
