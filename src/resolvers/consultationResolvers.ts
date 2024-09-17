import { PubSub } from "graphql-subscriptions";
import mongoose, { Document } from "mongoose";
import Consultation from "../models/Consultation";
import { StudyStage } from "../models/Consultation"; // Import StudyStage enum if needed

const pubsub = new PubSub();

// Define types for GraphQL arguments and return types
interface Context {
  pubsub: PubSub;
}

interface QueryArgs {
  id: string;
  status?: "OPEN" | "TAKEN" | "CLOSED";
}

interface MutationArgs {
  title: string;
  description: string;
  studentId: string;
  ConsultationId?: string;
  mentorId?: string;
  senderId?: string;
  content?: string;
}

const consultationResolver = {
  Query: {
    async getConsultation(_: any, { id }: { id: string }, context: Context) {
      try {
        const objectId = new mongoose.Types.ObjectId(id); // Convert string to ObjectId
        const consultation = await Consultation.findById(objectId)
          .populate("studentId")
          .populate("mentorId")
          .exec();
        return consultation;
      } catch (error) {
        console.error("Error fetching Consultation:", error);
        throw new Error("Failed to fetch Consultation");
      }
    },

    async listConsultations(_: any, { status }: QueryArgs, context: Context) {
      try {
        const filter: any = {};
        if (status) {
          filter.status = status;
        }
        const consultations = await Consultation.find(filter)
          .populate("studentId")
          .populate("mentorId")
          .exec();
        return consultations;
      } catch (error) {
        console.error("Error listing Consultations:", error);
        throw new Error("Failed to list Consultations");
      }
    },
  },

  Mutation: {
    async openConsultation(
      _: any,
      { title, description, studentId }: MutationArgs
    ) {
      try {
        const objectId = new mongoose.Types.ObjectId(studentId); // Convert string to ObjectId
        const consultation = new Consultation({
          title,
          description,
          studentId: objectId,
          createdAt: new Date(),
          status: "OPEN",
        });
        await consultation.save();
        return consultation;
      } catch (error) {
        console.error("Error opening Consultation:", error);
        throw new Error("Failed to open Consultation");
      }
    },

    async takeConsultation(_: any, { ConsultationId, mentorId }: MutationArgs) {
      try {
        const objectId = new mongoose.Types.ObjectId(ConsultationId); // Convert string to ObjectId
        const consultation = await Consultation.findById(objectId).exec();
        if (consultation) {
          consultation.status = "TAKEN";
          consultation.updatedAt = new Date();
          await consultation.save();
          pubsub.publish("Consultation_UPDATED", {
            ConsultationUpdated: consultation,
          });
        }
        return consultation;
      } catch (error) {
        console.error("Error taking Consultation:", error);
        throw new Error("Failed to take Consultation");
      }
    },

    async sendMessage(
      _: any,
      { ConsultationId, senderId, content }: MutationArgs
    ) {
      try {
        // Message functionality removed in this version
        throw new Error("sendMessage is not supported in this version");
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      }
    },

    async closeConsultation(_: any, { ConsultationId }: MutationArgs) {
      try {
        const objectId = new mongoose.Types.ObjectId(ConsultationId); // Convert string to ObjectId
        const consultation = await Consultation.findById(objectId).exec();
        if (consultation) {
          consultation.status = "CLOSED";
          consultation.closedAt = new Date();
          await consultation.save();
          pubsub.publish("Consultation_UPDATED", {
            ConsultationUpdated: consultation,
          });
        }
        return consultation;
      } catch (error) {
        console.error("Error closing Consultation:", error);
        throw new Error("Failed to close Consultation");
      }
    },
  },

  Subscription: {
    ConsultationUpdated: {
      subscribe(_: any, { ConsultationId }: { ConsultationId: string }) {
        return pubsub.asyncIterator(["Consultation_UPDATED"]);
      },
    },
  },
};

export default consultationResolver;
