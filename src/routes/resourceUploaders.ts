import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Resource from "../models/Resource"; // Import your mongoose model

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

// Configure multer with file size limits
const coverImageLimit = 2 * 1024 * 1024; // 2MB
const contentArrayLimit = 720 * 1024 * 1024; // 720MB

// Multer configuration for cover image
const coverImageUpload = multer({
  limits: { fileSize: coverImageLimit },
});

// Multer configuration for content files
const contentUpload = multer({
  limits: { fileSize: contentArrayLimit },
});

// Middleware to determine the upload strategy based on fileCreationStage
router.post("/resource-uploads", async (req: Request, res: Response) => {
  const resourceType = req.query.resourceType as string;
  const resourceId = req.query.resourceId as string;

  const fileCreationStage = req.query.fileCreationStage as string;
  const fileCount =
    fileCreationStage === "COVER"
      ? 1
      : fileCreationStage === "CONTENT"
      ? 10
      : 0;

  if (fileCount === 0) {
    return res.status(400).send("Invalid fileCreationStage parameter.");
  }

  // Determine the appropriate upload handler
  const uploadHandler =
    fileCreationStage === "COVER"
      ? coverImageUpload.single("file")
      : contentUpload.array("files", fileCount);

  uploadHandler(req, res, async (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).send("File size limit exceeded.");
        }
        return res.status(400).send(`Multer error: ${err.message}`);
      }
      return res.status(400).send(`Error uploading files: ${err.message}`);
    }

    // Get file(s) from request
    const files =
      fileCreationStage === "COVER"
        ? [req.file]
        : (req.files as Express.Multer.File[]);

    if (!files || files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }

    try {
      const uploadPromises = files.map(async (file: any) => {
        const fileContent = file.buffer;
        const fileName = `${uuidv4()}-${file.originalname}`;
        const bucketName = process.env.AWS_BUCKET_NAME as string;

        // Set up S3 upload parameters
        const uploadParams = {
          Bucket: bucketName,
          Key: fileName,
          Body: fileContent,
          ContentType: file.mimetype,
        };

        // Create a new PutObjectCommand
        const command = new PutObjectCommand(uploadParams);

        // Upload file to S3
        await s3Client.send(command);

        // Generate a URL for the uploaded file
        return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      });

      const fileUrls = await Promise.all(uploadPromises);

      if (!resourceId) {
        return res.status(400).send("Resource ID is required.");
      }

      // Update Mongoose model with the file URLs using the resourceId from the query string
      if (fileCreationStage === "COVER") {
        const updatedResource = await Resource.findByIdAndUpdate(
          resourceId, // Retrieve paperId from query string
          { coverImage: fileUrls[0] }, // Adjust the field name as needed in your model
          { new: true }
        );
        if (!updatedResource) {
          return res.status(404).send("Resource not found.");
        }
        res.json({
          message: "Files uploaded successfully",
          updatedResource,
        });
      }
      if (fileCreationStage === "CONTENT") {
        const updatedResource = await Resource.findByIdAndUpdate(
          resourceId, // Retrieve paperId from query string
          { content: JSON.stringify(fileUrls) }, // Adjust the field name as needed in your model
          { new: true }
        );
        if (!updatedResource) {
          return res.status(404).send("Resource not found.");
        }
        res.json({
          message: "Files uploaded successfully",
          updatedResource,
        });
      }
      // Respond with success message and file URLs
    } catch (error) {
      console.error("Error uploading files to S3:", error);
      res.status(500).send("Server error");
    }
  });
});

export default router;
