import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';
import { sendEmail, EmailOptions } from '../utils/emailHandler'; // Assuming emailService.js

import User from '../models/User';
import { generateUniqueCode } from '../utils/identifier_generator'
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
    // resetPassword
    async requestPasswordReset(_: any, { email }: IUser) {
      const activationToken = generateUniqueCode(12)

      const user = await User.findOne({ email: email });
      if (!user) {
        throw new Error('User not found.');
      }

      // Craft well-formatted email content with a clear call to action
      const emailBody = `
    <h1>Password reset request, ${user.username}!</h1>
    <p>  A password reset request as been made on your OpalLearning account.</p>
    <p>To reset your password and access all the features, please click on the link below:</p>
    <a href="http://localhost:5173/auth/reset?token=${activationToken}">Reset Password</a>
    <p>Once reset, you can log in to your account and start using Opal Learning  again.</p>
  `;

      // Send the confirmation email
      const emailOptions = {
        to: user.email,
        subject: 'Password Reset Request on Opal Learning',
        html: emailBody,
      };

      await sendEmail(emailOptions);
      user.activationToken = activationToken
      user.resetToken = ''
      user.tokenExpiry = String(Date.now() + 7200000)
      // Activate user 
      await user.save();
      return user;
    },
    async resetPassword(_: any, { activationToken, password }: IUser) {

      // Find the user with the given activation token
      const user = await User.findOne({ activationToken });

      // Check if user exists and token is valid (less than 2 hours old)
      if (!user || user.activatedAccount === false || Date.now() - Number(user.tokenExpiry) > 2 * 60 * 60 * 1000) {
        // Handle invalid token or expired token
        throw new Error('Invalid or expired activation token');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10); // Adjust salt rounds as needed

      // Update the user's password
      user.password = hashedPassword;
      user.activationToken = ''
      user.resetToken = ''
      user.tokenExpiry = ''
      user.activatedAccount = true
      await user.save();

      return user;
    },
    async activate(_: any, { activationToken }: IUser) {

      try {
        // Find user by token
        let user = await User.findOne({ activationToken: activationToken });
        if (!user) {
          throw new Error('Invalid activation token');
        }

        if (Date.now() - Number(user.tokenExpiry) > 7200000) {
          const activationToken = generateUniqueCode(12);

          // Craft well-formatted email content with a clear call to action
          const emailBody = `
        <h1>Welcome to Opal Learning, ${user.username}!</h1>
        <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
        <a href="http://localhost:5173/auth/activate?token=${activationToken}">Activate Your Account</a>
        <p>Once activated, you can log in to your account and start using Opal Learning.</p>
      `;

          // Send the confirmation email
          const emailOptions = {
            to: user.email,
            subject: 'Activate Your Account on Opal Learning',
            html: emailBody,
          };

          await sendEmail(emailOptions);
          user.activationToken = activationToken
          user.resetToken = ''
          user.tokenExpiry = String(Date.now() + 7200000)
          // Activate user 
          await user.save();
          return user;
        }

        user.activationToken = ''
        user.resetToken = ''
        user.tokenExpiry = ''
        user.activatedAccount = true

        // Activate user 
        await user.save();
        return user;
      } catch (error) {
        console.error('Error activating account:', error);
        throw error; // Or handle error appropriately
      }

    },
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
      // Generate unique activation token
      const activationToken = generateUniqueCode(12);

      // Craft well-formatted email content with a clear call to action
      const emailBody = `
    <h1>Welcome to Opal Learning, ${user.username}!</h1>
    <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
    <a href="http://localhost:5173/auth/activate?token=${activationToken}">Activate Your Account</a>
    <p>Once activated, you can log in to your account and start using Opal Learning.</p>
  `;

      // Send the confirmation email
      const emailOptions = {
        to: user.email,
        subject: 'Activate Your Account on Opal Learning',
        html: emailBody,
      };

      await sendEmail(emailOptions);
      user.activationToken = activationToken
      user.resetToken = ''
      user.tokenExpiry = String(Date.now() + 7200000)
      // Activate user 
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
