import { gql } from "graphql-tag";
/*
 {
  username: String
  title: String
  discussion: String
  added: String
}
    page: Int
    title: String
    text: String
    x: Int
    y: Int
    width: Int
    height: Int
    id: String
    author: String
    timestamp: String
  */

const paperTypeDefs = gql`
  type Discussion {
    page: Int
    title: String
    text: String
    x: Float
    y: Float
    width: Float
    height: Float
    id: ID!
    author: String
    timestamp: String
  }
  type Paper {
    id: ID!
    title: String!
    objective: String!
    url: String
    sessionId: String
    discussion: [Discussion]
    createdDate: String
    createdBy: User!
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
