const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like SendGrid, Mailgun, etc.
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password',
    },
});

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'TikBook <noreply@tikbook.com>',
            to: email,
            subject: 'رمز التحقق - TikBook',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
                    <div style="background: linear-gradient(135deg, #FE2C55 0%, #FF6B9D 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">TikBook</h1>
                    </div>
                    <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; text-align: center;">رمز التحقق الخاص بك</h2>
                        <p style="color: #666; font-size: 16px; text-align: center;">
                            استخدم الرمز التالي لإكمال عملية التسجيل:
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
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        return false;
    }
};

module.exports = {
    generateOTP,
    sendOTPEmail,
};
