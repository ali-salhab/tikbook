const VerificationRequest = require("../models/VerificationRequest");
const User = require("../models/User");
const Notification = require("../models/Notification");

// @desc    Submit verification request
// @route   POST /api/verification/request
// @access  Private
const submitVerificationRequest = async (req, res) => {
  try {
    const {
      fullName,
      category,
      followersCount,
      description,
      instagramUrl,
      twitterUrl,
      facebookUrl,
      websiteUrl,
      idDocument,
      proofDocument,
    } = req.body;

    // Check if user already has pending request
    const existingRequest = await VerificationRequest.findOne({
      user: req.user._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "You already have a pending verification request",
      });
    }

    // Check if user is already verified
    const user = await User.findById(req.user._id);
    if (user.isVerified) {
      return res.status(400).json({
        message: "Your account is already verified",
      });
    }

    const verificationRequest = await VerificationRequest.create({
      user: req.user._id,
      fullName,
      category,
      followersCount,
      description,
      instagramUrl,
      twitterUrl,
      facebookUrl,
      websiteUrl,
      idDocument,
      proofDocument,
    });

    res.status(201).json({
      message: "Verification request submitted successfully",
      request: verificationRequest,
    });
  } catch (error) {
    console.error("Error submitting verification request:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's verification requests
// @route   GET /api/verification/my-requests
// @access  Private
const getMyVerificationRequests = async (req, res) => {
  try {
    const requests = await VerificationRequest.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error fetching verification requests:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all verification requests (Admin)
// @route   GET /api/verification/admin/requests
// @access  Private/Admin
const getAllVerificationRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    const requests = await VerificationRequest.find(filter)
      .populate("user", "username email profileImage followers")
      .populate("reviewedBy", "username email")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error fetching verification requests:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve verification request
// @route   PUT /api/verification/admin/approve/:id
// @access  Private/Admin
const approveVerificationRequest = async (req, res) => {
  try {
    const { badgeType, adminNotes } = req.body;

    const verificationRequest = await VerificationRequest.findById(
      req.params.id,
    );

    if (!verificationRequest) {
      return res
        .status(404)
        .json({ message: "Verification request not found" });
    }

    if (verificationRequest.status !== "pending") {
      return res.status(400).json({
        message: "This request has already been reviewed",
      });
    }

    // Update verification request
    verificationRequest.status = "approved";
    verificationRequest.reviewedBy = req.user._id;
    verificationRequest.reviewedAt = new Date();
    verificationRequest.adminNotes = adminNotes;
    await verificationRequest.save();

    // Update user verification status
    const user = await User.findById(verificationRequest.user);
    user.isVerified = true;
    user.verificationBadge = badgeType || "blue";
    await user.save();

    // Send notification to user
    await Notification.create({
      user: verificationRequest.user,
      type: "verification_approved",
      message: "تم قبول طلب التوثيق الخاص بك! حسابك الآن موثق ✓",
      title: "طلب التوثيق مقبول",
      read: false,
    });

    res.json({
      message: "Verification request approved successfully",
      request: verificationRequest,
    });
  } catch (error) {
    console.error("Error approving verification request:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject verification request
// @route   PUT /api/verification/admin/reject/:id
// @access  Private/Admin
const rejectVerificationRequest = async (req, res) => {
  try {
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const verificationRequest = await VerificationRequest.findById(
      req.params.id,
    );

    if (!verificationRequest) {
      return res
        .status(404)
        .json({ message: "Verification request not found" });
    }

    if (verificationRequest.status !== "pending") {
      return res.status(400).json({
        message: "This request has already been reviewed",
      });
    }

    // Update verification request
    verificationRequest.status = "rejected";
    verificationRequest.reviewedBy = req.user._id;
    verificationRequest.reviewedAt = new Date();
    verificationRequest.rejectionReason = rejectionReason;
    verificationRequest.adminNotes = adminNotes;
    await verificationRequest.save();

    // Send notification to user
    await Notification.create({
      user: verificationRequest.user,
      type: "verification_rejected",
      message: `تم رفض طلب التوثيق الخاص بك. السبب: ${rejectionReason}`,
      title: "طلب التوثيق مرفوض",
      read: false,
    });

    res.json({
      message: "Verification request rejected",
      request: verificationRequest,
    });
  } catch (error) {
    console.error("Error rejecting verification request:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete verification request
// @route   DELETE /api/verification/admin/:id
// @access  Private/Admin
const deleteVerificationRequest = async (req, res) => {
  try {
    const verificationRequest = await VerificationRequest.findById(
      req.params.id,
    );

    if (!verificationRequest) {
      return res
        .status(404)
        .json({ message: "Verification request not found" });
    }

    await verificationRequest.deleteOne();

    res.json({ message: "Verification request deleted successfully" });
  } catch (error) {
    console.error("Error deleting verification request:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get verification statistics
// @route   GET /api/verification/admin/stats
// @access  Private/Admin
const getVerificationStats = async (req, res) => {
  try {
    const totalRequests = await VerificationRequest.countDocuments();
    const pendingRequests = await VerificationRequest.countDocuments({
      status: "pending",
    });
    const approvedRequests = await VerificationRequest.countDocuments({
      status: "approved",
    });
    const rejectedRequests = await VerificationRequest.countDocuments({
      status: "rejected",
    });
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    res.json({
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      verifiedUsers,
    });
  } catch (error) {
    console.error("Error fetching verification stats:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitVerificationRequest,
  getMyVerificationRequests,
  getAllVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
  deleteVerificationRequest,
  getVerificationStats,
};
