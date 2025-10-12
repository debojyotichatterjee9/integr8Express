import mongoose, { Schema, Document } from 'mongoose';

/**
 * Buzz Phrase nested interface
 */
export interface IBuzzPhrase {
  adjective: string;
  noun: string;
  phrase: string;
  verb: string;
}

/**
 * Catch Phrase nested interface
 */
export interface ICatchPhrase {
  adjective: string;
  descriptor: string;
  noun: string;
  phrase: string;
}

/**
 * Company Interface
 */
export interface ICompany extends Document {
  buzzPhrase: IBuzzPhrase;
  catchPhrase: ICatchPhrase;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Buzz Phrase Sub-schema
 */
const BuzzPhraseSchema = new Schema<IBuzzPhrase>(
  {
    adjective: { type: String, required: true, trim: true },
    noun: { type: String, required: true, trim: true },
    phrase: { type: String, required: true, trim: true },
    verb: { type: String, required: true, trim: true }
  },
  { _id: false }
);

/**
 * Catch Phrase Sub-schema
 */
const CatchPhraseSchema = new Schema<ICatchPhrase>(
  {
    adjective: { type: String, required: true, trim: true },
    descriptor: { type: String, required: true, trim: true },
    noun: { type: String, required: true, trim: true },
    phrase: { type: String, required: true, trim: true }
  },
  { _id: false }
);

/**
 * Company Schema
 */
const CompanySchema = new Schema<ICompany>(
  {
    buzzPhrase: {
      type: BuzzPhraseSchema,
      required: true
    },
    catchPhrase: {
      type: CatchPhraseSchema,
      required: true
    },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      unique: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'companies'
  }
);

// Text index for search
CompanySchema.index({ 
  name: 'text', 
  'buzzPhrase.phrase': 'text', 
  'catchPhrase.phrase': 'text' 
});

// Export model
export const Company = mongoose.model<ICompany>('Company', CompanySchema);
export default Company;