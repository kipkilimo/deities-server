import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mongoose from "mongoose";
import { Request, Response } from "express";
import Paper from "../models/Paper"; // Replace with your actual model
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { PDFImage } from "pdf-image";
import os from "os";

// Load environment variables
dotenv.config();

// Configure the AWS SDK
// @ts-ignore
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

interface ImageObject {
  number: number;
  image: string;
}

export const convertPdfToImages = async (
  pdfPath: string,
  outputPath: string,
  paperId: string
): Promise<void> => {
  try {
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const pdfImage = new PDFImage(pdfPath, {
      outputDirectory: outputPath,
      convertOptions: {
        "-quality": "100",
        "-density": "300",
      },
    });

    const imagePaths = await pdfImage.convertFile();
    console.log("PDF converted to images successfully.");

    const imageObjects: ImageObject[] = [];
    const bucketName = process.env.AWS_BUCKET_NAME as string;
    const region = process.env.AWS_REGION as string;

    // Store initial timestamp for consistent time-based naming
    const initialTimestamp = Date.now();

    await Promise.all(
      imagePaths.map(async (imagePath, index) => {
        try {
          const fileStream = fs.createReadStream(imagePath);
          const timestamp = initialTimestamp + index; // Sequential timestamps based on index
          const fileName = `t-${timestamp}-page-${index + 1}-${uuidv4()}.jpeg`;

          const uploadParams = {
            Bucket: bucketName,
            Key: `pdf-images/${fileName}`,
            Body: fileStream,
            ContentType: "image/jpeg",
          };

          await s3Client.send(new PutObjectCommand(uploadParams));
          const imageUrl = `https://${uploadParams.Bucket}.s3.${region}.amazonaws.com/${uploadParams.Key}`;

          imageObjects.push({ number: index + 1, image: imageUrl });

          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error(`Error uploading image ${imagePath}:`, err);
        }
      })
    );

    console.log("Finding document with paperId:", paperId);

    const modelDocument = await Paper.findById(paperId);
    if (!modelDocument) {
      throw new Error("Document not found");
    }

    function sortImagesByTimestamp(imageArray: ImageObject[]) {
      const extractTimestamp = (url: string) => {
        const match = url.match(/t-(\d+)-page/);
        return match ? parseInt(match[1], 10) : null;
      };

      imageArray.sort((a, b) => {
        const timestampA = extractTimestamp(a.image);
        const timestampB = extractTimestamp(b.image);
        return (timestampA || 0) - (timestampB || 0);
      });

      return imageArray;
    }

    const sortedArray = sortImagesByTimestamp(imageObjects);

    modelDocument.url = JSON.stringify(sortedArray);
    await modelDocument.save();

    console.log("Model updated with image URLs successfully.");
  } catch (error) {
    console.error("Error processing PDF:", error);
  }
};

const upload = multer({ dest: os.tmpdir() });

export const handlePdfConversion = [
  upload.single("file"),
  async (req: Request, res: Response) => {
    const paperId = req.query.paperId as string;
    const file = req.file;

    if (!file) {
      return res.status(400).send({ error: "No file uploaded." });
    }

    const pdfPath = file.path;
    const outputPath = path.join(os.tmpdir(), "output");

    try {
      await convertPdfToImages(pdfPath, outputPath, paperId);

      fs.unlinkSync(pdfPath);

      const updatedDocument = await Paper.findById(paperId);

      res.status(200).send({
        message: "PDF conversion and upload successful.",
        updatedPaper: updatedDocument,
      });
    } catch (error) {
      console.error("Error in handlePdfConversion:", error);
      res.status(500).send({ error: "Error converting PDF to images." });
    }
  },
];
