import mongoose, { Schema, Document } from 'mongoose';

/**
 * Book Interface
 */
export interface IBook extends Document {
  author: string;
  format: string;
  genre: string;
  publisher: string;
  series?: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Book Schema
 */
const BookSchema = new Schema<IBook>(
  {
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
      index: true
    },
    format: {
      type: String,
      required: [true, 'Format is required'],
      enum: ['Hardcover', 'Paperback', 'E-book', 'Audiobook'],
      index: true
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      trim: true,
      index: true
    },
    publisher: {
      type: String,
      required: [true, 'Publisher is required'],
      trim: true,
      index: true
    },
    series: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'books'
  }
);

// Compound indexes
BookSchema.index({ author: 1, title: 1 });
BookSchema.index({ genre: 1, format: 1 });
BookSchema.index({ publisher: 1, author: 1 });

// Text index for search
BookSchema.index({ title: 'text', author: 'text', genre: 'text', publisher: 'text' });

// Export model
export const Book = mongoose.model<IBook>('Book', BookSchema);
export default Book;