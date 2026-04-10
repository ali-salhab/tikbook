const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// Only initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Build the HTML email body
const buildEmailHtml = (otp, bodyTitle, bodyDesc) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
    <div style="background: linear-gradient(135deg, #FE2C55 0%, #FF6B9D 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">TikBook</h1>
    </div>
    <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
      <h2 style="color: #333; text-align: center;">${bodyTitle}</h2>
      <p style="color: #666; font-size: 16px; text-align: center;">${bodyDesc}</p>
      <div style="background: white; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px; border: 2px dashed #FE2C55;">
        <h1 style="color: #FE2C55; margin: 0; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
      </div>
      <p style="color: #999; font-size: 14px; text-align: center;">هذا الرمز صالح لمدة 10 دقائق فقط</p>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة</p>
    </div>
  </div>
`;

// Send via Gmail SMTP using nodemailer
const sendViaGmail = async (to, subject, html) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);

  if (!user || !pass) {
    throw new Error("EMAIL_USER or EMAIL_PASSWORD not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `TikBook <${user}>`,
    to,
    subject,
    html,
  });
};

// Send OTP email — tries Gmail SMTP first, falls back to Resend
const sendOTPEmail = async (email, otp, type = "register") => {
  const subject =
    type === "reset"
      ? "إعادة تعيين كلمة المرور - TikBook"
      : "رمز التحقق - TikBook";

  const bodyTitle =
    type === "reset" ? "رمز إعادة تعيين كلمة المرور" : "رمز التحقق الخاص بك";

  const bodyDesc =
    type === "reset"
      ? "استخدم الرمز التالي لإعادة تعيين كلمة مرورك:"
      : "استخدم الرمز التالي لإكمال عملية التسجيل:";

  const html = buildEmailHtml(otp, bodyTitle, bodyDesc);

  // ── 1. Try Gmail SMTP ──────────────────────────────────────────────────────
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      await sendViaGmail(email, subject, html);
      console.log("✅ OTP email sent via Gmail SMTP to:", email);
      return { ok: true };
    } catch (err) {
      console.error("❌ Gmail SMTP failed:", err.message, "— trying Resend...");
    }
  }

  // ── 2. Try Resend ──────────────────────────────────────────────────────────
  if (resend) {
    try {
      const fromAddress = process.env.EMAIL_FROM || "TikBook <onboarding@resend.dev>";
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [email],
        subject,
        html,
      });

      if (error) {
        console.error("❌ Resend error:", JSON.stringify(error, null, 2));
        return { ok: false, error };
      }

      console.log("✅ OTP email sent via Resend to:", email, "| id:", data?.id);
      return { ok: true };
    } catch (err) {
      console.error("❌ Resend failed:", err.message);
      return { ok: false, error: err };
    }
  }

  // ── 3. No transport configured ─────────────────────────────────────────────
  console.warn(`⚠️  DEV MODE: No email transport configured. OTP for ${email} is: ${otp}`);
  return { success: true, devMode: true };
};

module.exports = {
  generateOTP,
  sendOTPEmail,
};
