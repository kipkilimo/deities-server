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
    MODEL
    ARTICLE
    JOB
    TASK
    COMPUTING
  }

  type Resource {
    id: ID!
    title: String!
    description: String
    content: String!
    metaInfo: String
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
    keywords: String
    participants: String
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
  type ResourceSummary {
    audioCount: Int
    videoCount: Int
    imagesCount: Int
    documentCount: Int
    presentationCount: Int
    eventCount: Int
    datasetCount: Int
    linkCount: Int
    pollCount: Int
    testCount: Int
    modelCount: Int
    posterCount: Int
    articleCount: Int
    jobCount: Int
    taskCount: Int
    mostLikedResource: ResourceDetail
    mostRequestedResource: ResourceDetail
    mostCreatedResource: ResourceDetail
    publicationTrends: [PublicationTrend]
  }

  type ResourceDetail {
    title: String
    likesNumber: Int
    viewsNumber: Int
    createdAt: String
  }

  type PublicationTrend {
    month: Int
    count: Int
  }
  type ExamMetaInfo {
    id: ID!
    title: String
    coverImage: String
    description: String
    examMetaInfo: ExamMetaDetails
    subject: String
    topic: String
    createdBy: User
    createdAt: String
    sessionId: String
    accessKey: String
    participants: String
  }

  type ExamMetaDetails {
    examDate: String
    examStartTime: String
    examDuration: String
    examEndTime: String
    selectedTypes: [String]
    numberOfQuestions: QuestionCount
    markingSchemes: MarkingScheme
    testMeta: [TestMeta]
  }

  type QuestionCount {
    SCQ: String
    MCQ: String
    ATF: String
    ETF: String
    VSAQ: String
    SAQ: String
    LEQ: String
  }

  type MarkingScheme {
    SCQ: String
    MCQ: String
    ATF: String
    ETF: String
  }

  type TestMeta {
    testType: String
    numberOfQuestions: String
  }
  type Query {
    getPublisherLatestExams(userId: String!): [ExamMetaInfo]

    fetchResourceSummaryByRoleAndType: [ResourceSummary!]!

    getResource(id: ID!): Resource
    fetchComputingResource(topicParams: String!): Resource
    getAllTaskResources: [Resource!]!
    getQuestions(resourceId: ID!): String
    getAllResources: [Resource!]!
    getAllSpecificTypeResources(resourceType: String!): [Resource!]!

    getPublisherLatestPoll(userId: String!): Resource
    getResources(
      subject: String
      topic: String
      title: String
      contentType: ResourceType
      targetRegion: String
      language: String
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
    addResourceFormContent(resourceDetails: String!): Resource!

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
