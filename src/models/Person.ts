import mongoose, { Schema, Document } from 'mongoose';

/**
 * Person Interface
 */
export interface IPerson extends Document {
  bio: string;
  firstName: string;
  fullName: string;
  gender: string;
  jobArea: string;
  jobDescriptor: string;
  jobTitle: string;
  jobType: string;
  lastName: string;
  middleName?: string;
  prefix?: string;
  sex: string;
  sexType: string;
  suffix?: string;
  zodiacSign: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Person Schema
 */
const PersonSchema = new Schema<IPerson>(
  {
    bio: {
      type: String,
      required: [true, 'Bio is required'],
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      trim: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      index: true
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      trim: true
    },
    jobArea: {
      type: String,
      required: [true, 'Job area is required'],
      trim: true,
      index: true
    },
    jobDescriptor: {
      type: String,
      required: [true, 'Job descriptor is required'],
      trim: true
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      index: true
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      index: true
    },
    middleName: {
      type: String,
      trim: true
    },
    prefix: {
      type: String,
      trim: true
    },
    sex: {
      type: String,
      required: [true, 'Sex is required'],
      enum: ['male', 'female'],
      index: true
    },
    sexType: {
      type: String,
      required: [true, 'Sex type is required'],
      trim: true
    },
    suffix: {
      type: String,
      trim: true
    },
    zodiacSign: {
      type: String,
      required: [true, 'Zodiac sign is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'persons'
  }
);

// Compound indexes for common queries
PersonSchema.index({ firstName: 1, lastName: 1 });
PersonSchema.index({ jobArea: 1, jobTitle: 1 });

// Text index for search
PersonSchema.index({ firstName: 'text', lastName: 'text', fullName: 'text', bio: 'text' });

// Virtual for full name construction (if needed)
PersonSchema.virtual('constructedFullName').get(function () {
  return `${this.prefix || ''} ${this.firstName} ${this.middleName || ''} ${this.lastName} ${this.suffix || ''}`.trim();
});

// Export model
export const Person = mongoose.model<IPerson>('Person', PersonSchema);
export default Person;