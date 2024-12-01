import express, { Router, Request, Response } from "express";
import mongoose from "mongoose";
import pdf from "html-pdf-node";
import QRCode from "qrcode";
import dotenv from "dotenv";
import { sendEmail, EmailOptions } from "../utils/emailHandler"; // Adjust import path as needed
import Vendor from "../models/Vendor"; // Import your mongoose model
import cors from "cors";

dotenv.config();

const ngrokURL = "https://nem.bio"; // process.env.VITE_NGROK_URL;
const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const generateQrCodeImage = async (token: string): Promise<string> => {
  try {
    const process = "CHECK"; //'AUTH'
    const url = `${ngrokURL}:4000/vendors/check?code=${token}`; // Updated to generate URL with token
    const qrCodeDataUrl = await QRCode.toDataURL(url);
    return qrCodeDataUrl;
  } catch (err) {
    throw new Error("Failed to generate QR code.");
  }
};
// CHECK
// https://huge-eagles-guess.loca.lt:4000/vendors/authenticate?accessToken=PbZuQ7g8NeEvNt5VbTp
const generateVoucherHTML = async (token: string): Promise<string> => {
  const qrCodeUrl = await generateQrCodeImage(token);

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
          /* Repeating background applied to the entire page */
          background-image: url('https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png');
          background-repeat: repeat;
          background-size: 20px 20px; 
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
          position: relative;  
          z-index: 1; 
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
    <body style="          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          /* Repeating background applied to the entire page */
          background-image: url('https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png');
          background-repeat: repeat;
          background-size: 20px 20px; ">
      <div class="voucher">
        <h1>KSH 100</h1>
        <p>PRINT SHOP & COMCARE CAFE VOUCHER</p>
        <div style="display: flex; flex-direction: column; align-items: center;">
          <img src="${qrCodeUrl}" alt="QR Code" style="width: 540px; height: auto;"/>
          <img src="https://cdn.freebiesupply.com/logos/large/2x/trello-logo-png-transparent.png" alt="Logo" style="max-width: 150px; height: auto;"/>
        </div>
        <div class="footer">
          Valid for one-time use only. Expiry date: ${formattedExpiryDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          )}
 
        </div>
          <hr/>
        <div class="footer">
 
          <h4>The Hub for Interactive Life Sciences Learning and Research Tools.</h4>
          <p>
Epidemiology | Biostatistics | Research Methods | Seminar Series | Colloquia and Talks | Test Yourself | Fun Activities</p>
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

    const emailOptions: EmailOptions = {
      // @ts-ignore
      to: [email],
      subject: "Your NEMBio Voucher",
      html: "<h3>Please find your exclusive NEMBio voucher attached.</h3>",
      attachments: [
        {
          filename: "voucher.pdf",
          content: pdfBuffer,
          // @ts-ignore
          contentType: "application/pdf",
        },
      ],
    };

    await sendEmail(emailOptions);
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

const router = express.Router();

// Enable CORS for this router only
router.use(cors());

// Route to send vouchers
router.get("/send-vouchers", async (req, res) => {
  try {
    const emailListRaw = req.query.awardeeEmails;

    const emailList = JSON.parse(emailListRaw as string);

    console.log({ emailList });
    await sendVouchersToEmails(emailList);
    const response = {
      message: "Vouchers sent successfully!",
    };
    res.send(response);
  } catch (error) {
    console.error("Error sending vouchers:", error);
    res.status(500).send("Failed to send vouchers.");
  }
});

router.get("/check", async (req: Request, res: Response) => {
  const { code } = req.query; // Changed from `token` to `code`

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    const voucher = await Voucher.findOne({ token: code }); // Match `token` with `code`

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

    // If the voucher is valid, return the entire voucher document as JSON
    return res.json(voucher);
  } catch (error) {
    console.error("Error checking voucher:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/redeem", async (req: Request, res: Response) => {
  const { token } = req.body;
  const { vendorId, pin } = req.query;

  if (!token || typeof token !== "string") {
    return res
      .status(400)
      .json({ error: "Token is required and must be a string" });
  }

  if (!vendorId || typeof vendorId !== "string") {
    return res
      .status(400)
      .json({ error: "Vendor ID is required and must be a string" });
  }

  if (!pin || typeof pin !== "string") {
    return res
      .status(400)
      .json({ error: "PIN is required and must be a string" });
  }

  try {
    // Verify vendor
    const vendor = await Vendor.findOne({ vendorId, vendorPin: pin });

    if (!vendor) {
      return res.status(401).json({ error: "Invalid vendor ID or PIN" });
    }

    // Proceed with voucher redemption
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
// Route to handle vendor login via QR code scan
router.get("/authenticate", async (req: Request, res: Response) => {
  const { accessToken } = req.query;
  console.log({ accessToken });
  if (!accessToken || typeof accessToken !== "string") {
    return res
      .status(400)
      .json({ error: "Access token is required and must be a string" });
  }

  try {
    const vendor = await Vendor.findOne({ vendorId: accessToken });

    if (!vendor) {
      return res
        .status(404)
        .json({ status: "invalid", message: "Vendor not found" });
    }

    // Render a page or send a response to prompt the user to enter their PIN
    // Assuming you'll handle the PIN entry on the frontend
    return res.json({
      status: "success",
      message: "Vendor found, please enter your PIN",
      vendorId: vendor.vendorId, // Send back vendorId to be used in PIN verification
    });
  } catch (error) {
    console.error("Error logging in vendor:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Route to verify vendor PIN
router.post("/login", async (req: Request, res: Response) => {
  const { vendorId, pin } = req.body;

  if (!vendorId || typeof vendorId !== "string") {
    return res.status(400).json({ error: "Vendor ID is required" });
  }

  if (!pin || typeof pin !== "number") {
    return res
      .status(400)
      .json({ error: "PIN is required and must be a number" });
  }

  try {
    const vendor = await Vendor.findOne({ vendorId });

    if (!vendor) {
      return res
        .status(404)
        .json({ status: "invalid", message: "Vendor not found" });
    }

    if (vendor.vendorPin !== pin) {
      return res
        .status(401)
        .json({ status: "invalid", message: "Incorrect PIN" });
    }

    // Return vendor details if PIN matches
    return res.json({
      status: "success",
      message: "PIN verified successfully",
      vendor: {
        vendorId: vendor.vendorId,
        // You can include other vendor details here if needed
      },
    });
  } catch (error) {
    console.error("Error verifying vendor PIN:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
