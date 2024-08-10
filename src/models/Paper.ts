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
  
}
  ]
  createdDate: String 
  */
interface Discussion {
  page: Number;
  title: String;
  text: String;
  x: Number;
  y: Number;
  width: Number; // Optional: define if the highlight area is specific
  height: Number; // Optional: define if the highlight area is specific
  author: String;
  timestamp: String;
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
      page: Number,
      title: String,
      text: String,
      x: Number,
      y: Number,
      width: Number, // Optional: define if the highlight area is specific
      height: Number, // Optional: define if the highlight area is specific
      author: String,
      timestamp: String,
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
