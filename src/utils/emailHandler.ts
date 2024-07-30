import nodemailer from 'nodemailer';
 
interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, text } = options;

  // Gmail specific configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_ADDRR,
      pass: process.env.GMAIL_PASS
    }
  });

  const mailOptions = {
    from: 'noreply@opallearning.com',
    to,
    subject,
    html,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    // Handle error, e.g., retry, log, notify
  }
}

export { sendEmail, EmailOptions };
