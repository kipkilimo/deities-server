// import dotenv from "dotenv";

// dotenv.config();
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
  }[];
}

async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, attachments } = options;

  // Gmail specific configuration
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false, // Set to true if using TLS
    auth: {
      user: process.env.GMAIL_ADDR,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: "noreply@opallearning.com",
    to,
    subject,
    html,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    // Handle error, e.g., retry, log, notify
  }
}

export { sendEmail, EmailOptions };
