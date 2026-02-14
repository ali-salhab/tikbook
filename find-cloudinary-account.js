// Find Cloudinary Account Email
// Run this script to find which email is associated with your Cloudinary account

const https = require("https");

const cloudName = "dyivmguio";
const apiKey = "651128296299134";
const apiSecret = "CW8Oq8c4SC5sAEgZ2ttvm1w_xXQ";

// Create Basic Auth
const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

const options = {
  hostname: "api.cloudinary.com",
  path: `/v1_1/${cloudName}/account`,
  method: "GET",
  headers: {
    Authorization: `Basic ${auth}`,
  },
};

console.log("\n🔍 Searching for Cloudinary account details...\n");

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const account = JSON.parse(data);

      if (account.email) {
        console.log("✅ FOUND YOUR CLOUDINARY ACCOUNT!\n");
        console.log("📧 Email: " + account.email);
        console.log("🏢 Cloud Name: " + cloudName);
        console.log("👤 Account: " + (account.name || "N/A"));
        console.log("\n✅ This is the Gmail account you used!\n");
      } else {
        console.log("Account Info:");
        console.log(JSON.stringify(account, null, 2));
      }
    } catch (error) {
      console.log("Response:", data);
      console.log(
        "\n⚠️ Could not parse response. Your credentials might be incorrect.",
      );
    }
  });
});

req.on("error", (error) => {
  console.error("Error:", error.message);
});

req.end();
