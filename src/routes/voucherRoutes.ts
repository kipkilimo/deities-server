import express, { Router, Request, Response } from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import pdf from "html-pdf-node";
import QRCode from "qrcode";
// import dotenv from "dotenv";
import { sendEmail } from "../utils/emailHandler"; // Adjust import path as needed

// dotenv.config();

const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const generateQrCodeImage = async (token: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(token);
    return qrCodeDataUrl;
  } catch (err) {
    throw new Error("Failed to generate QR code.");
  }
};

const generateVoucherHTML = async (token: string): Promise<string> => {
  const qrCodeUrl = await generateQrCodeImage(token);
  // Function to format the date as "MMMM D, YYYY h:mm:ss a"
  const formattedExpiryDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    };
    return date.toLocaleString("en-US", options);
  };
  return `
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: #f5f5f5;
        }
        .voucher {
          width: 21cm;
          height: 29.7cm;
          padding: 20px;
          box-sizing: border-box;
          background-color: #ffffff;
          border: 1px solid #ddd;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .voucher h1 {
          font-size: 36px;
          color: #333;
          margin: 0;
        }
        .voucher p {
          font-size: 24px;
          color: #666;
          margin: 10px 0;
        }
        .voucher img {
          margin: 20px 0;
          width: 150px;
          height: 150px;
        }
        .footer {
          margin-top: 20px;
          font-size: 14px;
          color: #999;
        }
      </style>
    </head>
    <body>
<div class="voucher">
  <h1>KSH 100</h1>
  <p>PRINT SHOP VOUCHER</p>
  <div style="display: flex; justify-content: center; gap: 20px;">
    <img src="${qrCodeUrl}" alt="QR Code" style="width: 50%; max-width: 150px; height: auto;"/>
    <img src="https://cdn.freebiesupply.com/logos/large/2x/trello-logo-png-transparent.png" alt="Logo" style="width: 50%; max-width: 150px; height: auto;"/>
  </div>
   <div class="footer">
          Valid for one-time use only. Expiry date: ${formattedExpiryDate}
        </div>
</div>

    </body>
    </html>
  `;
};

const generatePdfBuffer = async (htmlContent: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    pdf.generatePdf(
      { content: htmlContent },
      { format: "A4" },
      (err, buffer) => {
        if (err) {
          return reject(err);
        }
        resolve(buffer);
      }
    );
  });
};

const sendEmailWithVoucher = async (email: string, voucherPDF: Buffer) => {
  try {
    const emailOptions = {
      to: email,
      subject: "Your NEMBi Voucher",
      html: "<h3>Please find your exclusive NEMBi voucher attached.</h3>",
      attachments: [
        {
          filename: "voucher.pdf",
          content: voucherPDF,
          contentType: "application/pdf",
        },
      ],
    };

    await sendEmail(emailOptions);
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
};

export const sendVouchersToEmails = async (emailList: string[]) => {
  for (let i = 0; i < emailList.length; i++) {
    const email = emailList[i];
    const token = generateToken();

    const voucher = new Voucher({
      token,
      redeemed: false,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await voucher.save();

    const voucherHTML = await generateVoucherHTML(token);
    const pdfBuffer = await generatePdfBuffer(voucherHTML);

    await sendEmailWithVoucher(email, pdfBuffer);
    console.log(`Sent voucher to ${email}`);
  }
};

interface IVoucher extends mongoose.Document {
  token: string;
  redeemed: boolean;
  expiryDate: string;
}

const voucherSchema = new mongoose.Schema<IVoucher>({
  token: { type: String, required: true },
  redeemed: { type: Boolean, required: true, default: false },
  expiryDate: { type: String, required: true },
});

const Voucher = mongoose.model<IVoucher>("Voucher", voucherSchema);

const router = Router();

router.get("/send-vouchers", async (req, res) => {
  try {
    const emailListRaw = req.query.awardeeEmails;

    // @ts-ignore
    const emailList = JSON.parse(emailListRaw);

    // Log the parsed array to verify
    console.log({ emailList });
    const result = await sendVouchersToEmails(emailList);
    const response = {
      result: result,
      message: "Vouchers sent successfully!",
    };
    res.send(response);
  } catch (error) {
    console.error("Error sending vouchers:", error);
    res.status(500).send("Failed to send vouchers.");
  }
});

router.get("/check", async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res
      .status(400)
      .json({ error: "Token is required and must be a string" });
  }

  try {
    const voucher = await Voucher.findOne({ token });

    if (!voucher) {
      return res
        .status(404)
        .json({ status: "invalid", message: "Voucher not found" });
    }

    if (voucher.redeemed) {
      return res.status(400).json({
        status: "redeemed",
        message: "Voucher has already been redeemed",
      });
    }

    const expiryDate = new Date(voucher.expiryDate);
    const currentDate = new Date();

    if (expiryDate < currentDate) {
      return res
        .status(400)
        .json({ status: "expired", message: "Voucher has expired" });
    }

    return res.json({ status: "valid", message: "Voucher is valid" });
  } catch (error) {
    console.error("Error checking voucher:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/redeem", async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    return res
      .status(400)
      .json({ error: "Token is required and must be a string" });
  }

  try {
    const voucher = await Voucher.findOne({ token });

    if (!voucher) {
      return res
        .status(404)
        .json({ status: "invalid", message: "Voucher not found" });
    }

    if (voucher.redeemed) {
      return res.status(400).json({
        status: "redeemed",
        message: "Voucher has already been redeemed",
      });
    }

    const expiryDate = new Date(voucher.expiryDate);
    const currentDate = new Date();

    if (expiryDate < currentDate) {
      return res
        .status(400)
        .json({ status: "expired", message: "Voucher has expired" });
    }

    voucher.redeemed = true;
    await voucher.save();

    return res.json({
      status: "redeemed",
      message: "Voucher has been successfully redeemed",
    });
  } catch (error) {
    console.error("Error redeeming voucher:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
