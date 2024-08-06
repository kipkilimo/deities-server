import { IPaper } from "../models/Paper";
import Paper from "../models/Paper";
import { generateUniqueCode } from "../utils/identifier_generator";

/*
  id: ID!
  title: String!
  objective: String!
  url: String
  sessionId: String
  discussion: [Discussion]
  createdDate: String 
  createdBy:User!
  
  */
const paperResolver = {
  Query: {
    async getPaper(_: any, { id }: { id: string }) {
      return await Paper.findById(id);
    },
    getMostRecentPaper: async () => {
      const today = new Date();
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(today.getDate() - 14);

      try {
        // Convert dates to milliseconds for comparison
        const fourteenDaysAgoMillis = fourteenDaysAgo.getTime();
        const todayMillis = today.getTime();

        // Fetch the most recent paper within the last 14 days, sorting by createdDate in descending order
        const mostRecentPaper = await Paper.findOne({
          createdDate: {
            $gte: fourteenDaysAgoMillis.toString(), // Use stringified milliseconds
            $lte: todayMillis.toString(), // Use stringified milliseconds
          },
        })
          .sort({ createdDate: -1 }) // Sort by createdDate in descending order
          .populate({
            path: "createdBy", // Populate the createdBy field
            model: "User", // Select specific fields from User if needed
            select: "id username email role", // Select only specific fields
          });

        console.log("success:", mostRecentPaper);

        return mostRecentPaper;
      } catch (error) {
        console.error("Error fetching the most recent paper:", error);
        throw new Error("Error fetching the most recent paper");
      }
    },
    getPapers: async () => {
      try {
        // Fetch papers with populated fields
        const papers = await Paper.find().populate({
          path: "createdBy", // Populate the createdBy field
          model: "User", // Select specific fields from User
        });

        return papers;
      } catch (error) {
        console.error("Error fetching papers:", error);
        throw new Error("Failed to fetch papers");
      }
    },
  },
  Mutation: {
    async createPaper(_: any, { title, objective, createdBy }: IPaper) {
      try {
        // Log the provided arguments for debugging
        console.log({ title, objective, createdBy });

        // Create a new paper document with the provided fields and a unique sessionId
        const paper = new Paper({
          title,
          objective,
          createdBy,
          sessionId: generateUniqueCode(12),
          createdDate: String(Date.now()),
        });

        // Save the new paper document to the database
        await paper.save();

        // Return the created paper document
        return paper;
      } catch (error) {
        console.error("Error creating paper:", error);
        throw new Error("Failed to create paper");
      }
    },

    async addDiscussion(
      _: any,
      { id, discussionItem }: { id: string; discussionItem: string }
    ) {
      const paper = await Paper.findOne({ id });
      let objJ = JSON.parse(discussionItem);
      objJ = objJ[0];
      paper?.discussion.push(objJ);
      paper?.save();
      return paper;
    },
    async updatePaper(
      _: any,
      { id, title, objective }: { id: string; title: string; objective: string }
    ) {
      try {
        // Find the paper by ID and update the specified fields
        const paper = await Paper.findByIdAndUpdate(
          id,
          {
            $set: { title, objective },
          },
          { new: true } // Return the updated document
        );

        // Check if the paper was found and updated
        if (!paper) {
          throw new Error("Paper not found");
        }

        return paper;
      } catch (error) {
        console.error("Error updating paper:", error);
        throw new Error("Failed to update paper");
      }
    },
    async deletePaper(_: any, { id }: { id: string }) {
      const paper = await Paper.findByIdAndDelete(id);
      return paper;
    },

    //   (paperId: ID!, discussionItem: String!): Paper

    //   (
    //     id: ID!
    //     title: String
    //     objective: String
    //     createdDate: String
    //   ): Paper
    //   deletePaper(id: ID!): Paper
    // }
    //   async deletePaper(_: any, { id }: { id: string }) {
    //     const paper = await Paper.findByIdAndDelete(id);
    //     return paper;
    //   },
  },
};

export default paperResolver;