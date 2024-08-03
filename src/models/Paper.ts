import mongoose, { Document, Mongoose, Schema, Types } from 'mongoose';
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
interface Discussion {

    username: String
    title: String
    discussion: String
    added: String

}
export interface IPaper extends Document {
    title: String
    objective: String
    url: String
    discussion: [Discussion]
    createdDate: String
}

const PaperSchema: Schema = new Schema({
    title: {
        type: String,
        required: true,
    },
    objective: [{
        type: String,
        required: true,
    }],
    discussion: [{

        username: String,
        title: String,
        discussion: String,
        added: String

    }],
    url: {
        type: String,
    },
    sessionId: {
        type: String,
    },
    createdDate: {
        type: String,
    },
    createdBy: {
        type: Types.ObjectId, // Use Types.ObjectId for referencing another document
        ref: 'User', // Reference to the User model
        required: true, // Add validation if the field is mandatory
    },

});

const Paper = mongoose.model<IPaper>('Paper', PaperSchema);
export default Paper;
