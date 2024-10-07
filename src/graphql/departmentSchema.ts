import { gql } from "graphql-tag";

// Import User type from the user type definitions
import userTypeDefs from "./userSchema"; // Adjust the import path as necessary

// Define the GraphQL types and operations for Department
export const departmentTypeDefs = gql`
  # Include the user type definitions
  ${userTypeDefs}

  type Course {
    courseId: ID!
    courseName: String!
    courseCode: String!
    credits: Int!
  }

  type Program {
    programId: ID!
    name: String!
    degree: String!
    duration: Int!
    requiredCredits: Int!
    coursesOffered: [Course!]!
  }

  type Department {
    departmentId: ID!
    name: String!
    faculty: [User!]! # Using imported User type for faculty
    programs: [Program!]!
    students: [User!]! # Using imported User type for students
  }

  type Query {
    getDepartment(departmentId: ID!): Department
    getDepartments: [Department!]!
  }

  type Mutation {
    createDepartment(departmentId: ID!, name: String!): Department
    updateDepartment(departmentId: ID!, name: String): Department
    deleteDepartment(departmentId: ID!): Department
  }
`;

export default departmentTypeDefs;
