const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.AWS_ENDPOINT, // Custom endpoint for CloudGate/R2/MinIO
    forcePathStyle: true, // Needed for some S3 compatible providers
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/**
 * Uploads a file to AWS S3
 * @param {string} filePath - Local path to the file
 * @param {string} destination - S3 Key (path/filename)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
const uploadFileToS3 = async (filePath, destination, contentType) => {
    try {
        const fileStream = fs.createReadStream(filePath);

        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: destination, // e.g., 'videos/user123/video.mp4'
            Body: fileStream,
            ContentType: contentType,
            // ACL: 'public-read', // Uncomment if bucket is not public by default (BUT better to use Bucket Policy)
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        // Construct URL
        let fileUrl;

        if (process.env.AWS_CLOUDFRONT_DOMAIN) {
            // Option A: Custom Domain / CDN (Best for Prod)
            fileUrl = `${process.env.AWS_CLOUDFRONT_DOMAIN}/${destination}`;
        } else if (process.env.AWS_ENDPOINT) {
            // Option B: Custom Endpoint (CloudGate, R2, MinIO)
            // Remove schema from endpoint if present to avoid double https://
            const endpoint = process.env.AWS_ENDPOINT.replace(/^https?:\/\//, '');
            fileUrl = `https://${process.env.AWS_BUCKET_NAME}.${endpoint}/${destination}`;
            // Note: structure varies by provider. Some use endpoint/bucket.
            // If forcePathStyle is true:
            // fileUrl = `${process.env.AWS_ENDPOINT}/${process.env.AWS_BUCKET_NAME}/${destination}`;
        } else {
            // Option C: Standard AWS S3
            fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${destination}`;
        }

        console.log(`✅ File uploaded to S3: ${fileUrl}`);
        return fileUrl;
    } catch (error) {
        console.error("❌ Error uploading to S3:", error);
        throw error;
    }
};

module.exports = {
    uploadFileToS3,
};
