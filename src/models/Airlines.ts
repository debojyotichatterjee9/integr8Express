import mongoose, { Schema, Document } from 'mongoose';

/**
 * Airline Interface
 */
export interface IAirline extends Document {
  aircraftType: string;
  airline: string;
  airplane: string;
  airport: string;
  flightNumber: string;
  recordLocator: string;
  seat: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Airline Schema
 */
const AirlineSchema = new Schema<IAirline>(
  {
    aircraftType: {
      type: String,
      required: [true, 'Aircraft type is required'],
      trim: true,
      index: true
    },
    airline: {
      type: String,
      required: [true, 'Airline is required'],
      trim: true,
      index: true
    },
    airplane: {
      type: String,
      required: [true, 'Airplane is required'],
      trim: true
    },
    airport: {
      type: String,
      required: [true, 'Airport is required'],
      trim: true,
      index: true
    },
    flightNumber: {
      type: String,
      required: [true, 'Flight number is required'],
      trim: true,
      unique: true,
      index: true
    },
    recordLocator: {
      type: String,
      required: [true, 'Record locator is required'],
      trim: true,
      unique: true,
      uppercase: true
    },
    seat: {
      type: String,
      required: [true, 'Seat is required'],
      trim: true,
      uppercase: true
    }
  },
  {
    timestamps: true,
    collection: 'airlines'
  }
);

// Compound indexes
AirlineSchema.index({ airline: 1, flightNumber: 1 });
AirlineSchema.index({ airport: 1, airline: 1 });

// Text index for search
AirlineSchema.index({ airline: 'text', airport: 'text', flightNumber: 'text' });

// Export model
export const Airline = mongoose.model<IAirline>('Airline', AirlineSchema);
export default Airline;