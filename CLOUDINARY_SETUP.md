# Cloudinary & MongoDB Cloud Setup Guide

This guide explains how to configure your TikBook backend to use **Cloudinary** for multimedia storage and **MongoDB Cloud** for database storage.

## Prerequisites

1. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com)
2. **MongoDB Atlas Account**: Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

## Cloudinary Configuration

### Step 1: Get Cloudinary Credentials

1. Log in to your [Cloudinary Dashboard](https://cloudinary.com/console)
2. Copy the following values:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### Step 2: Set Environment Variables on Render

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Navigate to **Environment** tab
4. Add the following environment variables:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## MongoDB Cloud Configuration

### Step 1: Create MongoDB Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free tier available)
3. Create a database user with username and password
4. Whitelist all IP addresses (0.0.0.0/0) for Render access

### Step 2: Get Connection String

1. Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string (should look like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/tikbook?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual database user password
5. Replace `tikbook` with your database name

### Step 3: Set Environment Variable on Render

1. Go to your Render Dashboard → Backend Service → Environment tab
2. Add or update:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/tikbook?retryWrites=true&w=majority
```

## Verification

### Check Cloudinary Integration

1. Upload a video via the mobile app
2. Check Render logs for: `✅ Uploaded to Cloudinary`
3. Verify the video URL starts with `https://res.cloudinary.com/`
4. Check your [Cloudinary Media Library](https://cloudinary.com/console/media_library) to see uploaded files

### Check MongoDB Cloud Connection

1. Check Render logs for: `MongoDB Connected`
2. Verify the connection string contains `mongodb+srv://` (not `mongodb://localhost`)
3. Create a test user and check MongoDB Atlas Collections to see the data

## File Storage Structure

### Cloudinary Folders

- `videos/` - User-uploaded videos
- `sounds/` - Audio files for videos
- `profile_images/` - User profile pictures (optimized to 500x500)

### What Gets Stored Where

✅ **Cloudinary** (Multimedia):
- Videos (`.mp4`, `.mov`, `.avi`, `.mkv`, `.3gp`)
- Profile images (`.jpg`, `.png`, `.gif`, `.webp`)
- Audio files (`.mp3`, `.wav`, etc.)

✅ **MongoDB Cloud** (Data):
- User accounts and profiles
- Video metadata (title, description, likes, comments)
- Notifications
- Messages
- Wallet transactions

❌ **NOT Stored on Render** (Temporary only):
- Files are temporarily stored in `uploads/` during processing
- Automatically deleted after uploading to Cloudinary

## API Endpoints

### Profile Image Upload

**Endpoint**: `PUT /api/users/profile/image`  
**Method**: Multipart form-data  
**Headers**: `Authorization: Bearer <token>`  
**Body**: `image` (file field)

**Example using cURL**:
```bash
curl -X PUT https://tikbook-1cdb.onrender.com/api/users/profile/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

### Video Upload

**Endpoint**: `POST /api/videos`  
**Method**: Multipart form-data  
**Headers**: `Authorization: Bearer <token>`  
**Body**: 
- `video` (file field)
- `sound` (file field, optional)
- `description` (text)

## Troubleshooting

### Videos not uploading to Cloudinary

- Check Render logs for Cloudinary errors
- Verify environment variables are set correctly
- Ensure Cloudinary credentials are valid

### MongoDB connection failed

- Verify connection string format
- Check database user credentials
- Ensure IP whitelist includes `0.0.0.0/0`
- Check MongoDB Atlas cluster is running

### Files still stored locally

- This is normal during upload processing
- Files should be deleted after Cloudinary upload
- Check logs for cleanup errors
