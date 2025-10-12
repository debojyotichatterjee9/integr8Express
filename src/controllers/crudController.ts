import { Request, Response } from 'express';
import { Model, Document } from 'mongoose';
import { winstonLogger } from '../utils/winston';

/**
 * Generic CRUD Controller
 * Provides standard CRUD operations for any Mongoose model
 */

export class CRUDController<T extends Document> {
  private model: Model<T>;
  private modelName: string;

  constructor(model: Model<T>, modelName: string) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Create a new document
   * POST /api/:resource
   */
  public create = async (req: Request, res: Response): Promise<void> => {
    try {
      const document = new this.model(req.body);
      const savedDocument = await document.save();

      winstonLogger.info(`${this.modelName} created`, {
        id: savedDocument._id,
        pid: process.pid
      });

      res.status(201).json({
        success: true,
        message: `${this.modelName} created successfully`,
        data: savedDocument
      });
    } catch (error: any) {
      winstonLogger.error(`Error creating ${this.modelName}:`, error);

      if (error.name === 'ValidationError') {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map((e: any) => e.message)
        });
      } else if (error.code === 11000) {
        res.status(409).json({
          success: false,
          message: 'Duplicate key error',
          field: Object.keys(error.keyPattern)[0]
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Error creating ${this.modelName}`,
          error: error.message
        });
      }
    }
  };

  /**
   * Get all documents with pagination
   * GET /api/:resource?page=1&limit=10&sort=createdAt&order=desc
   */
  public getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sort = (req.query.sort as string) || 'createdAt';
      const order = (req.query.order as string) === 'asc' ? 1 : -1;
      const skip = (page - 1) * limit;

      // Build filter from query params
      const filter: any = {};
      Object.keys(req.query).forEach(key => {
        if (!['page', 'limit', 'sort', 'order', 'search'].includes(key)) {
          filter[key] = req.query[key];
        }
      });

      // Text search if search param exists
      if (req.query.search) {
        filter.$text = { $search: req.query.search as string };
      }

      const [documents, total] = await Promise.all([
        this.model
          .find(filter)
          .sort({ [sort]: order })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.model.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        success: true,
        data: documents,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error: any) {
      winstonLogger.error(`Error getting all ${this.modelName}:`, error);
      res.status(500).json({
        success: false,
        message: `Error retrieving ${this.modelName} list`,
        error: error.message
      });
    }
  };

  /**
   * Get a single document by ID
   * GET /api/:resource/:id
   */
  public getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const document = await this.model.findById(req.params.id);

      if (!document) {
        res.status(404).json({
          success: false,
          message: `${this.modelName} not found`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: document
      });
    } catch (error: any) {
      winstonLogger.error(`Error getting ${this.modelName} by ID:`, error);

      if (error.name === 'CastError') {
        res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Error retrieving ${this.modelName}`,
          error: error.message
        });
      }
    }
  };

  /**
   * Update a document by ID
   * PUT /api/:resource/:id
   */
  public update = async (req: Request, res: Response): Promise<void> => {
    try {
      const document = await this.model.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

      if (!document) {
        res.status(404).json({
          success: false,
          message: `${this.modelName} not found`
        });
        return;
      }

      winstonLogger.info(`${this.modelName} updated`, {
        id: document._id,
        pid: process.pid
      });

      res.status(200).json({
        success: true,
        message: `${this.modelName} updated successfully`,
        data: document
      });
    } catch (error: any) {
      winstonLogger.error(`Error updating ${this.modelName}:`, error);

      if (error.name === 'ValidationError') {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map((e: any) => e.message)
        });
      } else if (error.name === 'CastError') {
        res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Error updating ${this.modelName}`,
          error: error.message
        });
      }
    }
  };

  /**
   * Delete a document by ID
   * DELETE /api/:resource/:id
   */
  public delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const document = await this.model.findByIdAndDelete(req.params.id);

      if (!document) {
        res.status(404).json({
          success: false,
          message: `${this.modelName} not found`
        });
        return;
      }

      winstonLogger.info(`${this.modelName} deleted`, {
        id: document._id,
        pid: process.pid
      });

      res.status(200).json({
        success: true,
        message: `${this.modelName} deleted successfully`,
        data: document
      });
    } catch (error: any) {
      winstonLogger.error(`Error deleting ${this.modelName}:`, error);

      if (error.name === 'CastError') {
        res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
      } else {
        res.status(500).json({
          success: false,
          message: `Error deleting ${this.modelName}`,
          error: error.message
        });
      }
    }
  };

  /**
   * Get count of documents
   * GET /api/:resource/count
   */
  public count = async (req: Request, res: Response): Promise<void> => {
    try {
      const count = await this.model.countDocuments();

      res.status(200).json({
        success: true,
        count
      });
    } catch (error: any) {
      winstonLogger.error(`Error counting ${this.modelName}:`, error);
      res.status(500).json({
        success: false,
        message: `Error counting ${this.modelName}`,
        error: error.message
      });
    }
  };
}

export default CRUDController;