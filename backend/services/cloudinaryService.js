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

/**
 * Uploads an image to Cloudinary with optimization
 * @param {string} filePath - Local path to the image
 * @param {string} folder - Folder name in Cloudinary
 * @param {object} options - Optimization options (width, height, quality)
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
const uploadImageToCloudinary = async (filePath, folder, options = {}) => {
    try {
        const uploadOptions = {
            folder: folder,
            resource_type: "image",
            use_filename: true,
            unique_filename: true,
            transformation: [
                {
                    width: options.width || 500,
                    height: options.height || 500,
                    crop: "fill",
                    gravity: "face",
                    quality: options.quality || "auto:good",
                    fetch_format: "auto",
                },
            ],
        };

        const result = await cloudinary.uploader.upload(filePath, uploadOptions);
        console.log(`✅ Uploaded optimized image to Cloudinary: ${result.secure_url}`);
        return result.secure_url;
    } catch (error) {
        console.error("❌ Cloudinary Image Upload Error:", error);
        throw error;
    }
};

/**
 * Deletes a file from Cloudinary
 * @param {string} publicId - Public ID of the file to delete
 * @param {string} resourceType - 'video', 'image', or 'raw'
 * @returns {Promise<object>} - Deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        console.log(`✅ Deleted from Cloudinary: ${publicId}`);
        return result;
    } catch (error) {
        console.error("❌ Cloudinary Delete Error:", error);
        throw error;
    }
};

/**
 * Extracts public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
const getPublicIdFromUrl = (url) => {
    try {
        // Extract public ID from URL
        // Example: https://res.cloudinary.com/cloud/video/upload/v123/folder/file.mp4
        const parts = url.split("/");
        const uploadIndex = parts.indexOf("upload");
        if (uploadIndex === -1) return null;

        // Get everything after "upload/v{version}/"
        const pathParts = parts.slice(uploadIndex + 2);
        const fullPath = pathParts.join("/");

        // Remove file extension
        return fullPath.replace(/\.[^/.]+$/, "");
    } catch (error) {
        console.error("Error extracting public ID:", error);
        return null;
    }
};

module.exports = {
    uploadToCloudinary,
    uploadImageToCloudinary,
    deleteFromCloudinary,
    getPublicIdFromUrl,
};
