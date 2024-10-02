import { IPaper } from "../models/Paper";
import Paper from "../models/Paper";

import { generateUniqueCode } from "../utils/identifier_generator";
import generateAccessKey from "../utils/accessKeyUtility";

const cron = require("node-cron");

/*

cron.schedule("*\/15 * * * * *", async function () {
  try {
    // Find all papers
    const allUsers = await Paper.find();
    console.log({ allUsers });

    // Update the participants field for each paper to be an empty string
    await Paper.updateMany({}, { $set: { participants: "[]" } });

    console.log("Updated participants field for all papers.");
  } catch (error) {
    console.error("Error updating papers:", error);
  }
});



  id: ID!
  title: String!
  objective: String!
  url: String
  sessionId: String
  discussion: [Discussion]
  createdDate: String 
  createdBy:User!
  

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
    // const getMostRecentPapers = async (_: any, { userId }: { userId: string }) => {
    async getMostRecentPapers(_: any, { userId }: { userId: string }) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      try {
        // Convert dates to milliseconds for comparison
        const thirtyDaysAgoMillis = thirtyDaysAgo.getTime();
        const todayMillis = today.getTime();

        // Fetch the current academic year based on today’s date (assuming a September to August academic year)
        const currentYear = today.getFullYear();
        const academicYearStart =
          today.getMonth() >= 8 // If today is September or later
            ? currentYear
            : currentYear - 1;
        const academicYearEnd = academicYearStart + 1;
        const academicYear = `${academicYearStart}-${academicYearEnd}`;

        // Fetch the last 4 papers where the user is the creator (createdBy matches userId)
        const createdPapers = await Paper.find({
          createdDate: {
            $gte: thirtyDaysAgoMillis.toString(), // Use stringified milliseconds
            $lte: todayMillis.toString(), // Use stringified milliseconds
          },
          createdBy: userId, // Filter by createdBy field
        })
          .sort({ createdDate: -1 }) // Sort by createdDate in descending order
          .limit(4) // Limit to the last 4 papers
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

        // Fetch the last 8 papers where the user is either a participant or publisher
        const participantOrPublisherPapers = await Paper.find({
          createdDate: {
            $gte: thirtyDaysAgoMillis.toString(), // Use stringified milliseconds
            $lte: todayMillis.toString(), // Use stringified milliseconds
          },
          $or: [
            // Check for userId in participants using regex
            { participants: { $regex: userId, $options: "i" } },
            { publishers: userId }, // Check if user is in publishers
          ],
        })
          .sort({ createdDate: -1 }) // Sort by createdDate in descending order
          .limit(8) // Limit to the last 8 papers
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

        // Combine the two arrays, ensuring no more than 12 papers total
        const allPapers = [
          ...createdPapers,
          ...participantOrPublisherPapers,
        ].slice(0, 12);

        console.log("success:", allPapers);
        const uniquePapers = allPapers.reduce((acc, current) => {
          // @ts-ignore
          const x = acc.find((item) => item.id === current.id);
          if (!x) {
            // @ts-ignore
            acc.push(current);
          }
          return acc;
        }, []);
        // Return only the array of papers
        return uniquePapers;
      } catch (error) {
        console.error("Error fetching the most recent papers:", error);
        throw new Error("Error fetching the most recent papers");
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

        const accessKeyStr = generateAccessKey();
        // Create a new paper document with the provided fields and a unique sessionId
        const paper = new Paper({
          title,
          objective,
          createdBy,
          sessionId: generateUniqueCode(12),
          accessKey: accessKeyStr,
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
