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
import Paper from "../models/Paper";
import { splitPdfToPng } from "../utils/fileProcessing";

import convert from "libreoffice-convert";
const { exec } = require("child_process");
const path = require("path");
// Express route to handle file uploads and processing
const router = express.Router();
const execAsync = promisify(exec);
const { convertToPDF } = require("../utils/convertToPDF"); // Assuming you have a function to convert to PDF

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
  //@ts-ignore
  filename: function (
    req: any,
    file: { originalname: any },
    cb: (arg0: null, arg1: any) => void
  ) {
    cb(null, Date.now() + path.extname(file.originalname)); // Generate a unique name
  },
});

//

export async function convertPptToPdf(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.(ppt|pptx)$/, ".pdf");

  const pptBuffer = await fs.readFile(inputPath);
  const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
    convert.convert(pptBuffer, ".pdf", undefined, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  await fs.writeFile(outputPath, pdfBuffer);
  return outputPath;
}

// async function convertPptToPdf(inputFilePath: string): Promise<string> {
//   console.log("Starting PPT to PDF conversion...");
//   const command = `libreoffice --headless --convert-to pdf --outdir ${path.dirname(
//     inputFilePath
//   )} ${inputFilePath}`;
//   await execAsync(command);
//   console.log("PPT to PDF conversion completed.");
//   return inputFilePath;
// }

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
      await convertPptToPdf(inputFilePath);
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

// Add paper participant enroll request
router.post("/uploads/paper/participant", async (req, res) => {
  const { sessionId, userId } = req.body;

  // Validate input data
  if (!sessionId || !userId) {
    return res
      .status(400)
      .json({ error: "Session ID and User ID are required" });
  }

  try {
    // Fetch the resource and participant concurrently
    const [resource, participant] = await Promise.all([
      Paper.findOne({ sessionId }),
      User.findById(userId),
    ]);

    // Check if resource exists
    if (!resource) {
      return res.status(404).json({ error: "Paper not found" });
    }

    // Ensure participant exists
    if (!participant) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse the participants list if it exists, or initialize an empty array
    let resourceParticipants = [];
    if (resource.participants && resource.participants.length) {
      // @ts-ignore
      resourceParticipants = JSON.parse(resource.participants);
    }

    // Prevent adding more than 50 participants
    if (resourceParticipants.length >= 50) {
      return res.status(400).json({ error: "Cannot add more participants" });
    }

    // Check if participant already exists in the resource
    const userExists = resourceParticipants.some(
      (p: { userId: any }) => p.userId === userId
    );
    if (userExists) {
      return res.json({ message: "Participant already exists", userId });
    }

    // Create participant details
    const participantDetails = {
      sessionId,
      userId,
      requestedDate: new Date(),
      requestStatus: "PENDING",
      participantName: participant.personalInfo.fullName,
      resourceResponses: [],
    };

    // Add new participant
    resourceParticipants.push(participantDetails);
    resource.participants = JSON.stringify(resourceParticipants);

    // Save the updated resource
    await resource.save();

    // Respond with success
    res.json({ message: "Participant added successfully", participantDetails });
  } catch (error) {
    console.error("Error processing participant data:", error);
    res.status(500).json({ error: "An error occurred while processing data" });
  }
});
// Handle POST request to /resources/uploads/paper/enroll
router.post("/uploads/paper/enroll", async (req, res) => {
  const { sessionId, action, participantId, participantIds } = req.body;

  if (!sessionId || !action) {
    return res
      .status(400)
      .json({ error: "Session ID and action are required" });
  }

  try {
    // Fetch the Paper by sessionId
    const resource = await Paper.findOne({ sessionId });

    if (!resource) {
      return res.status(404).json({ error: "Paper not found" });
    }
    // @ts-ignore
    let updatedParticipants = JSON.parse(resource.participants || "[]");

    if (action === "ACCEPT") {
      // Accept a single participant
      if (!participantId) {
        return res
          .status(400)
          .json({ error: "Participant ID is required for accept" });
      }

      // Fetch and enroll participant
      const participant = await User.findById(participantId);
      if (participant) {
        updatedParticipants.push({
          userId: participantId,
          requestStatus: "ENROLLED",
          requestedDate: new Date(),
          participantName: participant.personalInfo.fullName,
          resourceResponses: [],
        });
      }
    } else if (action === "REJECT") {
      // Reject a single participant
      if (!participantId) {
        return res
          .status(400)
          .json({ error: "Participant ID is required for reject" });
      }

      // Remove participant from the list
      updatedParticipants = updatedParticipants.filter(
        (p: { userId: any }) => p.userId !== participantId
      );
    } else if (action === "ACCEPT_ALL") {
      // Accept all participants
      if (!participantIds || !Array.isArray(participantIds)) {
        return res
          .status(400)
          .json({ error: "Participant IDs are required for accept all" });
      }

      for (const id of participantIds) {
        const participant = await User.findById(id);
        if (participant) {
          updatedParticipants.push({
            userId: id,
            requestStatus: "ENROLLED",
            requestedDate: new Date(),
            participantName: participant.personalInfo.fullName,
            resourceResponses: [],
          });
        }
      }
    }

    // Remove duplicates by userId (in case of multiple accepts)
    const uniqueParticipants = Array.from(
      new Map(
        updatedParticipants.map((p: { userId: any }) => [p.userId, p])
      ).values()
    );

    // Update resource participants
    resource.participants = JSON.stringify(uniqueParticipants);
    await resource.save();

    res.json({
      message: "Participant data updated successfully",
      participants: uniqueParticipants,
    });
  } catch (error) {
    console.error("Error processing participant data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing participant data" });
  }
});

