import { gql } from "apollo-server-express";

const consultationTypeDefs = gql`
  type Consultation {
    id: ID!
    title: String!
    description: String!
    createdAt: String!
    updatedAt: String
    status: ConsultationStatus!
    studentId: ID!
    mentorId: ID
    closedAt: String
    studyStage: StudyStage
  }

  enum ConsultationStatus {
    OPEN
    TAKEN
    CLOSED
  }

  enum StudyStage {
    CONCEPTUALIZATION
    PROPOSAL_DEVELOPMENT
    ETHICAL_CONSIDERATIONS
    POWER_SAMPLE_SIZE_CALCULATION
    FIELD_ACTIVITY
    REPORT_WRITING
    DISCUSSION
    MANUSCRIPT_DEVELOPMENT
  }

  type Query {
    getConsultation(id: ID!): Consultation
    listConsultations(status: ConsultationStatus): [Consultation!]!
  }

  type Mutation {
    openConsultation(
      title: String!
      description: String!
      studentId: ID!
    ): Consultation!
    takeConsultation(ConsultationId: ID!, mentorId: ID!): Consultation!
    sendMessage(ConsultationId: ID!, senderId: ID!, content: String!): String! # Removed message functionality
    closeConsultation(ConsultationId: ID!): Consultation!
  }

  type Subscription {
    ConsultationUpdated(ConsultationId: ID!): Consultation
  }
`;

export default consultationTypeDefs;
