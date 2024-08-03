import { S3Client, S3ClientConfig, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import mongoose from "mongoose";
import Paper from "../models/Paper"; // Import your mongoose model
import dotenv from "dotenv";

dotenv.config();
// AWS_ACCESS_KEY
// AWS_SECRET_KEY
// AWS_BUCKET_NAME
const router = express.Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
} as S3ClientConfig); // Explicit type assertion for TypeScript

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const fileContent = req.file.buffer;
  const fileName = `${uuidv4()}-${req.file.originalname}`;
  const bucketName = process.env.AWS_BUCKET_NAME;

  try {
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileContent,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Assuming you have a Mongoose model named Paper
    const updatedPaper = await Paper.findByIdAndUpdate(
      req.body.paperId, // Assuming you're sending the document ID in the request body
      { url: url },
      { new: true }
    );

    res.json({ message: "File uploaded successfully", url, updatedPaper });
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    res.status(500).send("Server error");
  }
});

export default router;
