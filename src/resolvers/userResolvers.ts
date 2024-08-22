import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { sendEmail } from "../utils/emailHandler"; // Adjust import path as needed
import { generateUniqueCode } from "../utils/identifier_generator";

const userResolver = {
  Query: {
    async getUser(_: any, { scholarId }: { scholarId: string }) {
      return await User.findOne({ _id: scholarId });
    },

    async getUsers() {
      return await User.find();
    },

    async getCurrentUser(_: any, { sessionId }: { sessionId: string }) {
      // const user = await User.findById(sessionId);
      const user = await User.findOne({ _id: sessionId });
      if (!user) {
        throw new Error("User not found");
      }
      return user;
    },
  },

  Mutation: {
    async createUser(
      _: any,
      {
        username,
        fullName,
        email,
        password,
      }: { username: string; fullName: string; email: string; password: string }
    ) {
      const lastName = username.split(" ").pop(); // Extracts the last part of the username
      const formattedUsername = `${email.split("@")[0]}-${lastName}`;
      console.log({ formattedUsername });
      const hashedPassword = await bcrypt.hash(password, 12);
      const activationToken = generateUniqueCode(12);
      console.log({ activationToken });

      const user = new User({
        personalInfo: {
          scholarId: generateUniqueCode(12),
          fullName: fullName,
          username: formattedUsername.toLowerCase(),
          email,
          institution: "",
          department: "",
          profilePicture: "",
          password: hashedPassword,
          bio: "",
          dateOfBirth: null,
          gender: "",
          location: { city: "", state: "", country: "" },
          website: "",
          activationToken: activationToken,
          resetToken: "",
          tokenExpiry: String(Date.now() + 7200000),
          activatedAccount: false,
        },
        academicInfo: {
          researchInterests: [],
          publications: [],
          ongoingProjects: [],
          collaborations: [],
        },
        accountSettings: {
          privacySettings: { profileVisibility: "PUBLIC" },
          notificationSettings: { emailNotifications: true },
        },
        activityInfo: {
          lastLogin: null,
          accountCreationDate: new Date(),
        },
      });

      await user.save();
      const emailBody = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #0b3d91; padding: 20px; text-align: center;">
      <img src="https://media.springernature.com/lw725/springer-cms/rest/v1/content/24062430/data/v1" alt="NEMBi Learning Logo" style="width: 150px;">
    </div>

    <!-- Email Content -->
    <div style="padding: 20px;">
      <h1 style="color: #0b3d91;">Welcome to NEMBi Learning, ${user.personalInfo.fullName}!</h1>
      <p style="font-size: 16px;">Thank you for signing up. To activate your account and access the platform, please click on the link below:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="http://localhost:5173/auth/activate?token=${user.personalInfo.activationToken}" 
           style="background-color: #0b3d91; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
           Activate Your Account
        </a>
      </p>
      <p style="font-size: 16px;">Once activated, you can log in to your account and start using NEMBi Learning.</p>
        <p style="font-size: 16px;">Enjoy your learning.</p>
       <p style="font-size: 16px;">NEMBi Team.</p>
    </div>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>NEMBi Tools for Online Learning & Training.</p>
      <p>Langata Road, Mara Suites</p>
      <p>Nairobi, KE</p>
      <p>Tel: 254700378241 Email: info@nembi.com</p>
    </div>
  </div>
`;

      const emailOptions = {
        to: user.personalInfo.email,
        subject: "Activate Your Account on  NEMBi Learning",
        html: emailBody,
      };

      await sendEmail(emailOptions);

      return user;
    },

    async updateUser(
      _: any,
      { scholarId, input }: { scholarId: string; input: any }
    ) {
      return await User.findOneAndUpdate(
        { scholarId: scholarId },
        { $set: input },
        { new: true }
      );
    },
    async singleSigninLogin(_: any, { accessKey }: { accessKey: string }) {
      const user = await User.findOne({
        "personalInfo.activationToken": accessKey,
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (
        user.personalInfo.activationToken.length > 1 &&
        Date.now() - Number(user.personalInfo.tokenExpiry) > 7200000
      ) {
        const activationToken = generateUniqueCode(12);

        const emailBody = `
          <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #0b3d91; padding: 20px; text-align: center;">
      <img src="https://media.springernature.com/lw725/springer-cms/rest/v1/content/24062430/data/v1" alt="NEMBi Learning Logo" style="width: 150px;">
    </div>

    <!-- Email Content -->
           <h1>Welcome to  NEMBi Learning, ${user.personalInfo.fullName}!</h1>
          <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
          <a href="http://localhost:5173/auth/activate?token=${activationToken}">Activate Your Account</a>
          <p>Once activated, you can log in to your account and start using  NEMBi Learning.</p>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>NEMBi Tools for Online Learning & Training.</p>
      <p>Langata Road, Mara Suites</p>
      <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nembi.com</p>
    </div>
  </div>



        `;

        const emailOptions = {
          to: user.personalInfo.email,
          subject: "Activate Your Account on  NEMBi Learning",
          html: emailBody,
        };

        await sendEmail(emailOptions);
        user.personalInfo.activationToken = activationToken;
        user.personalInfo.resetToken = activationToken;
        user.personalInfo.tokenExpiry = String(Date.now() + 7200000);
        user.personalInfo.activatedAccount = false;
        await user.save();

        throw new Error(
          "Activate your account first. An activation link was sent to your email."
        );
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "168h",
      });
      user.personalInfo.activationToken = "";
      user.personalInfo.resetToken = "";
      user.personalInfo.tokenExpiry = "";
      user.personalInfo.activatedAccount = true;
      await user.save();
      return { user, accessToken: token };
    },
    async login(
      _: any,
      { email, password }: { email: string; password: string }
    ) {
      const user = await User.findOne({ "personalInfo.email": email });

      if (!user) {
        throw new Error("User not found");
      }

      if (
        user.personalInfo.activationToken.length > 1 &&
        Date.now() - Number(user.personalInfo.tokenExpiry) > 7200000
      ) {
        const activationToken = generateUniqueCode(12);

        const emailBody = `
          <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #0b3d91; padding: 20px; text-align: center;">
      <img src="https://media.springernature.com/lw725/springer-cms/rest/v1/content/24062430/data/v1" alt="NEMBi Learning Logo" style="width: 150px;">
    </div>

    <!-- Email Content -->
           <h1>Welcome to  NEMBi Learning, ${user.personalInfo.fullName}!</h1>
          <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
          <a href="http://localhost:5173/auth/activate?token=${activationToken}">Activate Your Account</a>
          <p>Once activated, you can log in to your account and start using  NEMBi Learning.</p>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>NEMBi Tools for Online Learning & Training.</p>
      <p>Langata Road, Mara Suites</p>
      <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nembi.com</p>
    </div>
  </div>



        `;

        const emailOptions = {
          to: user.personalInfo.email,
          subject: "Activate Your Account on  NEMBi Learning",
          html: emailBody,
        };

        await sendEmail(emailOptions);
        user.personalInfo.activationToken = activationToken;
        user.personalInfo.resetToken = activationToken;
        user.personalInfo.tokenExpiry = String(Date.now() + 7200000);
        user.personalInfo.activatedAccount = false;
        await user.save();

        throw new Error(
          "Activate your account first. An activation link was sent to your email."
        );
      }

      const isMatch = await bcrypt.compare(
        password,
        user.personalInfo.password
      );
      if (!isMatch) {
        throw new Error("Incorrect password");
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "168h",
      });
      return { user, accessToken: token };
    },

    async activate(_: any, { activationToken }: { activationToken: string }) {
      console.log({ activationToken });
      const user = await User.findOne({
        "personalInfo.activationToken": activationToken,
      });
      if (!user) {
        throw new Error("Invalid activation token");
      }

      if (Date.now() - Number(user.personalInfo.tokenExpiry) > 7200000) {
        const newActivationToken = generateUniqueCode(12);

        const emailBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #0b3d91; padding: 20px; text-align: center;">
      <img src="https://media.springernature.com/lw725/springer-cms/rest/v1/content/24062430/data/v1" alt="NEMBi Learning Logo" style="width: 150px;">
    </div>

    <!-- Email Content -->
                    <h1>Welcome to  NEMBi Learning, ${user.personalInfo.fullName}!</h1>
          <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
          <a href="http://localhost:5173/auth/activate?token=${newActivationToken}">Activate Your Account</a>
          <p>Once activated, you can log in to your account and start using  NEMBi Learning.</p>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>NEMBi Tools for Online Learning & Training.</p>
      <p>Langata Road, Mara Suites</p>
      <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nembi.com</p>
    </div>
  </div>



        `;

        const emailOptions = {
          to: user.personalInfo.email,
          subject: "Activate Your Account on  NEMBi Learning",
          html: emailBody,
        };

        await sendEmail(emailOptions);
        user.personalInfo.activationToken = newActivationToken;
        user.personalInfo.resetToken = newActivationToken;
        user.personalInfo.tokenExpiry = String(Date.now() + 7200000);
        user.personalInfo.activatedAccount = false;
        await user.save();
        return { user, accessToken: null };
      }

      user.personalInfo.activationToken = "";
      user.personalInfo.resetToken = "";
      user.personalInfo.tokenExpiry = "";
      user.personalInfo.activatedAccount = true;
      await user.save();

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "168h",
      });
      return { user, accessToken: token };
    },

    async resetPassword(
      _: any,
      {
        activationToken,
        password,
      }: { activationToken: string; password: string }
    ) {
      const user = await User.findOne({
        "personalInfo.activationToken": activationToken,
      });

      if (
        !user ||
        Date.now() - Number(user.personalInfo.tokenExpiry) > 7200000
      ) {
        throw new Error("Invalid or expired activation token");
      }
      if (password.length < 6 || password.length > 12) {
        throw new Error("Password must be 6-12 characters long");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user.personalInfo.password = hashedPassword;
      user.personalInfo.activationToken = "";
      user.personalInfo.resetToken = "";
      user.personalInfo.tokenExpiry = "";
      user.personalInfo.activatedAccount = true;
      await user.save();

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "168h",
      });
      return { user, accessToken: token };
    },
    async singleSignInRequest(_: any, { email }: { email: string }) {
      const user = await User.findOne({
        "personalInfo.email": email,
      });

      if (!user) {
        throw new Error("User not found.");
      }
      const activationToken = generateUniqueCode(12);

      const emailBody = `
<div style="font-family: Arial, sans-serif; color: #333;">
  <!-- Top Logo Stripe -->
  <div style="background-color: #0b3d91; padding: 20px; text-align: center;">
    <img src="https://media.springernature.com/lw725/springer-cms/rest/v1/content/24062430/data/v1" alt="NEMBi Learning Logo" style="width: 150px;">
  </div>

  <!-- Email Content -->
  <h2>NEMBi one time login password, ${user.personalInfo.fullName}</h2> 
  <p>To sign in to your NEMBi account, use the one-time password below:</p>
  
  <!-- Copyable text field with the token -->
  <h3 style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ccc;">
    ${activationToken}
  </h3>
  <p>If you did not request this password, please change your email access security parameters.</p>
  <p>Enjoy your NEMBi Learning experience.</p> 

  <!-- Footer with Address -->
  <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
    <p>NEMBi Tools for Online Learning & Training.</p>
    <p>Langata Road, Mara Suites</p>
    <p>Nairobi, KE</p>
    <p>Tel: 254700378241 Email: info@nembi.com</p>
  </div>
</div>
`;
      const emailOptions = {
        to: user.personalInfo.email,
        subject: "One time signin pin on NEMBi Learning",
        html: emailBody,
      };

      await sendEmail(emailOptions);
      user.personalInfo.activationToken = activationToken;
      user.personalInfo.resetToken = activationToken;
      user.personalInfo.tokenExpiry = String(Date.now() + 7200000); // 2 hours
      await user.save();
      return user;
    },
    async requestPasswordReset(_: any, { email }: { email: string }) {
      const activationToken = generateUniqueCode(12);

      const user = await User.findOne({
        "personalInfo.email": email,
      });

      if (!user) {
        throw new Error("User not found.");
      }

      const emailBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #0b3d91; padding: 20px; text-align: center;">
      <img src="https://media.springernature.com/lw725/springer-cms/rest/v1/content/24062430/data/v1" alt="NEMBi Learning Logo" style="width: 150px;">
    </div>

    <!-- Email Content -->
                <h1>Password reset request, ${user.personalInfo.fullName}!</h1>
        <p>A password reset request has been made on your  NEMBiLearning account.</p>
        <p>To reset your password and access all the features, please click on the link below:</p>
        <a href="http://localhost:5173/auth/reset?token=${activationToken}">Reset Password</a>
        <p>Once reset, you can log in to your account and start using  NEMBi Learning again.</p>
    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>NEMBi Tools for Online Learning & Training.</p>
      <p>Langata Road, Mara Suites</p>
      <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nembi.com</p>
    </div>
  </div>


      `;

      const emailOptions = {
        to: user.personalInfo.email,
        subject: "Password Reset Request on  NEMBi Learning",
        html: emailBody,
      };

      await sendEmail(emailOptions);
      user.personalInfo.activationToken = activationToken;
      user.personalInfo.resetToken = activationToken;
      user.personalInfo.tokenExpiry = String(Date.now() + 7200000); // 2 hours
      await user.save();
      return user;
    },

    async deleteUserByScholarId(_: any, { scholarId }: { scholarId: string }) {
      const user = await User.findOneAndDelete({
        _id: scholarId,
      });
      if (!user) throw new Error("User not found");
      return user;
    },
  },
};

export default userResolver;
