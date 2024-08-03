import { gql } from "graphql-tag";
/*
 {
  username: String
  title: String
  discussion: String
  added: String
}
    id: ID!
  title: String!
  objective: String!
  url: String
  discussion: [Discussion]
  createdDate: String 
  */

const paperTypeDefs = gql`
  type Discussion {
    username: String
    title: String
    discussion: String
    added: String
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

    addDiscussion(paperId: ID!, discussionItem: String!): Paper

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
