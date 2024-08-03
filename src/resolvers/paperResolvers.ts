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
    async getPapers() {
      return await Paper.find();
    },
  },
  Mutation: {
    async createPaper(_: any, { title, objective, createdBy }: IPaper) {
      const paper = new Paper({
        title,
        objective,
        createdBy,
        sessionId: generateUniqueCode(12),
      });

      await paper.save();
      return paper;
    },

    async updatePaper(
      _: any,
      {
        id,
        name,
        locality,
        parents,
        description,
        siblings,
        domain,
        gallery,
        favs,
        rating,
        shared,
        children,
        isMortal,
      }: {
        id: string;
        name: string;
        parents: [string];
        description: string;
        siblings: [string];
        domain: string;
        gallery: [string];
        favs: number;
        rating: number;
        shared: number;
        children: string;
        locality: string;
        isMortal: boolean;
      }
    ) {
      const paper = await Paper.findByIdAndUpdate(
        id,
        {
          name,
          parents,
          description,
          siblings,
          domain,
          locality,
          gallery,
          favs,
          rating,
          shared,
          children,
          isMortal,
        },
        { new: true }
      );
      return paper;
    },
    async deletePaper(_: any, { id }: { id: string }) {
      const paper = await Paper.findByIdAndDelete(id);
      return paper;
    },
  },
};

export default paperResolver;
