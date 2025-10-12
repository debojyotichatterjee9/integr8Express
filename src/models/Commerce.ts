
import mongoose, { Schema, Document } from 'mongoose';

/**
 * Product Details nested interface
 */
export interface IProductDetails {
  adjective: string;
  description: string;
  material: string;
  name: string;
}

/**
 * Commerce Interface
 */
export interface ICommerce extends Document {
  department: string;
  isbn: string;
  price: number;
  product: string;
  productDetails: IProductDetails;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product Details Sub-schema
 */
const ProductDetailsSchema = new Schema<IProductDetails>(
  {
    adjective: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    material: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true }
  },
  { _id: false }
);

/**
 * Commerce Schema
 */
const CommerceSchema = new Schema<ICommerce>(
  {
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      trim: true,
      unique: true,
      index: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      index: true
    },
    product: {
      type: String,
      required: [true, 'Product is required'],
      trim: true,
      index: true
    },
    productDetails: {
      type: ProductDetailsSchema,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'commerce'
  }
);

// Compound indexes
CommerceSchema.index({ department: 1, price: -1 });
CommerceSchema.index({ 'productDetails.name': 1, department: 1 });

// Text index for search
CommerceSchema.index({ 
  product: 'text', 
  department: 'text', 
  'productDetails.name': 'text', 
  'productDetails.description': 'text' 
});

// Export model
export const Commerce = mongoose.model<ICommerce>('Commerce', CommerceSchema);
export default Commerce;