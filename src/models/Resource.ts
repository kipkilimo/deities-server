import mongoose, { Document, Schema } from "mongoose";

// Define enums for resource types
enum ResourceType {
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  IMAGES = "IMAGES",
  DOCUMENT = "DOCUMENT",
  MIXED = "MIXED",
  TEXT = "TEXT",
  PRESENTATION = "PRESENTATION",
  EVENT = "EVENT",
  DATASET = "DATASET",
  LINK = "LINK",
  POLL = "POLL",
  TEST = "TEST",
  POSTER = "POSTER",
  ARTICLE = "ARTICLE",
  JOB = "JOB",
  TASK = "TASK",
}

// Define the interface for the Resource schema
export interface IResource extends Document {
  title: string;
  description?: string;
  content: string;
  targetRegion?: string;
  targetCountry?: string;
  slug?: string;
  language?: string;
  contentType: ResourceType; // Enum for resource types
  viewsNumber?: number;
  likesNumber?: number;
  sharesNumber?: number;
  rating: string;
  questions: string;
  metaInfo: string;
  sessionId: string;
  subject: string;
  topic: string;
  accessKey: string;
  keywords?: string;
  coverImage?: string;
  isPublished?: boolean;
  averageRating?: number;
  reviews?: string; // mongoose.Schema.Types.ObjectId[];
  participants: mongoose.Schema.Types.ObjectId[];
  createdBy: mongoose.Schema.Types.ObjectId;
  createdAt?: Date;
}

// Define the schema for the Resource
const ResourceSchema: Schema<IResource> = new Schema(
  {
    title: {
      type: String,
      trim: true,
      required: [true, "Add a title for the resource"],
    },
    description: {
      type: String,
      trim: true,
      minlength: [5, "Description is too short, use at least 5 characters"],
      maxlength: [355, "Description cannot be more than 355 characters"],
      default: "Default resource description",
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    targetRegion: {
      type: String,
      trim: true,
    },
    rating: {
      type: String,
      default: "",
    },
    questions: {
      type: String,
      default: "",
    },
    accessKey: {
      type: String,
      default: "",
    },
    sessionId: {
      type: String,
    },
    targetCountry: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    topic: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    contentType: {
      type: String,
      enum: Object.values(ResourceType),
      required: [true, "Specify the resource type"],
    },
    viewsNumber: {
      type: Number,
      default: 0,
    },
    likesNumber: {
      type: Number,
      default: 0,
    },
    sharesNumber: {
      type: Number,
      default: 0,
    },
    metaInfo: { type: String, trim: true, default: "" },
    keywords: { type: String, trim: true },
    coverImage: {
      type: String,
      trim: true,
      default:
        "https://epidemiology.sph.brown.edu/sites/default/files/styles/ultrawide_med/public/2022-04/cer-banner-minimal.png",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    reviews: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);
const Resource = mongoose.model<IResource>("Resource", ResourceSchema);
export default Resource;
