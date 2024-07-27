import { gql } from 'graphql-tag';
/*
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
  isMortal:boolean 
  
  */


const deityTypeDefs = gql`
enum Locality {
  NORSE
  CELTIC
  GREEK
  ROMAN
  EGYPTIAN
  MESOAMERICAN
  AFRICAN 
}
type Deity {
  id: ID!
  name: String!
  parents: [String!]
  description: String!
  siblings: [String]
  domain: String!
  locality:Locality,
  gallery: [String]
  favs: Int
  rating: Float  
  shared: Int
  children: [String]  
  isMortal: Boolean
}


  type Query {
    getDeity(id: ID!): Deity
    getDeities: [Deity]
  }

  type Mutation {
    createDeity(  name: String!,
  parents: [String!],
  description: String!,
  siblings: [String],
  domain: String!,
  locality: String!,

  gallery: [String],
  favs: Int,
  rating: Float,  
  shared: Int,
  children: [String],  
  isMortal: Boolean): Deity
  getDeities: [Deity]

    updateDeity(id: ID!,name: String,parents: String,description: String,siblings: String,domain: String,locality: String, gallery: String,favs: Int,rating: Float,shared: Int,children: String,isMortal: Boolean): Deity
    deleteDeity(id: ID!): Deity
  }
`;

export default deityTypeDefs;