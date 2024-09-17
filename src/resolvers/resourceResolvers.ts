import { IResource } from "../models/Resource";
import Resource from "../models/Resource";
import { generateUniqueCode } from "../utils/identifier_generator";
import generateAccessKey from "../utils/accessKeyUtility";
const cron = require("node-cron");

/*

// Cron job to run every 15 seconds
cron.schedule("*\/15 * * * * *", async () => {
  try {
    const result = await Resource.deleteMany({ contentType: "TASK" });
    console.log(`Deleted ${result.deletedCount} items.`);
  } catch (err) {
    console.error("Error deleting items:", err);
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
    // getPublisherLatestPoll({ userId: string })
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
