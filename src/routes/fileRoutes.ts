import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Paper from "../models/Paper"; // Import your mongoose model

dotenv.config();

// Configure the AWS SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Replace with your region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_KEY as string,
  },
});

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Upload route handler
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const fileContent = req.file.buffer;
    const fileName = `${uuidv4()}-${req.file.originalname}`;
    const bucketName = process.env.AWS_BUCKET_NAME as string;
    try {
      // Set up S3 upload parameters
      const uploadParams = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent,
        ContentType: req.file.mimetype,
      };

      // Create a new PutObjectCommand
      const command = new PutObjectCommand(uploadParams);

      // Upload file to S3
      await s3Client.send(command);

      // Generate a signed URL for the uploaded file
      const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      // Retrieve paperId from query string parameters
      const paperId = req.query.paperId as string;

      if (!paperId) {
        return res.status(400).send("Paper ID is required.");
      }

      // Update Mongoose model with the file URL using the paperId from the query string
      const updatedPaper = await Paper.findByIdAndUpdate(
        paperId, // Retrieve paperId from query string
        { url: fileUrl },
        { new: true }
      );

      if (!updatedPaper) {
        return res.status(404).send("Paper not found.");
      }
      console.log({ paper: JSON.stringify(updatedPaper) });

      // Respond with success message and file URL
      res.json({
        message: "File uploaded successfully",
        url: fileUrl,
        updatedPaper,
      });
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      res.status(500).send("Server error");
    }
  }
);

export default router;
