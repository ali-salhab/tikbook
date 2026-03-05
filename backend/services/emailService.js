const { Resend } = require("resend");

// Only initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email via Resend (HTTP API — works on Render free plan)
const sendOTPEmail = async (email, otp, type = "register") => {
  // Check if Resend is configured
  if (!resend) {
    console.warn("⚠️  RESEND NOT CONFIGURED: Email sending is disabled.");
    console.warn(
      "   To enable email OTP, set RESEND_API_KEY in your .env file",
    );
    console.warn(`   📧 DEV MODE: OTP for ${email} is: ${otp}`);
    return { success: true, devMode: true }; // Allow development without email
  }

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

  const fromAddress =
    process.env.EMAIL_FROM || "TikBook <onboarding@resend.dev>";

  // ⚠️  onboarding@resend.dev can ONLY deliver to the Resend account owner's
  //     verified email. To send to any address you must add a custom domain
  //     in Resend dashboard and set EMAIL_FROM=noreply@yourdomain.com
  if (fromAddress.includes("onboarding@resend.dev")) {
    console.warn(
      "⚠️  RESEND WARNING: Using onboarding@resend.dev sandbox sender.\n" +
        "   Emails will ONLY be delivered to the Resend account owner's verified email.\n" +
        "   To send to any email, add a custom domain at https://resend.com/domains\n" +
        "   then set EMAIL_FROM env var to: noreply@yourdomain.com",
    );
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
                    <div style="background: linear-gradient(135deg, #FE2C55 0%, #FF6B9D 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">TikBook</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; text-align: center;">${bodyTitle}</h2>
                        <p style="color: #666; font-size: 16px; text-align: center;">
                            ${bodyDesc}
                        </p>
                        <div style="background: white; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px; border: 2px dashed #FE2C55;">
                            <h1 style="color: #FE2C55; margin: 0; font-size: 36px; letter-spacing: 8px;">${otp}</h1>
                        </div>
                        <p style="color: #999; font-size: 14px; text-align: center;">
                            هذا الرمز صالح لمدة 10 دقائق فقط
                        </p>
                        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                            إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة
                        </p>
                    </div>
                </div>
            `,
    });

    if (error) {
      console.error("❌ Resend error:", JSON.stringify(error, null, 2));
      console.error(
        "   → Recipient:",
        email,
        "\n   → Likely cause: Using sandbox sender (onboarding@resend.dev) with non-verified recipient.",
      );
      return { ok: false, error };
    }

    console.log("✅ OTP email sent to:", email, "| id:", data?.id);
    return { ok: true };
  } catch (error) {
    console.error("❌ Error sending OTP email:", error.message);
    return { ok: false, error };
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
};
