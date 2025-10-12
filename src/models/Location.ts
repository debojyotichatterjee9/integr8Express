import mongoose, { Schema, Document } from 'mongoose';

/**
 * Coordinates nested interface
 */
export interface ICoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Address nested interface
 */
export interface IAddress {
  buildingNumber: string;
  street: string;
  streetAddress: string;
  secondaryAddress?: string;
}

/**
 * Location Interface
 */
export interface ILocation extends Document {
  address: IAddress;
  cardinalDirection: string;
  city: string;
  continent: string;
  coordinates: ICoordinates;
  country: string;
  countryCode: string;
  county?: string;
  direction: string;
  language: string;
  ordinalDirection: string;
  state: string;
  timeZone: string;
  zipCode: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Coordinates Sub-schema with 2dsphere support
 */
const CoordinatesSchema = new Schema<ICoordinates>(
  {
    latitude: { 
      type: Number, 
      required: true,
      min: -90,
      max: 90
    },
    longitude: { 
      type: Number, 
      required: true,
      min: -180,
      max: 180
    }
  },
  { _id: false }
);

/**
 * Address Sub-schema
 */
const AddressSchema = new Schema<IAddress>(
  {
    buildingNumber: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    secondaryAddress: { type: String, trim: true }
  },
  { _id: false }
);

/**
 * Location Schema
 */
const LocationSchema = new Schema<ILocation>(
  {
    address: {
      type: AddressSchema,
      required: true
    },
    cardinalDirection: {
      type: String,
      required: [true, 'Cardinal direction is required'],
      enum: ['N', 'S', 'E', 'W'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true
    },
    continent: {
      type: String,
      required: [true, 'Continent is required'],
      trim: true,
      index: true
    },
    coordinates: {
      type: CoordinatesSchema,
      required: true
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      index: true
    },
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    county: {
      type: String,
      trim: true
    },
    direction: {
      type: String,
      required: [true, 'Direction is required'],
      trim: true
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      trim: true,
      index: true
    },
    ordinalDirection: {
      type: String,
      required: [true, 'Ordinal direction is required'],
      enum: ['NE', 'SE', 'SW', 'NW'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true
    },
    timeZone: {
      type: String,
      required: [true, 'Time zone is required'],
      trim: true,
      index: true
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      trim: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'locations'
  }
);

// Geospatial index for location-based queries
LocationSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 });

// Compound indexes
LocationSchema.index({ country: 1, state: 1, city: 1 });
LocationSchema.index({ countryCode: 1, zipCode: 1 });
LocationSchema.index({ continent: 1, country: 1 });

// Text index for search
LocationSchema.index({ 
  city: 'text', 
  state: 'text', 
  country: 'text', 
  'address.street': 'text',
  'address.streetAddress': 'text'
});

// Export model
export const Location = mongoose.model<ILocation>('Location', LocationSchema);
export default Location;