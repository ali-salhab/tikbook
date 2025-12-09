const https = require("https");
const fs = require("fs");
const path = require("path");

// Sample video URLs (small, free to use videos)
const videoUrls = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
];

const uploadsDir = path.join(__dirname, "uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function downloadVideo(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(uploadsDir, filename);
    const file = fs.createWriteStream(filePath);

    console.log(`Downloading ${filename}...`);

    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          https
            .get(response.headers.location, (redirectResponse) => {
              redirectResponse.pipe(file);
              file.on("finish", () => {
                file.close();
                console.log(`✅ Downloaded ${filename}`);
                resolve();
              });
            })
            .on("error", reject);
        } else {
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            console.log(`✅ Downloaded ${filename}`);
            resolve();
          });
        }
      })
      .on("error", (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
  });
}

async function downloadAllVideos() {
  console.log("📹 Starting video download...\n");

  for (let i = 0; i < videoUrls.length; i++) {
    const filename = `video-${i + 1}.mp4`;
    try {
      await downloadVideo(videoUrls[i], filename);
    } catch (error) {
      console.error(`❌ Failed to download ${filename}:`, error.message);
    }
  }

  console.log("\n✅ All downloads completed!");
  console.log(`Videos saved in: ${uploadsDir}`);
}

downloadAllVideos();
