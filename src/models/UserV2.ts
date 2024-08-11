import mongoose, { Document, Schema } from "mongoose";

// Define an interface for the user schema
export interface IUser extends Document {
  personalInfo: {
    userId: string;
    username: string;
    email: string;
    phoneNumber?: string;
    password: string;
    profilePicture?: string;
    coverPhoto?: string;
    bio?: string;
    dateOfBirth?: Date;
    gender?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
    website?: string;
    language?: string;
  };
  socialInfo: {
    followersCount: number;
    followingCount: number;
    postsCount: number;
    likesCount: number;
    groups?: string[];
    friendsList?: mongoose.Types.ObjectId[];
  };
  accountSettings: {
    privacySettings: {
      profileVisibility: "public" | "private" | "custom";
      messageSettings: "everyone" | "friendsOnly";
      postVisibility: "everyone" | "friendsOnly";
      tagApproval: boolean;
    };
    notificationSettings: {
      emailNotifications: boolean;
      smsNotifications: boolean;
      pushNotifications: boolean;
      frequency: "instant" | "daily" | "weekly";
    };
    accountStatus: "active" | "deactivated" | "banned";
    twoFactorAuth: boolean;
    linkedAccounts?: {
      facebook?: string;
      google?: string;
      twitter?: string;
    };
    dataSharingConsent: boolean;
  };
  activityInfo: {
    lastLogin?: Date;
    accountCreationDate: Date;
    recentActivity?: {
      type: "post" | "like" | "comment";
      content?: string;
      timestamp: Date;
    }[];
    loginHistory?: {
      ipAddress?: string;
      location?: string;
      timestamp: Date;
    }[];
  };
  contentPreferences: {
    interests?: string[];
    preferredContent?: string[];
    mutedWords?: string[];
    blockedUsers?: mongoose.Types.ObjectId[];
  };
  subscriptions: {
    plan: "free" | "premium";
    renewalDate?: Date;
    paymentMethod?: string;
    paymentHistory?: {
      amount: number;
      date: Date;
      method: string;
    }[];
  };
}

// Define the schema
const UserSchema: Schema<IUser> = new Schema({
  personalInfo: {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String },
    password: { type: String, required: true },
    profilePicture: { type: String },
    coverPhoto: { type: String },
    bio: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String },
    location: {
      city: { type: String },
      state: { type: String },
      country: { type: String },
    },
    website: { type: String },
    language: { type: String, default: "English" },
  },
  socialInfo: {
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    groups: [{ type: String }],
    friendsList: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  accountSettings: {
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ["public", "private", "custom"],
        default: "public",
      },
      messageSettings: {
        type: String,
        enum: ["everyone", "friendsOnly"],
        default: "friendsOnly",
      },
      postVisibility: {
        type: String,
        enum: ["everyone", "friendsOnly"],
        default: "friendsOnly",
      },
      tagApproval: { type: Boolean, default: false },
    },
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      frequency: {
        type: String,
        enum: ["instant", "daily", "weekly"],
        default: "daily",
      },
    },
    accountStatus: {
      type: String,
      enum: ["active", "deactivated", "banned"],
      default: "active",
    },
    twoFactorAuth: { type: Boolean, default: false },
    linkedAccounts: {
      facebook: { type: String },
      google: { type: String },
      twitter: { type: String },
    },
    dataSharingConsent: { type: Boolean, default: false },
  },
  activityInfo: {
    lastLogin: { type: Date },
    accountCreationDate: { type: Date, default: Date.now },
    recentActivity: [
      {
        type: {
          type: String,
          enum: ["post", "like", "comment"],
          required: true,
        },
        content: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    loginHistory: [
      {
        ipAddress: { type: String },
        location: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  contentPreferences: {
    interests: [{ type: String }],
    preferredContent: [{ type: String }],
    mutedWords: [{ type: String }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  subscriptions: {
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    renewalDate: { type: Date },
    paymentMethod: { type: String },
    paymentHistory: [
      {
        amount: { type: Number },
        date: { type: Date, default: Date.now },
        method: { type: String },
      },
    ],
  },
});

// Create and export the model
const User = mongoose.model<IUser>("User", UserSchema);
export default User;
