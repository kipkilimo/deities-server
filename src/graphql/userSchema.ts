import { gql } from 'graphql-tag';

const userTypeDefs = gql`
  type User {
    id: ID!
    username: String! 
    email: String!
    activationToken: String 
    resetToken: String 
    tokenExpiry: String 


  }

  type Query {
    getUser(id: ID!): User
    getUsers: [User]
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): User
    login(email: String!, password: String!): String
    activate(email: String!): String
    resetPassword(password: String!): String
    requestPasswordReset(email: String!): String
    updateUser(id: ID!, username: String, email: String): User
    deleteUser(id: ID!): User
  }
`;

export default userTypeDefs;
