# OAuth Setup Guide

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Create credentials for:

   - **Android**: Use package name `com.tikbook` and SHA-1 certificate
   - **iOS**: Use bundle identifier
   - **Expo**: Use Expo's redirect URI
   - **Web**: For development

6. Update `LoginScreen.js` with your credentials:

```javascript
const [googleRequest, googleResponse, googlePromptAsync] =
  Google.useAuthRequest({
    expoClientId: "YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com",
    iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
    webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  });
```

## Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Facebook Login" product
4. Configure OAuth Redirect URIs
5. Get your App ID

6. Update `LoginScreen.js`:

```javascript
const [facebookRequest, facebookResponse, facebookPromptAsync] =
  Facebook.useAuthRequest({
    clientId: "YOUR_FACEBOOK_APP_ID",
  });
```

## Backend Integration

You'll need to:

1. Send the OAuth token to your backend
2. Verify the token with Google/Facebook
3. Create or login the user
4. Return your app's JWT token

Example:

```javascript
if (googleResponse?.type === "success") {
  const { authentication } = googleResponse;
  const response = await axios.post(`${BASE_URL}/auth/oauth/google`, {
    token: authentication.accessToken,
  });
  // Handle response with your JWT token
}
```

## app.json Configuration

Add to your `app.json`:

```json
{
  "expo": {
    "scheme": "tikbook",
    "android": {
      "package": "com.tikbook"
    },
    "ios": {
      "bundleIdentifier": "com.tikbook"
    }
  }
}
```
