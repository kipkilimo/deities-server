import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    // Keep attachments optional
    filename: string;
    content: Buffer | string; // Allow Buffer or string content
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
      user: process.env.GMAIL_ADDRR,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: "noreply@opallearning.com",
    to,
    subject,
    html,
    attachments, // This will include attachments if provided, or be undefined otherwise
  };

  try {
    const auth = {
      user: process.env.GMAIL_ADDR,
      pass: process.env.GMAIL_PASS,
    };
    console.log({ loginEmail: JSON.stringify(auth) });
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    // Handle error, e.g., retry, log, notify
  }
}

export { sendEmail, EmailOptions };
