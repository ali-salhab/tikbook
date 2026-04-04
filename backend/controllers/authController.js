const User = require("../models/User");
const OTP = require("../models/OTP");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { generateOTP, sendOTPEmail } = require("../services/emailService");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
    expiresIn: "30d",
  });
};

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
    }

    // Generate OTP
    const otp = generateOTP();

    // Save OTP to database
    await OTP.create({ email, otp });

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp);

    if (emailResult.ok) {
      res.json({ message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" });
    } else {
      if (emailResult.error) {
        console.error("SMTP failure details:", {
          message: emailResult.error.message,
          code: emailResult.error.code,
          command: emailResult.error.command,
          response: emailResult.error.response,
          responseCode: emailResult.error.responseCode,
        });
      }
      // Fallback for Render/Gmail blocking: Return OTP in response for testing
      console.log(
        "⚠️ Email failed, returning OTP in response for testing:",
        otp,
      );
      res.json({
        message: "فشل إرسال البريد (Test Mode)",
        dev_otp: otp, // OTP included for testing purposes
        success: true,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "البريد الإلكتروني ورمز التحقق مطلوبان" });
    }

    // Find OTP
    const otpRecord = await OTP.findOne({ email, otp }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
    }

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({ message: "تم التحقق بنجاح", verified: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    // Check email uniqueness
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res
        .status(400)
        .json({ message: "هذا البريد الإلكتروني مستخدم بالفعل" });
    }

    // Check username uniqueness
    const usernameExists = await User.findOne({ username: username?.trim() });
    if (usernameExists) {
      return res
        .status(400)
        .json({ message: "اسم المستخدم مأخوذ، يرجى اختيار اسم آخر" });
    }

    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        profileImage: user.profileImage || "",
        vipLevel: user.vipLevel || 0,
        level: user.level || 0,
        totalSpent: user.totalSpent || 0,
        totalRecharged: user.totalRecharged || 0,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "بيانات المستخدم غير صالحة" });
    }
  } catch (error) {
    // MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === "email")
        return res
          .status(400)
          .json({ message: "هذا البريد الإلكتروني مستخدم بالفعل" });
      if (field === "username")
        return res
          .status(400)
          .json({ message: "اسم المستخدم مأخوذ، يرجى اختيار اسم آخر" });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();
    console.log("Login attempt from frontend:", { email: normalizedEmail });

    const user = await User.findOne({ email: normalizedEmail });
    console.log("User found:", user ? "Yes" : "No");

    if (user) {
      const isMatch = await user.matchPassword(password);
      console.log("Password match:", isMatch);

      if (isMatch) {
        res.json({
          _id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          profileImage: user.profileImage,
          vipLevel: user.vipLevel || 0,
          level: user.level || 0,
          totalSpent: user.totalSpent || 0,
          totalRecharged: user.totalRecharged || 0,
          token: generateToken(user._id),
        });
        return;
      }
    }

    res
      .status(401)
      .json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "البريد الإلكتروني مطلوب" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(404)
        .json({ message: "لا يوجد حساب مرتبط بهذا البريد الإلكتروني" });
    }

    const otp = generateOTP();
    await OTP.create({ email: normalizedEmail, otp });

    const emailResult = await sendOTPEmail(normalizedEmail, otp, "reset");
    if (emailResult.ok) {
      res.json({ message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" });
    } else {
      console.warn("Email failed for password reset, dev_otp:", otp);
      res.json({ message: "تم إرسال رمز التحقق", dev_otp: otp, success: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !otp || !newPassword) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ email: normalizedEmail, otp }).sort({
      createdAt: -1,
    });
    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
    }

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // Update password (User pre-save hook will hash it)
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  sendOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
};
