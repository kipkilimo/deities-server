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
    default: '',
  },
  resetToken: {
    type: String,
    default: '',
  },
  tokenExpiry: {
    type: String,
    default: '',
  },

  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