// Handle POST request to /resources/uploads/exam/enroll
router.post("/uploads/exam/enroll", async (req, res) => {
  const { sessionId, action, participantId, participantIds } = req.body;

  if (!sessionId || !action) {
    return res
      .status(400)
      .json({ error: "Session ID and action are required" });
  }

  try {
    // Fetch the Paper by sessionId
    const resource = await Resource.findOne({ sessionId });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }
    // @ts-ignore
    let updatedParticipants = JSON.parse(resource.participants || "[]");

    if (action === "ACCEPT") {
      // Accept a single participant
      if (!participantId) {
        return res
          .status(400)
          .json({ error: "Participant ID is required for accept" });
      }

      // Fetch and enroll participant
      const participant = await User.findById(participantId);
      if (participant) {
        updatedParticipants.push({
          userId: participantId,
          requestStatus: "ENROLLED",
          requestedDate: new Date(),
          participantName: participant.personalInfo.fullName,
          resourceResponses: [],
        });
      }
    } else if (action === "REJECT") {
      // Reject a single participant
      if (!participantId) {
        return res
          .status(400)
          .json({ error: "Participant ID is required for reject" });
      }

      // Remove participant from the list
      updatedParticipants = updatedParticipants.filter(
        (p: { userId: any }) => p.userId !== participantId
      );
    } else if (action === "ACCEPT_ALL") {
      // Accept all participants
      if (!participantIds || !Array.isArray(participantIds)) {
        return res
          .status(400)
          .json({ error: "Participant IDs are required for accept all" });
      }

      for (const id of participantIds) {
        const participant = await User.findById(id);
        if (participant) {
          updatedParticipants.push({
            userId: id,
            requestStatus: "ENROLLED",
            requestedDate: new Date(),
            participantName: participant.personalInfo.fullName,
            resourceResponses: [],
          });
        }
      }
    }

    // Remove duplicates by userId (in case of multiple accepts)
    const uniqueParticipants = Array.from(
      new Map(
        updatedParticipants.map((p: { userId: any }) => [p.userId, p])
      ).values()
    );

    // Update resource participants
    resource.participants = JSON.stringify(uniqueParticipants);
    await resource.save();

    res.json({
      message: "Participant data updated successfully",
      participants: uniqueParticipants,
    });
  } catch (error) {
    console.error("Error processing participant data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing participant data" });
  }
});
// save ppts

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
    const fileType = path.extname(req.file.originalname).toLowerCase();

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(tempFilePath, req.file.buffer);

      console.log("Starting file conversion and processing...");

      // Convert to PDF if file is PPT or PPTX
      let pdfFilePath = tempFilePath;
      if (fileType === ".ppt" || fileType === ".pptx") {
        pdfFilePath = await convertPptToPdf(tempFilePath);
      }

      // Split PDF to PNG images
      const imagePaths = await splitPdfToPng(pdfFilePath);

      // Upload each PNG image to S3
      const uploadPromises = imagePaths.map(async (file) => {
        const fileName = `${uuidv4()}-${path.basename(file)}`;
        const fileBuffer = await fs.readFile(file);

        const uploadParams = {
          Bucket: process.env.AWS_BUCKET_NAME as string,
          Key: fileName,
          Body: fileBuffer,
          ContentType: "image/png",
        };

        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);

        return `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      });

      const s3URLs = await Promise.all(uploadPromises);

      // Update resource with image URLs
      const updatedResource = await Resource.findByIdAndUpdate(
        resourceId,
        { content: JSON.stringify(s3URLs) },
        { new: true }
      );

      if (!updatedResource) {
        return res.status(404).send("Resource not found.");
      }

      console.log("File processing and uploads completed successfully.");
      res.json({
        message: "Files processed and uploaded successfully.",
        imageUrls: s3URLs,
        numberOfImages: s3URLs.length,
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).send("Error processing file.");
    } finally {
      // Clean up temporary files
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
);
// Handle POST request to /resources/uploads/assignment/enroll
router.post(
  "/uploads/assignment/enroll",
  async (req: Request, res: Response) => {
    const { sessionId, action, participantId, participantIds } = req.body;

    if (!sessionId || !action) {
      return res
        .status(400)
        .json({ error: "Session ID and action are required" });
    }

    try {
      // Fetch the Paper by sessionId
      const resource = await Resource.findOne({ sessionId });

      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }
      // @ts-ignore
      let updatedParticipants = JSON.parse(resource.participants || "[]");

      if (action === "ACCEPT") {
        // Accept a single participant
        if (!participantId) {
          return res
            .status(400)
            .json({ error: "Participant ID is required for accept" });
        }

        // Fetch and enroll participant
        const participant = await User.findById(participantId);
        if (participant) {
          updatedParticipants.push({
            userId: participantId,
            requestStatus: "ENROLLED",
            requestedDate: new Date(),
            participantName: participant.personalInfo.fullName,
            resourceResponses: [],
          });
        }
      } else if (action === "REJECT") {
        // Reject a single participant
        if (!participantId) {
          return res
            .status(400)
            .json({ error: "Participant ID is required for reject" });
        }

        // Remove participant from the list
        updatedParticipants = updatedParticipants.filter(
          (p: { userId: any }) => p.userId !== participantId
        );
      } else if (action === "ACCEPT_ALL") {
        // Accept all participants
        if (!participantIds || !Array.isArray(participantIds)) {
          return res
            .status(400)
            .json({ error: "Participant IDs are required for accept all" });
        }

        for (const id of participantIds) {
          const participant = await User.findById(id);
          if (participant) {
            updatedParticipants.push({
              userId: id,
              requestStatus: "ENROLLED",
              requestedDate: new Date(),
              participantName: participant.personalInfo.fullName,
              resourceResponses: [],
            });
          }
        }
      }

      // Remove duplicates by userId (in case of multiple accepts)
      const uniqueParticipants = Array.from(
        new Map(
          updatedParticipants.map((p: { userId: any }) => [p.userId, p])
        ).values()
      );

      // Update resource participants
      resource.participants = JSON.stringify(uniqueParticipants);
      await resource.save();

      res.json({
        message: "Participant data updated successfully",
        participants: uniqueParticipants,
      });
    } catch (error) {
      console.error("Error processing participant data:", error);
      res
        .status(500)
        .json({ error: "An error occurred while processing participant data" });
    }
  }
);

router.post("/uploads/assignment/participant", async (req, res) => {
  const { sessionId, userId } = req.body;

  // Validate input data
  if (!sessionId || !userId) {
    return res
      .status(400)
      .json({ error: "Session ID and User ID are required" });
  }

  try {
    // Fetch the resource and participant concurrently
    const [resource, participant] = await Promise.all([
      Resource.findOne({ sessionId }),
      User.findById(userId),
    ]);

    // Check if resource exists
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Ensure participant exists
    if (!participant) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse the participants list if it exists, or initialize an empty array
    let resourceParticipants = [];
    if (resource.participants && resource.participants.length) {
      resourceParticipants = JSON.parse(resource.participants);
    }

    // Prevent adding more than 50 participants
    if (resourceParticipants.length >= 50) {
      return res.status(400).json({ error: "Cannot add more participants" });
    }

    // Check if participant already exists in the resource
    const userExists = resourceParticipants.some(
      (p: { userId: any }) => p.userId === userId
    );
    if (userExists) {
      return res.json({ message: "Participant already exists", userId });
    }

    // Create participant details
    const participantDetails = {
      sessionId,
      userId,
      requestedDate: new Date(),
      requestStatus: "PENDING",
      participantName: participant.personalInfo.fullName,
      resourceResponses: [],
    };

    // Add new participant
    resourceParticipants.push(participantDetails);
    resource.participants = JSON.stringify(resourceParticipants);

    // Save the updated resource
    await resource.save();

    // Respond with success
    res.json({ message: "Participant added successfully", participantDetails });
  } catch (error) {
    console.error("Error processing participant data:", error);
    res.status(500).json({ error: "An error occurred while processing data" });
  }
});

router.post("/uploads/task/update", async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log("Session ID:", sessionId);

  // Validate sessionId in the query string
  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  // Extract the body data sent by the client
  const { wipeParticipants, assignmentDuration, assignmentDeadline } = req.body;

  // Validate if the required fields are provided
  if (!wipeParticipants || !assignmentDuration || !assignmentDeadline) {
    return res.status(400).json({
      error: "Task date, start time, duration, and end time are required.",
    });
  }

  try {
    // Find the resource by sessionId
    const resource = await Resource.findOne({ sessionId });

    // Check if resource exists
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Parse the content to extract assignmentMetaInfo
    let content = JSON.parse(resource.content);
    let assignmentMetaInfo = JSON.parse(content.assignmentMetaInfo);
    function formatDate(input: string) {
      // Convert the input date string into a format that the Date object can parse
      const dateStr = input.replace(
        /(\w+)\s(\d+)\s(\w+)\s(\d+)\sat\s(\d+:\d+)/,
        "$2 $3 $4 $5"
      );

      // Parse the adjusted date string
      const date = new Date(dateStr);

      // Check for invalid date
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      // Set formatting options without the 'timeZoneName'
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      };

      // Format the date
      const formattedDate = date.toLocaleString("en-US", options);

      // Append the timezone (e.g., GMT+3) manually
      const timeZoneOffset = "+3";
      return `${formattedDate} GMT${timeZoneOffset}`;
    }

    // Example usage
    const dateString = assignmentDeadline;
    const formattedDateString = formatDate(dateString);
    // Update the task metadata fields with the new values
    assignmentMetaInfo.assignmentDuration = assignmentDuration;
    assignmentMetaInfo.assignmentDeadline = formattedDateString;

    // Save the updated assignmentMetaInfo back to the content
    content.assignmentMetaInfo = JSON.stringify(assignmentMetaInfo);

    // Update the resource content with the modified content
    resource.content = JSON.stringify(content);
    if (wipeParticipants === "Yes") {
      resource.participants = "[]";
    }

    // Save the updated resource to the database
    await resource.save();

    // Respond with success
    res.json({
      message: "Assignment information updated successfully",
      resource,
    });
  } catch (error) {
    console.error("Error updating resource:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
});

router.post("/uploads/exam/update", async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log("Session ID:", sessionId);

  // Validate sessionId in the query string
  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required" });
  }

  // Extract the body data sent by the client
  const {
    examDate,
    examStartTime,
    wipeParticipants,
    examDuration,
    examEndTime,
  } = req.body;

  // Validate if the required fields are provided
  if (
    !examDate ||
    !examStartTime ||
    !wipeParticipants ||
    !examDuration ||
    !examEndTime
  ) {
    return res.status(400).json({
      error: "Exam date, start time, duration, and end time are required.",
    });
  }

  try {
    // Find the resource by sessionId
    const resource = await Resource.findOne({ sessionId });

    // Check if resource exists
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Parse the content to extract examMetaInfo
    let content = JSON.parse(resource.content);
    let examMetaInfo = JSON.parse(content.examMetaInfo);

    // Update the exam metadata fields with the new values
    examMetaInfo.examDate = examDate;
    examMetaInfo.examStartTime = examStartTime;
    examMetaInfo.examDuration = examDuration;
    examMetaInfo.examEndTime = examEndTime;

    // Save the updated examMetaInfo back to the content
    content.examMetaInfo = JSON.stringify(examMetaInfo);

    // Update the resource content with the modified content
    resource.content = JSON.stringify(content);
    if (wipeParticipants === "Yes") {
      resource.participants = "[]";
    }

    // Save the updated resource to the database
    await resource.save();

    // Respond with success
    res.json({
      message: "Exam meta information updated successfully",
      resource,
    });
  } catch (error) {
    console.error("Error updating resource:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
});

router.post("/uploads/exam/text", async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, questionType } = req.query;
    const responseObject = req.body; // Capture the JSON payload

    // Log received query parameters
    console.log("Received query parameters:", {
      sessionId,
      userId,
      questionType,
    });

    // Fetch resource and participant concurrently
    const [resource, participant] = await Promise.all([
      Resource.findOne({ sessionId }),
      User.findById(userId),
    ]);

    if (!resource) {
      console.error("Resource not found with sessionId:", sessionId);
      return res.status(404).json({ error: "Resource not found" });
    }

    if (!participant) {
      console.error("User not found with userId:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    // Log participant details and responses
    let resourceParticipants = JSON.parse(resource.participants || "[]");
    const participantIndex = resourceParticipants.findIndex(
      (p: any) => p.userId === userId
    );

    if (participantIndex === -1) {
      console.error("Participant not found in resource for userId:", userId);
      return res.status(404).json({ error: "Participant not found" });
    }

    // Check if response for this questionType already exists
    const existingResponseIndex = resourceParticipants[
      participantIndex
    ].resourceResponses.findIndex(
      (response: any) => response.questionType === questionType
    );

    if (existingResponseIndex !== -1) {
      // Overwrite the existing response
      resourceParticipants[participantIndex].resourceResponses[
        existingResponseIndex
      ] = responseObject;
      console.log(`Response for questionType ${questionType} overwritten.`);
    } else {
      // Add new response
      resourceParticipants[participantIndex].resourceResponses.push(
        responseObject
      );
      console.log(`New response for questionType ${questionType} added.`);
    }

    // Update and save the resource
    resource.participants = JSON.stringify(resourceParticipants);
    await resource.save();
    console.log("Resource updated successfully.");

    res.json({ message: "File uploaded and response saved", responseObject });
  } catch (error) {
    console.error("Error processing request:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
  }
});

// Define the route for handling file or text submission
router.post(
  "/uploads/task/response",
  contentUpload.array("files", 10), // Allow multiple files
  async (req: Request, res: Response) => {
    //@ts-ignore
    const { sessionId, userId, questionType } = {
      ...req.query, // check query parameters
      ...req.body, // check body parameters
    };

    // Log received parameters
    console.log("Received parameters:", {
      sessionId,
      userId,
      questionType,
    });

    // Validate input
    if (!sessionId || !userId || !questionType) {
      console.error("Missing required parameters.");
      return res.status(400).json({
        error: "Session ID, User ID, and Question Type are required",
      });
    }

    const [resource, participant] = await Promise.all([
      Resource.findOne({ sessionId }),
      User.findById(userId),
    ]);

    if (!resource || !participant) {
      return res
        .status(404)
        .json({ error: "Resource or participant not found" });
    }

    // Check if the content type is multipart/form-data (indicating a file upload)
    if (req.is("multipart/form-data")) {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      try {
        const uploadPromises = files.map(async (file) => {
          const fileExtension = path.extname(file.originalname).toLowerCase();

          if (![".jpg", ".jpeg", ".png", ".pdf"].includes(fileExtension)) {
            throw new Error("Only image or PDF files are allowed");
          }

          const fileName = `${uuidv4()}-${file.originalname}`;
          const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME as string,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          const command = new PutObjectCommand(uploadParams);
          await s3Client.send(command);

          const fileUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
          return fileUrl;
        });

        const uploadedFiles = await Promise.all(uploadPromises);
        const s3URL = uploadedFiles[0];

        const responseObject = {
          questionType,
          questionResponse: s3URL,
          savedDate: Date.now(),
        };

        let resourceParticipants = JSON.parse(resource.participants || "[]");
        const participantIndex = resourceParticipants.findIndex(
          (p: any) => p.userId === userId
        );

        if (participantIndex === -1) {
          console.error(
            "Participant not found in resource for userId:",
            userId
          );
          return res.status(404).json({ error: "Participant not found" });
        }

        const existingResponseIndex = resourceParticipants[
          participantIndex
        ].resourceResponses.findIndex(
          (response: any) => response.questionType === questionType
        );

        if (existingResponseIndex !== -1) {
          resourceParticipants[participantIndex].resourceResponses[
            existingResponseIndex
          ] = responseObject;
        } else {
          resourceParticipants[participantIndex].resourceResponses.push(
            responseObject
          );
        }

        // Update the resource in the database
        // Update and save the resource
        resource.participants = JSON.stringify(resourceParticipants);
        await resource.save();
        console.log("Resource updated successfully.");

        return res.json({
          message: "File uploaded and response saved",
          responseObject,
        });
      } catch (error) {
        console.error("Error uploading files:", error);
        return res.status(500).json({ error: "File upload failed" });
      }
    }

    // Handle JSON text submission (application/json)
    if (req.is("application/json")) {
      try {
        const { questionResponse, savedDate } = req.body;

        if (!questionResponse || !savedDate) {
          return res.status(400).json({ error: "Invalid JSON data" });
        }

        const responseObject = {
          questionType,
          questionResponse: questionResponse,
          savedDate: Date.now(),
        };

        let resourceParticipants = JSON.parse(resource.participants || "[]");
        const participantIndex = resourceParticipants.findIndex(
          (p: any) => p.userId === userId
        );

        if (participantIndex === -1) {
          console.error(
            "Participant not found in resource for userId:",
            userId
          );
          return res.status(404).json({ error: "Participant not found" });
        }

        const existingResponseIndex = resourceParticipants[
          participantIndex
        ].resourceResponses.findIndex(
          (response: any) => response.questionType === questionType
        );

        if (existingResponseIndex !== -1) {
          resourceParticipants[participantIndex].resourceResponses[
            existingResponseIndex
          ] = responseObject;
        } else {
          resourceParticipants[participantIndex].resourceResponses.push(
            responseObject
          );
        }
        // Update and save the resource
        resource.participants = JSON.stringify(resourceParticipants);
        await resource.save();
        console.log("Resource updated successfully.");

        return res.json({
          message: "Task response saved successfully",
          responseObject,
        });
      } catch (error) {
        console.error("Error processing JSON submission:", error);
        return res.status(500).json({ error: "An error occurred" });
      }
    }

    return res.status(400).json({
      error: "Unsupported content type. Please upload files or send JSON data.",
    });
  }
);

router.post(
  "/uploads/exam/attempt",
  contentUpload.array("files", 1),
  async (req: Request, res: Response) => {
    const { sessionId, userId, questionType } = req.query;

    // Log received query parameters
    console.log("Received query parameters:", {
      sessionId,
      userId,
      questionType,
    });
    console.log("Request files:", req.files);
    const files = req.files as Express.Multer.File[];

    // Validate input
    if (!sessionId || !userId || !questionType) {
      console.error("Missing required query parameters.");
      return res.status(400).json({
        error: "Session ID, User ID, and Question Type are required",
      });
    }

    // Check if files were uploaded
    if (!files || files.length === 0) {
      console.error("No files uploaded.");
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      // Log start of database queries
      console.log("Fetching resource and participant from the database...");

      const [resource, participant] = await Promise.all([
        Resource.findOne({ sessionId }),
        User.findById(userId),
      ]);

      if (!resource) {
        console.error("Resource not found with sessionId:", sessionId);
        return res.status(404).json({ error: "Resource not found" });
      }

      if (!participant) {
        console.error("User not found with userId:", userId);
        return res.status(404).json({ error: "User not found" });
      }

      const uploadedFile = files[0];
      const fileExtension = path
        .extname(uploadedFile.originalname)
        .toLowerCase();

      // Only allow images or PDFs
      if (![".jpg", ".jpeg", ".png", ".pdf"].includes(fileExtension)) {
        console.error("Invalid file type uploaded:", fileExtension);
        return res
          .status(400)
          .json({ error: "Only image or PDF files are allowed" });
      }

      // Determine content type (image or PDF)
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
      const s3URL = fileUrls[0];

      console.log("File uploaded to S3, URL:", s3URL);

      // Create the response object
      const responseObject = {
        questionType,
        questionResponse: s3URL,
        savedDate: Date.now(),
      };

      // Log participant details and responses
      let resourceParticipants = JSON.parse(resource.participants || "[]");
      const participantIndex = resourceParticipants.findIndex(
        (p: any) => p.userId === userId
      );

      if (participantIndex === -1) {
        console.error("Participant not found in resource for userId:", userId);
        return res.status(404).json({ error: "Participant not found" });
      }

      // Check if response for this questionType already exists
      const existingResponseIndex = resourceParticipants[
        participantIndex
      ].resourceResponses.findIndex(
        (response: any) => response.questionType === questionType
      );

      if (existingResponseIndex !== -1) {
        // Overwrite the existing response
        resourceParticipants[participantIndex].resourceResponses[
          existingResponseIndex
        ] = responseObject;
        console.log(`Response for questionType ${questionType} overwritten.`);
      } else {
        // Add new response
        resourceParticipants[participantIndex].resourceResponses.push(
          responseObject
        );
        console.log(`New response for questionType ${questionType} added.`);
      }

      // Update and save the resource
      resource.participants = JSON.stringify(resourceParticipants);
      await resource.save();
      console.log("Resource updated successfully.");

      res.json({ message: "File uploaded and response saved", responseObject });
    } catch (error) {
      console.error("Error processing request:", error);
      res
        .status(500)
        .json({ error: "An error occurred while processing the request" });
    }
  }
);

router.post("/uploads/exam/participant", async (req, res) => {
  const { sessionId, userId } = req.body;

  // Validate input
  if (!sessionId || !userId) {
    return res
      .status(400)
      .json({ error: "Session ID and User ID are required" });
  }

  try {
    // Fetch the resource and participant concurrently
    const [resource, participant] = await Promise.all([
      Resource.findOne({ sessionId }),
      User.findById(userId),
    ]);

    // Check if resource exists
    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Check if participant exists
    if (!participant) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse participants if it exists, otherwise initialize an empty array
    let resourceParticipants = resource.participants.length
      ? JSON.parse(resource.participants)
      : [];

    // Prevent adding more than 50 participants
    if (resourceParticipants.length >= 50) {
      return res.status(400).json({ error: "Cannot add more participants" });
    }

    // Check if participant already exists
    const userExists = resourceParticipants.some(
      (p: { userId: any }) => p.userId === userId
    );
    if (userExists) {
      return res.json({ message: "Participant already exists", userId });
    }

    // Create participant details
    const participantDetails = {
      sessionId,
      userId,
      requestedDate: new Date(),
      requestStatus: "PENDING",
      participantName: participant.personalInfo.fullName,
      resourceResponses: [],
    };

    // Add new participant to the array
    resourceParticipants.push(participantDetails);
    resource.participants = JSON.stringify(resourceParticipants);

    // Save updated resource
    await resource.save();

    // Respond with success
    res.json({ message: "Participant added successfully", participantDetails });
  } catch (error) {
    console.error("Error processing participant data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the request" });
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
