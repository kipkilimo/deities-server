import { IResource } from "../models/Resource";
import Resource from "../models/Resource";
import { generateUniqueCode } from "../utils/identifier_generator";
import generateAccessKey from "../utils/accessKeyUtility";

import { DateTime } from "luxon";
const cron = require("node-cron");

/*
cron.schedule("*\/15 * * * * *", async () => {
  try {
    // Update all documents
    const result = await Resource.updateMany(
      {}, // No filter means all documents will be updated
      {
        $set: {
          reviews: "[]", // Set reviews field to an empty array
        },
      }
    );

    console.log(`Updated ${result.modifiedCount} items.`); // Use modifiedCount for a better understanding of the result
  } catch (err) {
    console.error("Error updating items:", err);
  }
});
cron.schedule("*\/15 * * * * *", async () => {
  try {
    const result = await Resource.deleteMany({ contentType: "TASK" });
    console.log(`Deleted ${result.deletedCount} items.`);
  } catch (err) {
    console.error("Error deleting items:", err);
  }
});


cron.schedule("*\/15 * * * * *", async () => {
  try {
    // Update all documents
    const result = await Resource.updateMany(
      {}, // No filter means all documents will be updated
      { $set: { participants: "[]" } } // Update participants field
    );

    console.log(`Updated ${JSON.stringify(result)} items.`);
  } catch (err) {
    console.error("Error updating items:", err);
  }
});
// "contentType": "PRESENTATION",




  id: ID!
  title: String!
  objective: String!
  url: String
  sessionId: String
  discussion: [Discussion]
  createdDate: String 
  createdBy:User!
  
  */
