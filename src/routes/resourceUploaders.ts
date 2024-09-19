import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import fs from "fs/promises"; // Use promise-based fs methods
import Resource from "../models/Resource"; // Import your mongoose model
import { promisify } from "node:util";
import User from "../models/User";
const { exec } = require("child_process");
const path = require("path");
// Express route to handle file uploads and processing
const router = express.Router();
const execAsync = promisify(exec);

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
// const upload = multer({ storage: multer.memoryStorage() });

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

async function convertPptToPdf(
  inputFilePath: string,
  outputFilePath: string
): Promise<string> {
  console.log("Starting PPT to PDF conversion...");
  const command = `libreoffice --headless --convert-to pdf --outdir ${path.dirname(
    outputFilePath
  )} ${inputFilePath}`;
  await execAsync(command);
  console.log("PPT to PDF conversion completed.");
  return outputFilePath;
}

async function convertPdfToJpg(
  pdfFilePath: string,
  outputDir: string
): Promise<string[]> {
  console.log("Starting PDF to JPG conversion...");
  const command = `convert -density 300 ${pdfFilePath} ${outputDir}/page-%03d.jpg`;
  await execAsync(command);

  const jpgFiles = await fs.readdir(outputDir);
  const filteredJpgFiles = jpgFiles.filter((file) => file.endsWith(".jpg"));

  console.log(
    `PDF to JPG conversion completed. Generated ${filteredJpgFiles.length} JPG images.`
  );
  return filteredJpgFiles;
}

async function uploadFileToS3(
  filePath: string,
  bucketName: string
): Promise<string> {
  console.log(`Uploading ${path.basename(filePath)} to S3...`);
  const fileContent = await fs.readFile(filePath);
  const fileName = `${uuidv4()}-${path.basename(filePath)}`;
  const uploadParams = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent,
    ContentType: "image/jpeg",
  };

  const command = new PutObjectCommand(uploadParams);
  await s3Client.send(command);

  const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  console.log(`Upload completed: ${fileUrl}`);
  return fileUrl;
}

async function processFile(
  inputFilePath: string
): Promise<{ imageUrls: string[]; numberOfImages: number }> {
  const tempDir = path.join(__dirname, "temp");
  const outputDir = path.join(tempDir, uuidv4());
  let pdfFilePath: string;

  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  try {
    const fileExtension = path.extname(inputFilePath).toLowerCase();
    if (fileExtension !== ".pdf") {
      console.log("File is not a PDF. Starting PPT to PDF conversion...");
      pdfFilePath = path.join(tempDir, `${uuidv4()}.pdf`);
      await convertPptToPdf(inputFilePath, pdfFilePath);
    } else {
      console.log("File is already a PDF. Skipping conversion...");
      pdfFilePath = inputFilePath;
    }

    const jpgFiles = await convertPdfToJpg(pdfFilePath, outputDir);
    const bucketName = process.env.AWS_BUCKET_NAME as string;

    console.log("Starting the upload of JPG images to S3...");
    const imageUrls = await Promise.all(
      jpgFiles.map((jpgFile) => {
        const jpgFilePath = path.join(outputDir, jpgFile);
        return uploadFileToS3(jpgFilePath, bucketName);
      })
    );
    console.log("All JPG images uploaded to S3.");

    return { imageUrls, numberOfImages: jpgFiles.length };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log("Temporary files cleaned up.");
  }
}

