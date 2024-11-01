

import nodemailer from "nodemailer";

// Load environment variables from a .env file into process.env
dotenv.config();

// Define the structure of email options
interface EmailOptions {
    to: string; // Recipient email address
    subject: string; // Email subject
    html: string; // HTML content of the email
    attachments?: {
        // Optional attachments
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
}

// Async function to send an email with the specified options
async function sendEmail(options: EmailOptions): Promise<void> {
    const { to, subject, html, attachments } = options;

    // Create a transporter using Mailgun-specific configuration
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, // SMTP host, e.g., smtp.mailgun.org
        port: Number(process.env.SMTP_PORT), // SMTP port, usually 465 for SSL
        secure: true, // Use SSL for secure connection
        auth: {
            user: process.env.SMTP_EMAIL, // Mailgun SMTP user
            pass: process.env.SMTP_PASSWORD, // Mailgun SMTP password
        },
    });

    // Define the email options, including sender, recipient, and content
    const mailOptions: nodemailer.SendMailOptions = {
        from: `${process.env.FROM_NAME || "NEMBio Colloquium"} <${process.env.FROM_EMAIL || "info@nem.bio"
            }>`,

        to, // Recipient email address
        subject, // Subject of the email
        html, // HTML content
        attachments, // Attachments (if any)
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
    } catch (error) {
        // Log any errors that occur during email sending
        console.error("Error sending email:", error);
    }
}

// Export the sendEmail function and EmailOptions interface
export { sendEmail, EmailOptions };
