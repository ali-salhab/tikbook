// backend/server.js - CORS Configuration for Production
// Replace the existing cors configuration with this:

// Allowed origins for CORS
const allowedOrigins = [
"http://localhost:5173", // Local Vite dev server
"http://localhost:4173", // Local Vite preview
"http://localhost:3000", // Local admin dev
"https://tikbook-admin.onrender.com", // Production admin panel
// Add your custom domain if you have one:
// "https://admin.yourdomain.com",
];

app.use(
cors({
origin: (origin, callback) => {
// Allow requests with no origin (mobile apps, Postman, etc.)
if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],

})
);

// IMPORTANT: After updating, redeploy your backend on Render!