router.post(
  "/slides",
  contentUpload.single("file"),
  async (req: Request, res: Response) => {
    const resourceId = req.query.resourceId as string;

    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const resource = await Resource.findById(resourceId).select("contentType");
    if (!resource) {
      return res.status(400).send("Invalid resource ID.");
    }

    if (resource.contentType !== "PRESENTATION") {
      return res.status(400).send("Invalid resource type.");
    }

    const tempDir = path.join(__dirname, "temp");
    const tempFilePath = path.join(
      tempDir,
      `${uuidv4()}-${req.file.originalname}`
    );

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(tempFilePath, req.file.buffer);

      console.log("Starting the file processing...");
      const { imageUrls, numberOfImages } = await processFile(tempFilePath);

      const updatedResource = await Resource.findByIdAndUpdate(
        resourceId,
        { content: JSON.stringify(imageUrls) },
        { new: true }
      );

      if (!updatedResource) {
        return res.status(404).send("Resource not found.");
      }

      console.log("File processing and uploads completed successfully.");
      res.json({
        message: "Files processed and uploaded successfully.",
        imageUrls,
        numberOfImages,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).send("Error processing file.");
    }
  }
);
// Handle POST request to /resources/uploads/exam/enroll
// Handle POST request to /resources/uploads/exam/enroll
router.post("/uploads/exam/enroll", async (req, res) => {
  const { sessionId, participantsList } = req.body;

  if (!sessionId || !participantsList) {
    return res
      .status(400)
      .json({ error: "Session ID and participants list are required" });
  }

  try {
    // Fetch the Resource by sessionId
    const resource = await Resource.findOne({ sessionId });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Parse the participantsList from JSON
    let parsedParticipantsList;
    try {
      parsedParticipantsList = JSON.parse(participantsList);
    } catch (error) {
      return res
        .status(400)
        .json({ error: "Invalid participants list format" });
    }

    // Destructure ACCEPTED and REJECTED, and ensure they are arrays
    const { ACCEPTED = [], REJECTED = [] } = parsedParticipantsList;

    // Define the helper function to handle participant updates
    function updateParticipants(
      resourceParticipants: any[],
      acceptedRequests: string[],
      rejectedRequests: string[]
    ) {
      const updatedParticipants = resourceParticipants
        .map((participant: any) => {
          if (acceptedRequests.includes(participant.userId)) {
            participant.requestStatus = "ENROLLED";
          } else if (rejectedRequests.includes(participant.userId)) {
            return null; // Mark for removal if rejected
          }
          return participant;
        })
        .filter((participant: any) => participant !== null); // Remove rejected entries
      return updatedParticipants;
    }

    let resourceParticipants = [];
    if (resource.participants.length > 0) {
      // Parse existing participants
      resourceParticipants = JSON.parse(resource.participants);
    }

    // Update participants based on accepted and rejected lists
    const updatedParticipants = updateParticipants(
      resourceParticipants,
      ACCEPTED,
      REJECTED
    );

    // Add new participants from accepted requests
    for (const userId of ACCEPTED) {
      try {
        // Fetch user by ID (ensure userId is a valid ObjectId string)
        const participant = await User.findById(userId.userId);
        if (participant) {
          const participantDetails = {
            sessionId,
            userId: userId.userId,
            requestedDate: new Date(), // Current date and time
            requestStatus: "ENROLLED",
            participantName: participant.personalInfo.fullName,
            resourceResponses: [],
          };
          // Add new participant details to the list
          updatedParticipants.push(participantDetails);
        } else {
          console.error(`User not found for ID ${userId}`);
        }
      } catch (error) {
        console.error(`Error fetching user with ID ${userId}:`, error);
      }
    }
    // clean
    const cleanedParticipants = Array.from(
      new Map(
        updatedParticipants
          .filter(
            (participant: any) => participant.requestStatus === "ENROLLED"
          )
          .map((participant: any) => [participant.userId, participant])
      ).values()
    );
    // Function to remove duplicates based on a specific field
    function removeDuplicates(arr: any[], field: string) {
      const seen = new Set();
      return arr.reduce((unique: any[], item: { [x: string]: unknown }) => {
        if (!seen.has(item[field])) {
          seen.add(item[field]);
          unique.push(item);
        }
        return unique;
      }, []);
    }

    const uniqueArray = removeDuplicates(cleanedParticipants, "userId");

    resource.participants = JSON.stringify(uniqueArray);

    await resource.save();

    // Respond with a success message
    res.json({
      message: "Participant data updated successfully",
      updatedParticipants,
    });
  } catch (error) {
    console.error("Error processing participant data:", error);
    res.status(500).json({ error: "An error occurred while processing data" });
  }
});

router.post("/uploads/exam/participant", async (req, res) => {
  const { sessionId, userId } = req.body;

  if (!sessionId || !userId) {
    return res
      .status(400)
      .json({ error: "Session ID and User ID are required" });
  }

  try {
    // Fetch the Resource by sessionId
    const resource = await Resource.findOne({ sessionId });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    //@ts-ignore
    let resourceParticipants = [];
    if (resource.participants.length >= 1) {
      // Parse the JSON array from participants
      resourceParticipants = JSON.parse(resource.participants);
    }

    // Define the parseJsonArray function separately

    const userExists = resourceParticipants.some(
      (participant: { userId: any }) => participant.userId === userId
    );

    if (userExists) {
      return res
        .status(404)
        .json({ error: "Cannot add duplicate participants" });
    }
    if (resourceParticipants.length > 50) {
      return res.status(404).json({ error: "Cannot add more participants" });
    }
    const participant = await User.findOne({ _id: userId });
    // Create the participantDetails object
    const participantDetails = {
      sessionId,
      userId,
      requestedDate: new Date(), // Current date and time
      requestStatus: "PENDING",
      //@ts-ignore
      participantName: participant.personalInfo.fullName,
      resourceResponses: [],
    };

    // Push the participantDetails object into resource.participant array
    resourceParticipants.push(participantDetails);
    const updated = JSON.stringify(resourceParticipants);
    resource.participants = updated;
    // Save the updated resource back to the database
    await resource.save();

    // Respond with a success message
    res.json({
      message: "Participant data received successfully",
      participantDetails,
    });
  } catch (error) {
    console.error("Error processing participant data:", error);
    res.status(500).json({ error: "An error occurred while processing data" });
  }
});
router.post("/uploads", async (req: Request, res: Response) => {
  // const resourceType = req.query.resourceType as string;
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
          message: "Cover image uploaded successfully",
          resource: updatedResource,
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
          url: JSON.stringify(fileUrls),
        });
      }
      // Respond with success message and file URLs
    } catch (error) {
      console.error("Error uploading files to S3:", error);
      res.json({
        message: "Error uploading files",
      });
    }
  });
});

export default router;
