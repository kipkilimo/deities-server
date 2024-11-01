import Mailgun from "mailgun.js";
import formData from "form-data";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  // @ts-ignore
  key: process.env.MAILGUN_API_KEY,
  proxy: {
    protocol: "https",
    host: "127.0.0.1", // Use your proxy host here
    port: 4000, // Use your proxy port here
    auth: {
      username: process.env.MAILGUN_DOMAIN || "", // Provide username
      password: process.env.SMTP_PASSWORD, // Provide password
    },
  },
});

export interface EmailOptions {
  to: string[]; // Recipient's email addresses
  subject: string; // Subject of the email
  html: string; // HTML content of the email
  attachments?: {
    filename: string; // Name of the file
    content: Buffer; // Content of the file as Buffer
    contentType: string; // MIME type of the file
  }[]; // Optional attachments
}

export const sendEmail = async (options: EmailOptions): Promise<any> => {
  const { to, subject, html, attachments } = options;

  const messageData = {
    from: `Sender Name <${process.env.FROM_NAME}>`, // Adjust sender name and address
    to: to, // The recipient(s)
    subject: subject,
    html: html,
    attachment: attachments
      ? attachments.map((att) => ({
          data: att.content,
          filename: att.filename,
          contentType: att.contentType,
        }))
      : undefined,
  };

  try {
    console.log({ host: process.env.SMTP_HOST || "", messageData });
    const response = await mg.messages.create(
      process.env.SMTP_HOST || "",
      messageData
    );
    return response;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error; // Propagate the error
  }
};
