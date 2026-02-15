const mongoose = require("mongoose");

const verificationRequestSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Verification details
    fullName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "celebrity",
        "influencer",
        "brand",
        "organization",
        "government",
        "other",
      ],
      required: true,
    },
    followersCount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // Social media links for verification
    instagramUrl: {
      type: String,
    },
    twitterUrl: {
      type: String,
    },
    facebookUrl: {
      type: String,
    },
    websiteUrl: {
      type: String,
    },
    // Verification documents (Both required)
    idDocumentFront: {
      type: String, // URL to front of ID/passport
      required: true,
    },
    idDocumentBack: {
      type: String, // URL to back of ID/passport
      required: true,
    },
    // Request status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Admin response
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    adminNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const VerificationRequest = mongoose.model(
  "VerificationRequest",
  verificationRequestSchema,
);

module.exports = VerificationRequest;
