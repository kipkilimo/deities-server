import mongoose, { Schema, Document } from "mongoose";
import User from "./User"; // Adjust import to match your User model location
import Payment from "./Payment"; // Adjust import to match your Payment model location

// Define Course interface
export interface ICourse extends Document {
  courseId: string;
  courseName: string;
  courseCode: string;
  credits: number;
}

// Define Program interface
export interface IProgram extends Document {
  programId: string;
  name: string;
  degree: string;
  duration: number;
  requiredCredits: number;
  coursesOffered: ICourse[];
  payments: mongoose.Types.ObjectId[]; // Reference to Payment documents
}

// Define Department interface
export interface IDepartment extends Document {
  departmentId: string;
  name: string;
  faculty: mongoose.Types.ObjectId[]; // Reference to User documents
  programs: IProgram[];
  students: mongoose.Types.ObjectId[]; // Reference to User documents
}

// Course schema
const CourseSchema: Schema = new Schema({
  courseId: { type: String, required: true, unique: true },
  courseName: { type: String, required: true },
  courseCode: { type: String, required: true },
  credits: { type: Number, required: true, min: 1 },
});

// Program schema
const ProgramSchema: Schema = new Schema({
  programId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  degree: { type: String, required: true },
  duration: { type: Number, required: true, min: 1 }, // duration in years
  requiredCredits: { type: Number, required: true, min: 1 },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Reference to User model

  coursesOffered: [CourseSchema], // Embedded array of courses
  payments: String, // Reference to Payment model
});

// Department schema
const DepartmentSchema: Schema = new Schema({
  departmentId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  faculty: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Reference to User model
  programs: [ProgramSchema], // Embedded array of programs
  payments: String, // Reference to Payment model
  parent_institution: String,
  phone_number: String,
  email_address: String,
});
const Department = mongoose.model<IDepartment>("Department", DepartmentSchema);
export default Department;
// Export Department model as default
