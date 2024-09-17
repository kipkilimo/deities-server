import mongoose, { Schema, Document, Model, ObjectId } from "mongoose";

// Define an enum for Study Stages
export enum StudyStage {
  CONCEPTUALIZATION = "CONCEPTUALIZATION",
  PROPOSAL_DEVELOPMENT = "PROPOSAL_DEVELOPMENT",
  ETHICAL_CONSIDERATIONS = "ETHICAL_CONSIDERATIONS",
  POWER_SAMPLE_SIZE_CALCULATION = "POWER_SAMPLE_SIZE_CALCULATION",
  FIELD_ACTIVITY = "FIELD_ACTIVITY",
  REPORT_WRITING = "REPORT_WRITING",
  DISCUSSION = "DISCUSSION",
  MANUSCRIPT_DEVELOPMENT = "MANUSCRIPT_DEVELOPMENT",
}

// Define an interface for the Consultation Document
interface ConsultationDocument extends Document {
  title: string;
  description: string;
  createdAt: Date;
  updatedAt?: Date | null;
  status: "OPEN" | "TAKEN" | "CLOSED";
  studentId: ObjectId;
  mentorId?: ObjectId | null;
  closedAt?: Date | null;
  studyStage?: StudyStage; // Added studyStage field
}

// Main Consultation Schema
const consultationSchema = new Schema<ConsultationDocument>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  status: {
    type: String,
    enum: ["OPEN", "TAKEN", "CLOSED"],
    default: "OPEN",
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  closedAt: { type: Date },
  studyStage: {
    type: String,
    enum: Object.values(StudyStage), // Use the StudyStage enum values
  },
});

// Define the model based on the schema and the interface
const Consultation: Model<ConsultationDocument> =
  mongoose.model<ConsultationDocument>("Consultation", consultationSchema);

export default Consultation;
