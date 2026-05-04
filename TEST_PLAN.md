# VIP Level Join Video Feature - Test Plan

## Overview
This test plan outlines the steps to verify the proper functioning of the VIP level join video feature, which allows admins to upload and preview join videos for VIP levels, and users to see these videos when joining live rooms.

## Prerequisites
- MongoDB server running
- Backend server running
- Admin panel running
- Mobile app running in development mode

## Test Cases

### 1. Admin Panel - Video Upload
1. Log in to the admin panel
2. Navigate to the VIP Management section
3. Click "Edit" on an existing VIP level or "Add" to create a new one
4. Go to the "Basic Data" tab
5. Scroll down to the "Join video inside join card (MP4 · optional)" section
6. Click on the upload area and select a short MP4 video file (5-10 seconds)
7. Verify that the video preview appears below the upload area
8. Save the VIP level
9. Verify that the video is saved correctly by reopening the edit form

**Expected Result:** The video should upload successfully, display in the preview area, and be saved with the VIP level.

### 2. Admin Panel - Video Preview
1. Log in to the admin panel
2. Navigate to the VIP Management section
3. Edit a VIP level that has a join video
4. Verify that the video preview loads correctly
5. Play the video to ensure it works properly
6. Make changes to other fields and save
7. Verify that the video is still associated with the VIP level

**Expected Result:** The video preview should work correctly, and the video should remain associated with the VIP level after saving changes.

### 3. Mobile App - Join Card Display
1. Run the mobile app in development mode
2. Log in with a user account
3. Join a live room where another user with the VIP level that has a join video is present
4. Observe the join animation when the VIP user enters the room

**Expected Result:** The join card should display with the enhanced design:
- Profile image slightly protruding from the card
- Improved card styling with better shadows and borders
- Video playing in the enhanced video display area
- Badges displayed correctly

### 4. Mobile App - Video Playback
1. Join a live room with a test account
2. Have another user with a VIP level that includes a join video join the room
3. Observe the join animation and video playback

**Expected Result:** The video should play automatically, be muted, and loop while the join animation is displayed.

### 5. Edge Cases
1. **Large Video Files:** Upload a large video file (>10MB) and verify that it's handled correctly
2. **Unsupported Formats:** Try uploading non-MP4 video files and verify appropriate error handling
3. **No Video:** Verify that join animations work correctly for VIP levels without videos
4. **Network Issues:** Test video loading behavior under poor network conditions

## Verification Checklist
- [ ] Admin can upload join videos for VIP levels
- [ ] Admin can preview join videos in the admin panel
- [ ] Join videos are displayed correctly in the mobile app
- [ ] Join card design is improved with profile image protruding from the card
- [ ] Video playback works correctly in the join animation
- [ ] Edge cases are handled appropriately

## Notes
- For optimal performance, join videos should be:
  - Short (5-10 seconds)
  - Low resolution (720p or lower)
  - Optimized for mobile playback
  - Small file size (<5MB)
- The join card design has been enhanced to make the profile image protrude slightly from the card, improve shadows and borders, and enhance the video display area.