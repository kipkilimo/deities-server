import mongoose from "mongoose";
const { Schema } = mongoose;

// Define the Location schema
const locationSchema = new Schema({
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "" },
});

// Define the Publication schema
const publicationSchema = new Schema({
  title: { type: String, required: true },
  journal: { type: String, required: true },
  year: { type: Number, required: true },
  url: { type: String, default: "" },
});

// Define the Collaboration schema
const collaborationSchema = new Schema({
  collaboratorName: { type: String, default: "" },
  institution: { type: String, default: "" },
  projectTitle: { type: String, default: "" },
});

// Define the PersonalInfo schema
const personalInfoSchema = new Schema({
  scholarId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  institution: { type: String },
  department: { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  publication_credits: { type: String, default: "0" },

  bio: { type: String, default: "" },
  dateOfBirth: { type: String, default: "" },
  gender: { type: String, default: "" },
  location: locationSchema,
  username: { type: String, default: "" },
  website: { type: String, default: "" },
  activationToken: { type: String, default: "" },
  resetToken: { type: String, default: "" },
  tokenExpiry: { type: String, default: "" },
  activatedAccount: { type: Boolean, default: false },
});

// Define the AcademicInfo schema
const academicInfoSchema = new Schema({
  researchInterests: { type: [String], required: true },
  publications: [publicationSchema],
  ongoingProjects: { type: [String], default: [] },
  collaborations: [collaborationSchema],
});

// Define the PrivacySettings schema
const privacySettingsSchema = new Schema({
  profileVisibility: { type: String, required: true },
});

// Define the NotificationSettings schema
const notificationSettingsSchema = new Schema({
  emailNotifications: { type: Boolean, required: true },
});

// Define the AccountSettings schema
const accountSettingsSchema = new Schema({
  privacySettings: privacySettingsSchema,
  notificationSettings: notificationSettingsSchema,
});

// Define the ActivityInfo schema
const activityInfoSchema = new Schema({
  lastLogin: { type: Date, default: null },
  accountCreationDate: { type: Date, required: true },
});

// Define the User schema
const userSchema = new Schema({
  personalInfo: { type: personalInfoSchema, required: true },
  academicInfo: { type: academicInfoSchema, required: true },
  accountSettings: { type: accountSettingsSchema, required: true },
  activityInfo: { type: activityInfoSchema, required: true },
  role: {
    type: String,
    enum: ["STUDENT", "MENTOR", "FACULTY", "ASSISTANT", "ADMIN", "SUPER"],
    default: "STUDENT",
  },
  discussion_groups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "DiscussionGroup", // Ensure DiscussionGroup model exists
    },
  ],
  departments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Department", // Ensure Department model exists
    },
  ],
  favorite_resources: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Resource", // Ensure Resource model exists
    },
  ],
  recent_resources: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Resource", // Ensure Resource model exists
    },
  ],
  suggested_resources: [
    {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Resource", // Ensure Resource model exists
    },
  ],
});

// Create the User model
const User = mongoose.model("User", userSchema);
// Method to find a user by email
userSchema.statics.findByEmail = async function (email) {
  return await this.findOne({ "personalInfo.email": email });
};
export default User;
