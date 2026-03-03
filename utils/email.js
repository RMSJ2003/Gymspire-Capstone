const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: "Gymspire <gymspire@gmail.com>",
      to: options.to,
      subject: options.subject,
      text: options.message,
    });

    console.log("✅ Email sent");
  } catch (err) {
    console.error("❌ Email failed but server continues:", err.message);
    // 🚨 DO NOT THROW
  }
};

module.exports = sendEmail;