// Define the type for the arguments expected in the createResource resolver
// Define the input type for the resolver
interface IGetResourcesArgs {
  subject?: string;
  topic?: string;
  title?: string;
  contentType?: string; // Or use the enum ResourceType if imported
  targetRegion?: string;
  language?: string;
  createdBy?: string; // or Types.ObjectId if you use ObjectId
}
const resourceResolver = {
  Mutation: {
    async createResource(
      _: any,
      {
        title,
        description,
        targetRegion,
        targetCountry,
        language,
        subject,
        keywords,
        topic,
        contentType,
        createdBy,
      }: IResource
    ) {
      try {
        // Log the provided arguments for debugging
        const sessionIdStr = generateUniqueCode(11);
        const accessKeyStr = generateAccessKey();

        // Create a new resource document with the provided fields
        const resource = new Resource({
          title,
          description,
          targetRegion,
          subject,
          topic,
          targetCountry,
          language,
          keywords,
          contentType,
          sessionId: sessionIdStr,
          accessKey: accessKeyStr,
          createdBy,
        });

        // Save the new resource document to the database
        await resource.save();

        // Return the created resource document
        return resource;
      } catch (error) {
        console.error("Error creating resource:", error);
        throw new Error("Failed to create resource");
      }
    },
    // addResourceFormContent(resourceDetails: String!): Resource!
    async addResourceFormContent(
      _: any,
      { resourceDetails }: { resourceDetails: string }
    ) {
      try {
        // Parse the incoming JSON string to an object
        const paramsArray = JSON.parse(resourceDetails);
        const params = paramsArray[0];

        const { resourceId, resourceContent } = params;

        // Find the resource by its ID
        const resource = await Resource.findOne({ _id: resourceId });
        if (!resource) {
          throw new Error("Resource not found");
        }

        // Update the content of the found resource
        resource.content = resourceContent;

        // Save the updated resource back to the database
        await resource.save();

        // Return the updated resource document
        return resource;
      } catch (error) {
        console.error("Error updating resource:", error);
        throw new Error("Failed to update resource");
      }
    },
    async updateResource(
      _: any,
      {
        id,
        title,
        description,
        content,
        targetRegion,
        subject,
        topic,
        targetCountry,
        slug,
        language,
        contentType,
        viewsNumber,
        likesNumber,
        sharesNumber,
        rating,
        sessionId,
        accessKey,
        keywords,
        coverImage,
        isPublished,
        averageRating,
        reviews,
      }: IResource
    ) {
      try {
        // Log the provided arguments for debugging
        console.log({
          id,
          title,
          description,
          content,
          targetRegion,
          targetCountry,
          slug,
          language,
          contentType,
          viewsNumber,
          likesNumber,
          sharesNumber,
          rating,
          sessionId,
          accessKey,
          keywords,
          coverImage,
          isPublished,
          averageRating,
          reviews,
        });

        // Find the resource by ID and update it with the provided fields
        const updatedResource = await Resource.findByIdAndUpdate(
          id,
          {
            ...(title && { title }),
            ...(description && { description }),
            ...(content && { content }),
            ...(targetRegion && { targetRegion }),
            ...(targetCountry && { targetCountry }),
            ...(slug && { slug }),

            ...(subject && { subject }),
            ...(topic && { topic }),

            ...(language && { language }),
            ...(contentType && { contentType }),
            ...(viewsNumber !== undefined && { viewsNumber }),
            ...(likesNumber !== undefined && { likesNumber }),
            ...(sharesNumber !== undefined && { sharesNumber }),
            ...(rating && { rating }),
            ...(sessionId && { sessionId }),
            ...(accessKey && { accessKey }),
            ...(keywords && { keywords }),
            ...(coverImage && { coverImage }),
            ...(isPublished !== undefined && { isPublished }),
            ...(averageRating !== undefined && { averageRating }),
            ...(reviews && { reviews }),
          },
          { new: true, runValidators: true }
        );

        if (!updatedResource) {
          throw new Error("Resource not found");
        }

        // Return the updated resource document
        return updatedResource;
      } catch (error) {
        console.error("Error updating resource:", error);
        throw new Error("Failed to update resource");
      }
    },
    async deleteResource(_: any, { id }: { id: string }) {
      const resource = await Resource.findByIdAndDelete(id);
      return resource;
    },

    //   (resourceId: ID!, discussionItem: String!): Resource

    //   (
    //     id: ID!
    //     title: String
    //     objective: String
    //     createdDate: String
    //   ): Resource
    //   deleteResource(id: ID!): Resource
    // }
    //   async deleteResource(_: any, { id }: { id: string }) {
    //     const resource = await Resource.findByIdAndDelete(id);
    //     return resource;
    //   },
  },
  Query: {
    async getUserTasks(_: any, { userId }: { userId: string }) {
      // Step 1: Calculate the timestamp for one month ago (30 days in milliseconds)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Step 2: Fetch tasks created in the past month with contentType = "TASK"
      const tasks = await Resource.find({
        contentType: "TASK",
        createdAt: {
          $gte: oneMonthAgo, // Compare directly with the Date object
        },
      })
        .populate({
          path: "createdBy",
          model: "User",
          select: {
            id: 1,
            personalInfo: {
              username: 1,
              fullName: 1,
              email: 1,
              scholarId: 1,
              activationToken: 1,
              resetToken: 1,
              tokenExpiry: 1,
              activatedAccount: 1,
            },
            role: 1,
          },
        })
        .sort({ createdAt: -1 });

      // Step 3: Filter tasks where userId is in participants and has "ENROLLED" status
      const filteredTasks = tasks.filter(
        (task: { participants: string; _id: any }) => {
          try {
            const participants = JSON.parse(task.participants); // Parse the participants once to extract participants

            // Check if participants is an array and userId exists with "ENROLLED" status
            return participants.some(
              (participant: { userId: string; requestStatus: string }) =>
                participant.userId === userId &&
                participant.requestStatus === "ENROLLED"
            );
          } catch (error) {
            console.error(
              `Error parsing task content for task ${task._id}:`,
              error
            );
            return false; // Exclude the task if there's an error
          }
        }
      );

      console.log({ filteredTasks });

      // Step 4: Return the filtered tasks or an empty array if none found
      return filteredTasks;
    },
    async getPublisherLatestTasks(_: any, { userId }: { userId: string }) {
      console.log("Fetching latest tasks for user:", userId);

      try {
        // Step 1: Fetch the latest 12 assignments created by the user with contentType = "TASK"
        let assignments = await Resource.find({
          createdBy: userId,
          contentType: "TASK",
        })
          .sort({ createdAt: -1 })
          .limit(12)
          .populate({
            path: "createdBy",
            model: "User",
            select: {
              id: 1,
              personalInfo: {
                username: 1,
                fullName: 1,
                email: 1,
                scholarId: 1,
                activationToken: 1,
                resetToken: 1,
                tokenExpiry: 1,
                activatedAccount: 1,
              },
              role: 1,
            },
          });

        console.log("Step 1 assignments fetched:", assignments.length);

        // Step 2: If no assignments are found, search for assignments where userId is in the participants array
        if (!assignments || assignments.length === 0) {
          console.log(
            "No assignments found. Searching for participant assignments..."
          );
          assignments = await Resource.find({
            contentType: "TASK",
            participants: userId,
          })
            .sort({ createdAt: -1 })
            .limit(12)
            .populate({
              path: "createdBy",
              model: "User",
              select: {
                id: 1,
                personalInfo: {
                  username: 1,
                  fullName: 1,
                  email: 1,
                  scholarId: 1,
                  activationToken: 1,
                  resetToken: 1,
                  tokenExpiry: 1,
                  activatedAccount: 1,
                },
                role: 1,
              },
            });

          console.log(
            "Step 2 participant assignments fetched:",
            assignments.length
          );
        }

        // Step 3: Parse the content and populate assignmentMetaInfo fields
        // @ts-ignore
        assignments = assignments.map((assignment) => {
          try {
            const parsedContent = JSON.parse(assignment.content || "{}"); // Parse the stringified content
            const metaInfo = parsedContent.assignmentMetaInfo
              ? JSON.parse(parsedContent.assignmentMetaInfo)
              : {}; // Parse assignmentMetaInfo if it exists

            console.log("Parsed assignmentMetaInfo:", metaInfo);

            // Merge parsed meta info with the top-level fields into the final assignment object
            return {
              id: assignment.id,
              title: assignment.title,
              coverImage: assignment.coverImage,
              description: assignment.description,
              subject: assignment.subject,
              topic: assignment.topic,
              createdBy: assignment.createdBy,
              createdAt: assignment.createdAt,
              sessionId: assignment.sessionId,
              accessKey: assignment.accessKey,
              participants: assignment.participants,

              // Fields from assignmentMetaInfo
              assignmentType: metaInfo.assignmentType || null,
              assignmentTitle: metaInfo.assignmentTitle || null,
              assignmentDescription: metaInfo.assignmentDescription || null,
              assignmentDuration: metaInfo.assignmentDuration || null,
              assignmentDeadline: metaInfo.assignmentDeadline || null,
              assignmentAnswersKey: parsedContent.assignmentAnswersKey
                ? JSON.parse(parsedContent.assignmentAnswersKey)
                : null, // Parse answers key as array
              assignmentTaskSet: parsedContent.assignmentTaskSet
                ? JSON.parse(parsedContent.assignmentTaskSet)
                : null, // Parse task set as array
            };
          } catch (error) {
            console.error(
              "Error parsing content for assignment:",
              assignment.id,
              error
            );
            return assignment;
          }
        });

        // Return the processed assignments or null if none found
        console.log(
          "Assignments processed and ready to return:",
          assignments.length
        );
        return assignments;
      } catch (error) {
        console.error("Error fetching tasks for user:", userId, error);
        throw new Error("Failed to fetch latest tasks");
      }
    },
    async getCurrentExam(_: any, { sessionId }: { sessionId: string }) {
      console.log({ sessionId });

      // Step 1: Fetch the latest 12 exams created by the user with contentType = "TEST"
      let exams = await Resource.find({
        sessionId,
        contentType: "TEST",
      })
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order
        .limit(12) // Limit the results to the last 12 items
        .populate({
          path: "createdBy",
          model: "User",
          select: {
            id: 1,
            personalInfo: {
              username: 1,
              fullName: 1,
              email: 1,
              scholarId: 1,
              activationToken: 1,
              resetToken: 1,
              tokenExpiry: 1,
              activatedAccount: 1,
            },
            role: 1,
          },
        });

      if (exams.length === 0) return null; // Return null if no exams are found

      const currentExam = exams[0]; // Select the latest exam for processing
      console.log({ currentExam });

      // Step 2: Parse exam content and retrieve examMetaInfo for each exam
      const parsedContent = JSON.parse(currentExam.content);
      const examMetaInfo = JSON.parse(parsedContent.examMetaInfo);
      console.log({ parsedContent, examMetaInfo });

      // Populate question set and answer key within examMetaInfo
      examMetaInfo.examAnswersKey = JSON.parse(parsedContent.examAnswersKey);
      examMetaInfo.examQuestionsSet = JSON.parse(
        parsedContent.examQuestionsSet
      );

      // Step 3: Parse exam date and start time
      const { DateTime } = require("luxon");
      // @ts-ignore
      function getCurrentMillisFromExamTime(examStartTime) {
        // Split the exam start time into hours, minutes, and timezone
        const [time, timezone] = examStartTime.split(" ");
        const [hour, minute] = time.split(":").map(Number);

        // Create a DateTime object for the given time today in the specified timezone
        const now = DateTime.now().setZone(timezone);
        const examTime = DateTime.fromObject(
          { hour, minute },
          { zone: timezone }
        ).set({ year: now.year, month: now.month, day: now.day });

        // Get current time in milliseconds
        const currentMillis = DateTime.now().toMillis();

        return { currentMillis, examTimeMillis: examTime.toMillis() };
      }

      // Example usage
      const examStartTime = examMetaInfo.examStartTime;
      const { currentMillis, examTimeMillis } =
        getCurrentMillisFromExamTime(examStartTime);

      function parseDurationToMillis(durationString: string) {
        // Use a regular expression to match hours and minutes
        const regex = /(\d+)\s*hrs?\s*:\s*(\d+)\s*mins?/;
        const match = durationString.match(regex);

        if (!match) {
          throw new Error("Invalid duration format");
        }

        // Extract hours and minutes from the matched groups
        const hours = parseInt(match[1], 10) || 0;
        const minutes = parseInt(match[2], 10) || 0;

        // Convert hours and minutes to milliseconds
        const totalMillis = hours * 60 * 60 * 1000 + minutes * 60 * 1000;
        return totalMillis;
      }

      // Example usage
      const durationString = examMetaInfo.examDuration; // "3 hrs : 0 mins";
      const examEndTime =
        parseDurationToMillis(durationString) + examTimeMillis;

      // Step 6: Check if the current time falls within the exam time window
      const isCurrentTimeInRange =
        currentMillis >= examTimeMillis && currentMillis <= examEndTime;

      console.log({ examTimeMillis, currentMillis, examEndTime });
      console.log("Is current time in range:", isCurrentTimeInRange);

      const exams2 = exams.map((exam) => {
        const parsedContent = JSON.parse(exam.content); // Parse the stringified content
        console.log({ parsedContent: parsedContent.examMetaInfo });
        if (parsedContent) {
          // @ts-ignore
          exam.examMetaInfo = JSON.parse(parsedContent.examMetaInfo); // Extract and parse testMeta
          // Include the answers key and questions set inside examMetaInfo
          // @ts-ignore
          exam.examMetaInfo.examAnswersKey = JSON.parse(
            parsedContent.examAnswersKey
          );
          // @ts-ignore
          exam.examMetaInfo.examQuestionsSet = JSON.parse(
            parsedContent.examQuestionsSet
          );
        }
        return exam;
      });

      const currentExam2 = exams2[0];

      // Return the current exam based on time check
      return isCurrentTimeInRange ? currentExam2 : null;
    },

    async getPublisherLatestExams(_: any, { userId }: { userId: string }) {
      console.log({ userId });

      // Step 1: Fetch the latest 12 exams created by the user with contentType = "TEST"
      let exams = await Resource.find({
        createdBy: userId,
        contentType: "TEST",
      })
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order
        .limit(12) // Limit the results to the last 12 items
        .populate({
          path: "createdBy",
          model: "User",
          select: {
            id: 1,
            personalInfo: {
              username: 1,
              fullName: 1,
              email: 1,
              scholarId: 1,
              activationToken: 1,
              resetToken: 1,
              tokenExpiry: 1,
              activatedAccount: 1,
            },
            role: 1,
          },
        });

      // Step 2: If no exams are found, search for exams where userId is in the participants array
      if (!exams || exams.length === 0) {
        exams = await Resource.find({
          contentType: "TEST",
          participants: userId, // Search in participants array
        })
          .sort({ createdAt: -1 }) // Sort by createdAt in descending order
          .limit(12) // Limit the results to the last 12 items
          .populate({
            path: "createdBy",
            model: "User",
            select: {
              id: 1,
              personalInfo: {
                username: 1,
                fullName: 1,
                email: 1,
                scholarId: 1,
                activationToken: 1,
                resetToken: 1,
                tokenExpiry: 1,
                activatedAccount: 1,
              },
              role: 1,
            },
          });
      }
      exams = exams.map((exam) => {
        const parsedContent = JSON.parse(exam.content); // Parse the stringified content
        console.log({ parsedContent: parsedContent.examMetaInfo });
        if (parsedContent) {
          // @ts-ignore
          exam.examMetaInfo = JSON.parse(parsedContent.examMetaInfo); // Extract and parse testMeta
        }
        return exam;
      });
      // Return the latest exams or null if none found
      // console.log({ exams });
      return exams;
    },
    async getPublisherLatestPoll(_: any, { userId }: { userId: String }) {
      console.log({ userId });

      // Step 1: Fetch the latest poll created by the user
      let poll = await Resource.findOne({
        createdBy: userId,
        contentType: "POLL",
      })
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order
        .populate({
          path: "createdBy",
          model: "User",
          select: {
            id: 1,
            personalInfo: {
              username: 1,
              fullName: 1,
              email: 1,
              scholarId: 1,
              activationToken: 1,
              resetToken: 1,
              tokenExpiry: 1,
              activatedAccount: 1,
            },
            role: 1,
          },
        });

      // Step 2: If no poll is found, search for polls where userId is in participants array
      if (!poll) {
        poll = await Resource.findOne({
          contentType: "POLL",
          participants: userId, // Search in participants array
        })
          .sort({ createdAt: -1 }) // Sort by createdAt in descending order
          .populate({
            path: "createdBy",
            model: "User",
            select: {
              id: 1,
              personalInfo: {
                username: 1,
                fullName: 1,
                email: 1,
                scholarId: 1,
                activationToken: 1,
                resetToken: 1,
                tokenExpiry: 1,
                activatedAccount: 1,
              },
              role: 1,
            },
          });
      }

      // Return the latest poll or null if none found
      console.log({ poll });
      return poll;
    },
    //  async fetchComputingResource(topicParams: string)
    async fetchComputingResource(
      _: any,
      { topicParams }: { topicParams: string }
    ) {
      try {
        // Parse the incoming params
        const params = JSON.parse(topicParams);

        console.log({ resourceParamsLang: params.language });
        const queryLang = String(params.language);
        // Query for resources by title (matching topic) and populate creator information
        const resources = await Resource.find({
          title: params.topic, // Match topic with title
        }).populate({
          path: "createdBy",
          model: "User",
          select: {
            id: 1,
            personalInfo: {
              username: 1,
              fullName: 1,
              email: 1,
              scholarId: 1,
              activationToken: 1,
              resetToken: 1,
              tokenExpiry: 1,
              activatedAccount: 1,
            },
            role: 1,
          },
        });

        // Find the first resource that contains the specified language in its content
        const resourceRaw = resources.filter((resource) => {
          const content = JSON.parse(resource.content);
          return content.language === queryLang;
        });
        const resource = resourceRaw[0];
        // If resource is found, parse its content and return it
        if (resource) {
          const resourceR = JSON.parse(resource.content);
          return resource;
        } else {
          console.log("No resource found for the given language.");
          return null; // Return null or an appropriate error object
        }
      } catch (error) {
        console.error("Error fetching resource:", error);
        throw error; // Rethrow the error for proper handling
      }
    },
    async getResource(_: any, { id }: { id: string }) {
      // Fetch the resources from the database based on the filter
      const resource = await Resource.findOne({ _id: id }).populate({
        path: "createdBy",
        model: "User",
        select: {
          id: 1,
          personalInfo: {
            username: 1,
            fullName: 1,
            email: 1,
            scholarId: 1,
            activationToken: 1,
            resetToken: 1,
            tokenExpiry: 1,
            activatedAccount: 1,
          },
          role: 1,
        },
      });

      // Return the filtered resource
      return resource;
    },
    getQuestions: async (_: any, { resourceId }: { resourceId: string }) => {
      try {
        const resource = await Resource.findById(resourceId)
          .select("questions")
          .exec();
        if (!resource) {
          throw new Error("Resource not found");
        }
        return resource.questions;
      } catch (error) {
        throw new Error("Could not fetch questions");
      }
    },
    async getAllTaskResources(_: any) {
      try {
        // Build the filter object based on the provided arguments

        // Fetch the resources from the database based on the filter
        const resources = await Resource.find({ contentType: "TASK" }).populate(
          {
            path: "createdBy",
            model: "User",
            select: {
              id: 1,
              personalInfo: {
                username: 1,
                fullName: 1,
                email: 1,
                scholarId: 1,
                activationToken: 1,
                resetToken: 1,
                tokenExpiry: 1,
                activatedAccount: 1,
              },
              role: 1,
            },
          }
        );

        // Return the filtered resources
        return resources;
      } catch (error) {
        console.error("Error fetching resources:", error);
        throw new Error("Failed to fetch resources");
      }
    },
    async getAllResources(_: any, args: IGetResourcesArgs) {
      try {
        // Replace the following with actual database fetching logic
        const resources = await Resource.find();
        return resources;
      } catch (error) {
        throw new Error("Failed to fetch resources");
      }
    },
    async getAllSpecificTypeResources(
      _: unknown,
      { resourceType }: { resourceType: string }
    ): Promise<InstanceType<typeof Resource>[]> {
      try {
        const valsRaw = JSON.parse(resourceType);
        const vals = valsRaw[0];

        const reqParams = {
          resourceType: vals.resourceType,
          subject: vals.selectedSubject,
          topic: vals.selectedTopic,
          country: vals.selectedCountry,
          targetRegion: vals.selectedTargetRegion,
          language: vals.selectedLanguage,
        };
        console.log({ reqParams });

        // Initialize the query object with the required resourceType filter
        const query: Record<string, unknown> = {
          contentType: reqParams.resourceType,
        };

        // Conditionally add optional filters if they are provided
        if (reqParams.subject) {
          query.subject = reqParams.subject;
        }
        if (reqParams.topic) {
          query.topic = reqParams.topic;
        }
        if (reqParams.country) {
          // Use regex for partial and case-insensitive match
          query.country = { $regex: new RegExp(reqParams.country, "i") };
        }
        if (reqParams.targetRegion) {
          query.targetRegion = reqParams.targetRegion;
        }
        if (reqParams.language) {
          query.language = reqParams.language;
        }

        // Fetch the resources from the database based on the dynamically built query
        let resources = await Resource.find(query);

        // If no resources were found, perform a more general query
        if (resources.length === 0) {
          console.log("No specific resources found, fetching general items...");

          // General query: only resourceType filter is maintained
          const generalQuery: Record<string, unknown> = {
            contentType: reqParams.resourceType, // Ensure the resourceType filter is still applied
          };

          // Perform a general search with reduced criteria, ensuring resourceType is met
          resources = await Resource.find(generalQuery)
            .limit(3) // Limit to 3 results
            .exec(); // Execute the query and return the results
        }

        // Return the filtered or general resources
        return resources;
      } catch (error) {
        console.error("Error fetching resources:", error);
        throw new Error("Failed to fetch resources");
      }
    },
    // summary
    async fetchResourceSummaryByRoleAndType() {
      try {
        // Aggregation to count resources by contentType
        const resourceCountsPromise = Resource.aggregate([
          {
            $group: {
              _id: "$contentType",
              count: { $sum: 1 },
            },
          },
        ]);

        // Fetch most liked, most requested, and most recently created resources
        const [mostLikedResource, mostRequestedResource, mostCreatedResource] =
          await Promise.all([
            Resource.findOne()
              .sort({ likesNumber: -1 })
              .select("title likesNumber"),
            Resource.findOne()
              .sort({ viewsNumber: -1 })
              .select("title viewsNumber"),
            Resource.findOne({ createdAt: { $ne: null } }) // Ensure createdAt is not null
              .sort({ createdAt: -1 })
              .select("title createdAt"),
          ]);

        // Aggregation for publication trends by month (filtering out resources with null or missing createdAt)
        const publicationTrends = await Resource.aggregate([
          {
            $match: { createdAt: { $ne: null } }, // Filter out documents with null createdAt
          },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" }, // Extract year from createdAt
                month: { $month: "$createdAt" }, // Extract month from createdAt
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);

        // Check for null month values
        publicationTrends.forEach((item) => {
          if (item._id.month === null) {
            console.warn("Found a null month in publication trends", item);
          }
        });

        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        // Format publication trends to a readable format
        const formattedPublicationTrends = publicationTrends
          .map((item) => {
            const monthIndex = item._id.month ? item._id.month - 1 : -1; // Set to -1 if month is null
            const year = String(item._id.year).slice(-2); // Get last two digits of the year
            if (monthIndex >= 0 && monthIndex < monthNames.length) {
              const month = monthNames[monthIndex]; // Use short month name
              return { period: `${month} '${year}`, count: item.count }; // Format as 'Aug '24
            }
            return null;
          })
          .filter((item) => item !== null); // Remove null entries

        // Wait for the resource counts aggregation
        const resourceCounts = await resourceCountsPromise;

        // Create the summary object with counts for each content type
        const summary = resourceCounts.reduce((acc, { _id, count }) => {
          const key = `${_id.toLowerCase()}Count`; // Convert content type to a key like 'audioCount'
          acc[key] = count;
          return acc;
        }, {});

        // Add the additional properties for most liked, requested, and created resources
        summary.mostLikedResource = mostLikedResource;
        summary.mostRequestedResource = mostRequestedResource;
        summary.mostCreatedResource = mostCreatedResource;
        summary.publicationTrends = formattedPublicationTrends;

        console.log({ summary });

        return [summary]; // Return an array since the schema expects an array of ResourceSummary
      } catch (error) {
        console.error("Error in fetchResourceSummaryByRoleAndType:", error);
        throw error; // Propagate the error for handling
      }
    },

    async getResources(_: any, args: IGetResourcesArgs) {
      try {
        // Build the filter object based on the provided arguments
        const filter: Partial<IGetResourcesArgs> = {};

        // Add each of the 6 selected arguments to the filter if it is provided
        if (args.subject) filter.subject = args.subject;
        if (args.topic) filter.topic = args.topic;

        if (args.title) filter.title = args.title;
        if (args.contentType) filter.contentType = args.contentType;
        if (args.targetRegion) filter.targetRegion = args.targetRegion;
        if (args.language) filter.language = args.language;

        // Fetch the resources from the database based on the filter
        const resources = await Resource.find(filter).populate({
          path: "createdBy",
          model: "User",
        });

        // Return the filtered resources
        return resources;
      } catch (error) {
        console.error("Error fetching resources:", error);
        throw new Error("Failed to fetch resources");
      }
    },
  },
};

export default resourceResolver;
