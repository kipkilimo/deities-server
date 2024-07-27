import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';
import User from '../models/User';

const userResolver = {
  Query: {
    async getUser(_: any, { id }: { id: string }) {
      return await User.findById(id);
    },
    async getUsers() {
      return await User.find();
    },
  },
  Mutation: {
    async register(_: any, { username, email, password }: IUser) {
      let formattedUsername
      function mergeStrings(str1: string, str2: string): string {
        const midpoint1 = Math.ceil(str1.length / 2);
        const midpoint2 = Math.floor(str2.length / 2);

        const firstPart = str1.substring(0, midpoint1);
        const secondPart = str2.substring(midpoint2);

        return firstPart + secondPart;
      }

      function extractUsername(email: string): string {
        const [emailPartOne] = email.split('@');
        return emailPartOne;
      }


      const emailPart = extractUsername(email);

      formattedUsername = mergeStrings(emailPart, username);
      console.log({ formattedUsername });

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({ username: formattedUsername, email, password: hashedPassword });
      await user.save();
      return user;
    },
    async login(_: any, { email, password }: { email: string; password: string }) {
      const user = await User.findOne({ email });
      if (!user) throw new Error('User not found');
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error('Incorrect password');
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '24h' });
      return token;
    },
    async updateUser(_: any, { id, username, email }: { id: string; username?: string; email?: string }) {
      return await User.findByIdAndUpdate(id, { username, email }, { new: true });
    },
    async deleteUser(_: any, { id }: { id: string }) {
      await User.findByIdAndDelete(id);
      return 'User deleted';
    },
  },
};

export default userResolver;
