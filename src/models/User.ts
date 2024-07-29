import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  activationToken: string;
  resetToken: string;
  tokenExpiry: string;
  activatedAccount: boolean;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  activatedAccount: {
    type: Boolean,
    default: false,
  },
  activationToken: {
    type: String,
    required: true,
  },
  resetToken: {
    type: String,
    required: true,
  },
  tokenExpiry: {
    type: String,
    required: true,
  },


  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
