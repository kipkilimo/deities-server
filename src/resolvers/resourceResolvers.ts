import { IResource } from "../models/Resource";
import Resource from "../models/Resource";
import { generateUniqueCode } from "../utils/identifier_generator";
import generateAccessKey from "../utils/accessKeyUtility";
const cron = require("node-cron");


/*
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
    // getUserTasks(userId: string) {
    async getUserTasks(_: any, { userId }: { userId: string }) {
      console.log({ userId });

      // Step 1: Fetch the latest 12 tasks created by the user with contentType = "TASK"
      let tasks = await Resource.find({
        createdBy: userId,
        contentType: "TASK",
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

      // Step 2: If no tasks are found, search for tasks where userId is in the participants array
      if (!tasks || tasks.length === 0) {
        tasks = await Resource.find({
          contentType: "TASK",
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

      // Step 3: Parse the content field and look for userId in participants within the JSON
      // @ts-ignore
      tasks = tasks.map((task) => {
        const parsedContent = JSON.parse(task.content); // Parse the stringified content
        console.log({ parsedContent: parsedContent.examMetaInfo });

        if (parsedContent && parsedContent.participants) {
          const participants = parsedContent.participants; // Extract participants array from JSON content
          if (participants.includes(userId)) {
            // If userId is found in participants, continue processing
            console.log(`User ${userId} is in participants`);
          } else {
            // If userId is not in participants, discard this task
            console.log(
              `User ${userId} is not in participants, excluding task`
            );
            return null;
          }

          // @ts-ignore
          task.examMetaInfo = JSON.parse(parsedContent.examMetaInfo); // Extract and parse examMetaInfo
        }
        return task;
      });

      // Filter out any null tasks (i.e., tasks where userId is not in participants)
      tasks = tasks.filter((task) => task !== null);

      // Return the latest tasks or null if none found
      return tasks;
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
              _id: { month: { $month: "$createdAt" } }, // Extract month from createdAt
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.month": 1 } },
        ]);

        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

        // Format publication trends to a readable format
        const formattedPublicationTrends = publicationTrends
          .map((item) => {
            const monthIndex = item._id.month - 1;
            if (monthIndex >= 0 && monthIndex < monthNames.length) {
              const month = monthNames[monthIndex].slice(0, 3); // Use short month name
              return { period: month, count: item.count };
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
