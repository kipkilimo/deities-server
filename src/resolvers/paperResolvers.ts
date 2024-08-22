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
  
const cron = require("node-cron");
const { scheduleJob } = require("node-schedule"); // Import the scheduleJob function

// START CRON
// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    │
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)

// cron.schedule("*\/10 * * * * *", function() {
//  //  //
// });

// refresh
// recentlyVisited

// getUserRecentResources(userId: ID!): [Topic]
// getUserFavoriteResources(userId: ID!): [Topic]

/*
cron.schedule("*\/15 * * * * *", async function () {
  const allUsers = await Topic.find({topic_resource_subject:nul}); 
  console.log({allUsers})
});

  */
const paperResolver = {
  Query: {
    async getPaper(_: any, { id }: { id: string }) {
      return await Paper.findById(id);
    },
    getQuestions: async (_: any, { paperId }: { paperId: string }) => {
      try {
        const paper = await Paper.findById(paperId).select("questions").exec();
        if (!paper) {
          throw new Error("Paper not found");
        }
        return paper.questions;
      } catch (error) {
        throw new Error("Could not fetch questions");
      }
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

    async addPaperDiscussion(
      _: any,
      { discussionItem }: { discussionItem: string }
    ) {
      let objJ = JSON.parse(discussionItem);
      objJ = objJ[0];
      console.log({ data: objJ.data });
      const paper = await Paper.findOne({ _id: objJ.id });
      // Check if the paper was found and updated
      if (!paper) {
        throw new Error("Paper not found");
      }
      if (paper.discussion.length >= 30) {
        throw new Error("Cannot add more discussions tot this article.");
      }
      const comments = paper.discussion;
      const userComments = comments.filter(
        (comment) => comment.author === objJ.data.author
      );
      if (userComments.length >= 8) {
        throw new Error("Cannot add more discussions tot this article.");
      }
      paper?.discussion.push(objJ.data);
      await paper.save();
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
