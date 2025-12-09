const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// and place it in backend/config/firebase-service-account.json
try {
  // Support service account provided via ENV (as JSON string) or local JSON file
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  let serviceAccount;
  if (serviceAccountJson) {
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (err) {
      console.error("Invalid JSON in FIREBASE_SERVICE_ACCOUNT env var", err);
    }
  }

  if (!serviceAccount) {
    try {
      // Attempt to require local file if present
      serviceAccount = require("../config/firebase-service-account.json");
    } catch (err) {
      // No file found - initialize skipped intentionally
      serviceAccount = null;
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        `${serviceAccount.project_id}.appspot.com`,
    });
    console.log("Firebase Admin initialized successfully");
  } else {
    console.log(
      "Firebase Admin not initialized - no service account configured"
    );
  }
} catch (error) {
  console.log("Firebase Admin initialization error", error);
}

const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!admin.apps.length) {
      console.log("Firebase not initialized, skipping notification");
      return null;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data,
      token,
    };

    const response = await admin.messaging().send(message);
    console.log("Successfully sent notification:", response);
    return response;
  } catch (error) {
    console.error("Error sending notification:", error);
    return null;
  }
};

const sendMulticastNotification = async (tokens, title, body, data = {}) => {
  try {
    if (!admin.apps.length) {
      console.log("Firebase not initialized, skipping notification");
      return null;
    }

    if (!tokens || tokens.length === 0) {
      return null;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data,
      tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(
      `Successfully sent ${response.successCount} notifications. Failed: ${response.failureCount}`
    );
    return response;
  } catch (error) {
    console.error("Error sending multicast notification:", error);
    return null;
  }
};

const uploadFileToStorage = async (filePath, destination) => {
  try {
    if (!admin.apps.length) {
      console.log("Firebase not initialized, skipping upload");
      return null;
    }

    const bucket = admin.storage().bucket();
    const [file] = await bucket.upload(filePath, {
      destination,
      public: true,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    // Get public URL
    // Note: This assumes the bucket is readable or the file is made public
    // For Firebase Storage, we can often use the media download token or signed URL
    // But making it public is easiest for this use case if rules allow

    // Alternative: Signed URL
    // const [url] = await file.getSignedUrl({
    //     action: 'read',
    //     expires: '03-01-2500',
    // });

    // Construct public URL for Firebase Storage
    const bucketName = bucket.name;
    const encodedDest = encodeURIComponent(destination).replace(/%2F/g, "/"); // Keep slashes? No, usually encoded
    // Actually, for standard firebase storage access:
    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media

    // Let's use the publicUrl() method if available or construct it
    return file.publicUrl();
  } catch (error) {
    console.error("Error uploading file to Firebase:", error);
    throw error;
  }
};

const sendMultipleNotifications = async (tokens, title, body, data = {}) => {
  try {
    if (!admin.apps.length || !tokens || tokens.length === 0) {
      return null;
    }

    const message = {
      notification: {
        title,
        body,
      },
      data,
      tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications`);
    return response;
  } catch (error) {
    console.error("Error sending notifications:", error);
    return null;
  }
};

module.exports = {
  sendPushNotification,
  sendMultipleNotifications,
  uploadFileToStorage,
};
