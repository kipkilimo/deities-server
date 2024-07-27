import mongoose, { Document, Schema } from 'mongoose';
import { Locality } from '../utils/enums'; // Import the Locality enum

export interface IDeity extends Document {
  name: string;
  locality: Locality;
  parents?: string[];
  description: string;
  siblings?: string[];
  domain: string;
  gallery?: string[];
  favs?: number;
  rating?: number;
  shared?: number;
  children?: string[];
  isMortal?: boolean;
}

const DeitySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  parents: [{
    type: String,
    required: true,
  }],
  description: {
    type: String,
    required: true,
  },
  siblings: [{
    type: String,
  }],
  domain: {
    type: String,
    required: true,
  },
  locality: {
    type: String,
    enum: Object.values(Locality),  
    required: true,
  },
  gallery: [{
    type: String,
  }],
  favs: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  shared: {
    type: Number,
    default: 0
  },
  children: [{
    type: String,
  }],
  isMortal: {
    type: Boolean,
    default: true,
  },


});

const Deity = mongoose.model<IDeity>('Deity', DeitySchema);
export default Deity;
