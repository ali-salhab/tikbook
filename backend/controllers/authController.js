const User = require("../models/User");
const OTP = require("../models/OTP");
const jwt = require("jsonwebtoken");
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
    const emailSent = await sendOTPEmail(email, otp);

    if (emailSent) {
      res.json({ message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" });
    } else {
      res.status(500).json({ message: "فشل إرسال البريد الإلكتروني" });
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

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "المستخدم موجود بالفعل" });
    }

    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "بيانات المستخدم غير صالحة" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt from frontend:", { email, password });

    const user = await User.findOne({ email });
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

module.exports = { registerUser, loginUser, sendOTP, verifyOTP };
