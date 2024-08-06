import mongoose, { Document, Mongoose, Schema, Types } from "mongoose";
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
  discussion: [
  {
  pageNumber: 2,
  title: "Introduction Comment",
  content: "This section discusses the key aspects of the introduction.",
  x: 150,
  y: 200,
  width: 100,  // Optional: define if the highlight area is specific
  height: 50,  // Optional: define if the highlight area is specific
  id: "unique-id-12345"  // A unique identifier, e.g., generated using a UUID library
}
  ]
  createdDate: String 
  */
interface Discussion {
  pageNumber: Number;
  title: String;
  content: String;
  x: Number;
  y: Number;
  width: Number; // Optional: define if the highlight area is specific
  height: Number; // Optional: define if the highlight area is specific
  id: String; // A unique identifier, e.g., generated using a UUID library
  username: String;
  addedDate: String;
}
export interface IPaper extends Document {
  title: String;
  objective: String;
  url: String;
  discussion: [Discussion];
  createdDate: String;
  createdBy: String;
}

const PaperSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  objective: {
    type: String,
    required: true,
  },
  discussion: [
    {
      username: String,
      title: String,
      discussion: String,
      added: String,
    },
  ],
  url: {
    type: String,
    default: "",
  },
  sessionId: {
    type: String,
  },
  createdDate: {
    type: String,
  },
  createdBy: {
    type: Types.ObjectId, // Use Types.ObjectId for referencing another document
    ref: "User", // Reference to the User model
    required: true, // Add validation if the field is mandatory
  },
});

const Paper = mongoose.model<IPaper>("Paper", PaperSchema);
export default Paper;
