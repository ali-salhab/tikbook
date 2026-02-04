const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a file to Cloudinary
 * @param {string} filePath - Local path to the file
 * @param {string} folder - Folder name in Cloudinary
 * @param {string} resourceType - 'video', 'image', or 'auto'
 * @returns {Promise<string>} - The secure URL of the uploaded file
 */
const uploadToCloudinary = async (filePath, folder, resourceType = "auto") => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
        });

        console.log(`✅ Uploaded to Cloudinary: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error("❌ Cloudinary Upload Error:", error);
        throw error;
    }
};

module.exports = {
    uploadToCloudinary,
};
