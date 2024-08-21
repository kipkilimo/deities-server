import { gql } from "apollo-server-express";

// Define the GraphQL types
export const paperTypeDefs = gql`
  type Discussion {
    page: Int!
    title: String!
    text: String!
    x: Int
    y: Int
    width: Int
    height: Int
    author: String!
    timestamp: String!
    id: ID!
  }

  type Paper {
    id: ID!
    title: String!
    objective: String!
    url: String
    discussion: [Discussion!]!
    participants: [User!]!
    createdDate: String
    rating: String
    sessionId: String
    accessKey: String
    createdBy: User!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    # Other fields
  }

  type Query {
    getPaper(id: ID!): Paper
    getPapers: [Paper]
    getMostRecentPaper: Paper
  }

  type Mutation {
    createPaper(createdBy: ID!, title: String!, objective: String!): Paper

    addPaperDiscussion(discussionItem: String!): Paper

    updatePaper(
      id: ID!
      title: String
      objective: String
      createdDate: String
    ): Paper
    deletePaper(id: ID!): Paper
  }
`;
export default paperTypeDefs;
