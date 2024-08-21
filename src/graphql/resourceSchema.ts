import { gql } from "apollo-server-express";

// Define the GraphQL types
export const resourceTypeDefs = gql`
  enum ResourceType {
    AUDIO
    VIDEO
    IMAGES
    DOCUMENT
    MIXED
    TEXT
    PRESENTATION
    EVENT
    DATASET
    LINK
    POLL
    TEST
    POSTER
    ARTICLE
    JOB
    TASK
  }

  type Resource {
    id: ID!
    title: String!
    description: String
    content: String!
    targetRegion: String
    targetCountry: String
    slug: String
    language: String
    contentType: ResourceType!
    viewsNumber: Int
    likesNumber: Int
    sharesNumber: Int
    subject: String!
    topic: String!
    rating: String
    questions: String
    sessionId: String!
    accessKey: String!
    keywords: [String]
    participants: [User]
    coverImage: String
    isPublished: Boolean
    averageRating: Float
    reviews: String
    createdBy: User!
    createdAt: String
    updatedAt: String
  }

  type User {
    id: ID!
    name: String!
    email: String!
    # Other fields
  }

  type Query {
    getResource(id: ID!): Resource
    getResources(
      title: String
      contentType: ResourceType
      targetRegion: String
      language: String
      subject: String
      topic: String
    ): [Resource]
  }

  type Mutation {
    createResource(
      title: String!
      description: String!
      subject: String!
      topic: String!
      targetRegion: String
      targetCountry: String
      language: String
      contentType: ResourceType!
      keywords: String
      createdBy: ID!
    ): Resource

    updateResource(
      id: ID!
      title: String
      description: String
      content: String
      targetRegion: String
      targetCountry: String
      slug: String
      language: String
      contentType: ResourceType
      viewsNumber: Int
      likesNumber: Int
      sharesNumber: Int
      rating: String
      subject: String
      topic: String
      sessionId: String
      accessKey: String
      keywords: String
      coverImage: String
      isPublished: Boolean
      averageRating: Float
      reviews: String
    ): Resource

    deleteResource(id: ID!): Resource
  }
`;

export default resourceTypeDefs;
