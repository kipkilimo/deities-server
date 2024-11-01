import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import DiscussionGroup from "../models/DiscussionGroup";
import Department from "../models/Department";
import Resource from "../models/Resource";

//   { path: "discussion_group", model: "" },
// { path: "department", model: "" },
import { sendEmail } from "../utils/emailHandler"; // Adjust import path as needed
import { generateUniqueCode } from "../utils/identifier_generator";
import mongoose from "mongoose";

let redirectUrl;
// CLIENT_URL=${redirectUrl}/

// CLIENT_DEV_URL=http://localhost:5173/
if (process.env.NODE_ENV === "production") {
  redirectUrl = process.env.CLIENT_URL;
} else {
  redirectUrl = process.env.CLIENT_DEV_URL;
}

interface ResourceSuggestion {
  title: any;
  coverImage: any;
  description: any;
  content: any;
  participants: any;
  targetRegion: any;
  language: any;
  sessionId: any;
  accessKey: any;
  subject: any;
  topic: any;
  keywords: any;
  createdBy: any;
  createdAt: any;
  contentType: any;
  id: any;
  resource: {
    id: string;
    title: string;
    coverImage?: string;
    description?: string;
    content?: string;
    participants?: string[];
    targetRegion?: string;
    language?: string;
    sessionId?: string;
    accessKey?: string;
    contentType?: string;
    subject?: string;
    topic?: string;
    keywords?: string[];
    createdBy: {
      id: string;
      personalInfo: { username: string };
      role: string;
    };
    createdAt: Date;
  };
  reason: string;
  score: number;
}
const userResolver = {
  Query: {
    async getUser(_: any, { scholarId }: { scholarId: string }) {
      return await User.findOne({ _id: scholarId });
    },

    async getUsers() {
      return await User.find()
        .populate({
          path: "discussion_groups",
          model: "DiscussionGroup",
          select: {
            id: 1,
            discussionGroupId: 1,
            name: 1,
            // Populate members field to ensure correct data type
            members: 1,
          },
          populate: {
            path: "members", // Populating the members array to get the user ObjectIds
            model: "User", // Assuming members refer to User model
            select: {
              id: 1,
              personalInfo: {
                fullName: 1,
                email: 1,
              },
              role: 1,
            },
          },
        })
        .populate({
          path: "departments", // Corrected the typo from "departmentss" to "departments"
          model: "Department",
          select: {
            id: 1,
            departmentId: 1,
            name: 1,
            members: 1, // Populate members field
          },
          populate: [
            {
              path: "faculty", // Populating the faculty array
              model: "User", // Assuming faculty refers to User model
              select: {
                id: 1,
                "personalInfo.fullName": 1, // Select nested personalInfo fields
                "personalInfo.email": 1,
                role: 1,
              },
            },
            {
              path: "students", // Populating the students array
              model: "User", // Assuming students refer to User model
              select: {
                id: 1,
                "personalInfo.fullName": 1, // Select nested personalInfo fields
                "personalInfo.email": 1,
                role: 1,
              },
            },
          ],
        })

        .exec();
    },
    async getCurrentUser(_: any, { sessionId }: { sessionId: string }) {
      try {
        // Fetch user with populated fields
        const user = await User.findOne({ _id: sessionId })
          .populate({
            path: "discussion_groups",
            model: "DiscussionGroup",
            select: {
              id: 1,
              discussionGroupId: 1,
              name: 1,
              // Populate members field to ensure correct data type
              members: 1,
            },
            populate: {
              path: "members", // Populating the members array to get the user ObjectIds
              model: "User", // Assuming members refer to User model
              select: {
                id: 1,
                personalInfo: {
                  fullName: 1,
                  email: 1,
                },
                role: 1,
              },
            },
          })
          .populate({
            path: "departments", // Corrected the typo from "departmentss" to "departments"
            model: "Department",
            select: {
              id: 1,
              departmentId: 1,
              name: 1,
              members: 1, // Populate members field
            },
            populate: [
              {
                path: "faculty", // Populating the faculty array
                model: "User", // Assuming faculty refers to User model
                select: {
                  id: 1,
                  "personalInfo.fullName": 1, // Select nested personalInfo fields
                  "personalInfo.email": 1,
                  role: 1,
                },
              },
              {
                path: "students", // Populating the students array
                model: "User", // Assuming students refer to User model
                select: {
                  id: 1,
                  "personalInfo.fullName": 1, // Select nested personalInfo fields
                  "personalInfo.email": 1,
                  role: 1,
                },
              },
            ],
          })

          .exec();

        // Check if user exists
        if (!user) {
          throw new Error("User not found");
        }

        console.log({ getCurrentUser: user });
        return user;
      } catch (error) {
        // Handle errors
        console.error("Error fetching current user:", error);
        throw new Error(
          "An error occurred while fetching the user. Please try again."
        );
      }
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
      const lastName = username.split(" ").pop();
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
    <div style="background-color: #ffffff; padding: 20px; text-align: center;">
      <img src="https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png" alt="NEMBio Learning Logo" style="width: 240px;">
    </div>

    <!-- Email Content -->
    <div style="padding: 20px;">
      <h1 style="color: #ffffff;">Welcome to NEMBio Learning, ${user.personalInfo.fullName}!</h1>
      <p style="font-size: 16px;">Thank you for signing up. To activate your account and access the platform, please click on the link below:</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="${redirectUrl}/auth/activate?token=${user.personalInfo.activationToken}" 
           style="background-color: #ffffff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
           Activate Your Account
        </a>
      </p>
      <p style="font-size: 16px;">Once activated, you can log in to your account and start using NEMBio Learning.</p>
        <p style="font-size: 16px;">Enjoy your learning.</p>
       <p style="font-size: 16px;">NEMBio Team.</p>
    </div>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>The Hub for Learning Epidemiology, Biostatistics and Research Methods.</p>
             <p>Nairobi, KE</p>
      <p>Tel: 254700378241 Email: info@nem.bio</p>
    </div>
  </div>
`;

      const emailOptions = {
        to: [user.personalInfo.email],
        subject: "Activate Your Account on  NEMBio Learning",
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

      if (user.personalInfo.activatedAccount === false) {
        const activationToken = generateUniqueCode(12);

        const emailBody = `
          <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #ffffff; padding: 20px; text-align: center;">
      <img src="https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png" alt="NEMBio Learning Logo" style="width: 240px;">
    </div>

    <!-- Email Content -->
           <h1>Welcome to  NEMBio Learning, ${user.personalInfo.fullName}!</h1>
          <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
          <a href="${redirectUrl}/auth/activate?token=${activationToken}">Activate Your Account</a>
          <p>Once activated, you can log in to your account and start using  NEMBio Learning.</p>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>The Hub for Learning Epidemiology, Biostatistics and Research Methods.</p>
             <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nem.bio</p>
    </div>
  </div>



        `;

        const emailOptions = {
          to: [user.personalInfo.email],
          subject: "Activate Your Account on  NEMBio Learning",
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
        expiresIn: "7d",
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
      console.log({ login: email });
      const user = await User.findOne({ "personalInfo.email": email });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.personalInfo.activatedAccount === false) {
        const activationToken = generateUniqueCode(12);

        const emailBody = `
          <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #ffffff; padding: 20px; text-align: center;">
      <img src="https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png" alt="NEMBio Learning Logo" style="width: 240px;">
    </div>

    <!-- Email Content -->
           <h1>Welcome to  NEMBio Learning, ${user.personalInfo.fullName}!</h1>
          <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
          <a href="${redirectUrl}/auth/activate?token=${activationToken}">Activate Your Account</a>
          <p>Once activated, you can log in to your account and start using  NEMBio Learning.</p>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>The Hub for Learning Epidemiology, Biostatistics and Research Methods.</p>
             <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nem.bio</p>
    </div>
  </div>



        `;

        const emailOptions = {
          to: [user.personalInfo.email],
          subject: "Activate Your Account on  NEMBio Learning",
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
        expiresIn: "7d",
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

      if (user.personalInfo.activatedAccount === false) {
        const newActivationToken = generateUniqueCode(12);

        const emailBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
    <!-- Top Logo Stripe -->
    <div style="background-color: #ffffff; padding: 20px; text-align: center;">
      <img src="https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png" alt="NEMBio Learning Logo" style="width: 240px;">
    </div>

    <!-- Email Content -->
                    <h1>Welcome to  NEMBio Learning, ${user.personalInfo.fullName}!</h1>
          <p>Thank you for signing up. To activate your account and access all the features, please click on the link below:</p>
          <a href="${redirectUrl}/auth/activate?token=${newActivationToken}">Activate Your Account</a>
          <p>Once activated, you can log in to your account and start using  NEMBio Learning.</p>

    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>The Hub for Learning Epidemiology, Biostatistics and Research Methods.</p>
             <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nem.bio</p>
    </div>
  </div>



        `;

        const emailOptions = {
          to: [user.personalInfo.email],
          subject: "Activate Your Account on  NEMBio Learning",
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
        expiresIn: "7d",
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

      if (!user || user.personalInfo.activatedAccount === false) {
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
        expiresIn: "7d",
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
  <div style="background-color: #ffffff; padding: 20px; text-align: center;">
    <img src="https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png" alt="NEMBio Learning Logo" style="width: 240px;">
  </div>

  <!-- Email Content -->
  <h2>NEMBio one time login password, ${user.personalInfo.fullName}</h2> 
  <p>To sign in to your NEMBio account, use the one-time password below:</p>
  
  <!-- Copyable text field with the token -->
  <h3 style="background-color: #f9f9f9; padding: 10px; border: 1px solid #ccc;">
    ${activationToken}
  </h3>
  <p>If you did not request this password, please change your email access security parameters.</p>
  <p>Enjoy your NEMBio Learning experience.</p> 

  <!-- Footer with Address -->
  <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
    <p>The Hub for Learning Epidemiology, Biostatistics and Research Methods.</p>
         <p>Nairobi, KE</p>
    <p>Tel: 254700378241 Email: info@nem.bio</p>
  </div>
</div>
`;
      const emailOptions = {
        to: [user.personalInfo.email],
        subject: "One time signin pin on NEMBio Learning",
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
    <div style="background-color: #ffffff; padding: 20px; text-align: center;">
      <img src="https://a2z-v0.s3.eu-central-1.amazonaws.com/Screenshot+from+2024-10-22+16-31-16.png" alt="NEMBio Learning Logo" style="width: 240px;">
    </div>

    <!-- Email Content -->
                <h1>Password reset request, ${user.personalInfo.fullName}!</h1>
        <p>A password reset request has been made on your  NEMBioLearning account.</p>
        <p>To reset your password and access all the features, please click on the link below:</p>
        <a href="${redirectUrl}/auth/reset?token=${activationToken}">Reset Password</a>
        <p>Once reset, you can log in to your account and start using  NEMBio Learning again.</p>
    <!-- Footer with Address -->
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 14px; color: #777;">
      <p>The Hub for Learning Epidemiology, Biostatistics and Research Methods.</p>
             <p>Nairobi, KE</p>
            <p>Tel: 254700378241 Email: info@nem.bio</p>
    </div>
  </div>


      `;

      const emailOptions = {
        to: [user.personalInfo.email],
        subject: "Password Reset Request on  NEMBio Learning",
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

    // # campaign poster   mutation addResourceToFavorites($userId: ID!, $resourceId: ID!) {
    // suggestResources,addResourceToRecents,addResourceToFavorites
    addResourceToFavorites: async (
      _: any,
      args: { userId: any; resourceId: any }
    ) => {
      console.log("Adding favs...");
      try {
        const checkUser = await User.findOne({
          _id: args.userId,
        });

        const val = args.resourceId;
        const objectId = new mongoose.Types.ObjectId(val);
        // @ts-ignore
        let resourceArray = checkUser.favorite_resources;
        // @ts-ignore
        resourceArray = [].concat(...resourceArray);
        console.log("Adding favs...", objectId);

        // Check if objectId is already present in the array
        const containsObjectId = resourceArray.some(
          (item: { equals: (arg0: mongoose.Types.ObjectId) => any }) =>
            item.equals(objectId)
        );

        console.log(containsObjectId);

        if (containsObjectId) {
          // If objectId is already present, do something (you can customize this part)
          console.log("Object is already in the array");
          return checkUser;
        }

        const result = await User.findByIdAndUpdate(
          {
            // @ts-ignore
            _id: checkUser._id,
          },
          {
            $push: {
              favoriteResourceResources: args.resourceId,
            },
          }
        );

        // @ts-ignore
        const resource = await Resource.findByIdAndUpdate({
          _id: args.resourceId,
        });
        // @ts-ignore
        const newNo = Number(resource.likesNumber) + 1;
        // @ts-ignore
        resource.likesNumber = newNo;
        // @ts-ignore
        await resource.save();
        //topic_resource_favs_number

        return result;
      } catch (error) {
        console.log(error);
      }
    },

    addResourceToRecents: async (
      _: any,
      args: { userId: any; resourceId: any }
    ) => {
      console.log("Adding recents...");
      try {
        const checkUser = await User.findOne({
          _id: args.userId,
        });

        const val = args.resourceId;
        const objectId = new mongoose.Types.ObjectId(val);
        // @ts-ignore
        let resourceArray = checkUser.recent_resources;
        // @ts-ignore
        resourceArray = [].concat(...resourceArray);
        console.log("Adding favs...", objectId);

        // Check if objectId is already present in the array
        const containsObjectId = resourceArray.some((item) =>
          item.equals(objectId)
        );

        console.log(containsObjectId);

        if (containsObjectId) {
          // If objectId is already present, do something (you can customize this part)
          console.log("Object is already in the array");
          return checkUser;
        }

        const result = await User.findByIdAndUpdate(
          {
            // @ts-ignore
            _id: checkUser.id,
          },
          {
            $push: {
              recent_resources: args.resourceId,
            },
          }
        );

        return result;
      } catch (error) {
        console.log(error);
      }
    },
    suggestResources: async (
      _: any,
      args: { userId: string; resourceId: any }
    ) => {
      // Find the user and populate necessary fields
      const checkUser = await User.findOne({
        _id: args.userId,
      }).populate([
        { path: "discussion_group", model: "DiscussionGroup" },
        { path: "department", model: "Department" },
      ]);

      if (!checkUser) {
        throw new Error("User not found");
      }

      // Initialize the suggestion list
      const suggestionList: {
        resource: ResourceSuggestion;
        reason: string;
        score: number;
      }[] = [];

      // Safely get favorited resources and recently visited ones
      //@ts-ignore
      const favoritedResourceSuggestions = checkUser.favorited_resources || [];
      //@ts-ignore
      const recentlyVisited = checkUser.recently_visited || [];

      // Step 1: Prioritize favorited resources not recently visited
      favoritedResourceSuggestions.forEach((resource: ResourceSuggestion) => {
        if (
          !recentlyVisited.some(
            (rv: ResourceSuggestion) => rv.id === resource.id
          )
        ) {
          suggestionList.push({
            resource,
            reason: "Favorited resource",
            score: 100, // Higher score for favorited resources
          });
        }
      });

      // Step 2: Add recently visited resources not already suggested
      recentlyVisited.forEach((resource: ResourceSuggestion) => {
        if (!suggestionList.some((s) => s.resource.id === resource.id)) {
          suggestionList.push({
            resource,
            reason: "Recently visited",
            score: 50, // Lower score for recently visited resources
          });
        }
      });

      // Step 3: Boost score for resources in preferred categories
      //@ts-ignore
      const preferredCategories: string[] =
        //@ts-ignore
        checkUser.preferred_categories || [];
      if (preferredCategories.length > 0) {
        suggestionList.forEach((suggestion) => {
          if (preferredCategories.includes(suggestion.resource.contentType)) {
            suggestion.score += 20; // Boost score for resources in preferred categories
          }
        });
      }

      // Step 4: Sort suggestions by score (highest relevance first)
      suggestionList.sort((a, b) => b.score - a.score);

      // Step 5: Format and return the suggestions
      const suggestions = suggestionList.map((suggestion) => ({
        id: suggestion.resource.id,
        title: suggestion.resource.title,
        coverImage: suggestion.resource.coverImage,
        description: suggestion.resource.description,
        content: suggestion.resource.content,
        participants: suggestion.resource.participants,
        targetRegion: suggestion.resource.targetRegion,
        language: suggestion.resource.language,
        sessionId: suggestion.resource.sessionId,
        accessKey: suggestion.resource.accessKey,
        contentType: suggestion.resource.contentType,
        subject: suggestion.resource.subject,
        topic: suggestion.resource.topic,
        keywords: suggestion.resource.keywords,
        createdBy: suggestion.resource.createdBy,
        createdAt: suggestion.resource.createdAt,
      }));

      return {
        suggestions,
      };
    },
  },
};

export default userResolver;
