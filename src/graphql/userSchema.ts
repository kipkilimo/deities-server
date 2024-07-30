import { gql } from 'graphql-tag'; 

const userTypeDefs = gql`
  type User {
    id: ID!
    username: String! 
    email: String!
    activationToken: String 
    resetToken: String 
    tokenExpiry: String 
    activatedAccount: Boolean


  }
type LoginResponse {
  user: User!
  accessToken: String!
}
  type Query {
    getUser(id: ID!): User
    getUsers: [User]
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): User
    login(email: String!, password: String!): LoginResponse
    activate(email: String!): LoginResponse
    resetPassword(activationToken: String!,password: String!): LoginResponse
    requestPasswordReset(email: String!): User
    updateUser(id: ID!, username: String, email: String): User
    deleteUser(id: ID!): User
  }
`;

export default userTypeDefs;
