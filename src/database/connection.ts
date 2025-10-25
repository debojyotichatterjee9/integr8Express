import mongoose from 'mongoose';
import config from 'config';
import { winstonLogger } from '../utils/winston';
import loggernaut from 'loggernaut';

/**
 * MongoDB Connection Manager
 * Handles database connection lifecycle with retry logic
 */

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      winstonLogger.info('Already connected to MongoDB');
      return;
    }

    const dbConfig = config.get<DatabaseConfig>('database.mongodb');
    const { uri, options } = dbConfig;

    try {
      loggernaut.log(`Connecting to MongoDB --> ${this.sanitizeUri(uri)}`);

      await mongoose.connect(uri, options);

      this.isConnected = true;
      this.connectionAttempts = 0;

      loggernaut.log(`Successfully connected to MongoDB --> ${mongoose.connection.name}`);

      // Set up event listeners
      this.setupEventListeners();

    } catch (error: any) {
      this.connectionAttempts++;
      winstonLogger.error('MongoDB connection error:', {
        error: error.message,
        attempt: this.connectionAttempts,
        maxAttempts: this.MAX_RETRY_ATTEMPTS
      });

      // Retry logic
      if (this.connectionAttempts < this.MAX_RETRY_ATTEMPTS) {
        winstonLogger.info(`Retrying connection in ${this.RETRY_DELAY / 1000} seconds...`);
        await this.delay(this.RETRY_DELAY);
        return this.connect();
      } else {
        winstonLogger.error('Max connection attempts reached. Exiting...');
        throw new Error('Failed to connect to MongoDB after multiple attempts');
      }
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      winstonLogger.info('Not connected to MongoDB');
      return;
    }

    try {
      winstonLogger.info('Disconnecting from MongoDB...');
      await mongoose.connection.close(false);
      this.isConnected = false;
      winstonLogger.info('Successfully disconnected from MongoDB');
    } catch (error: any) {
      winstonLogger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    isConnected: boolean;
    readyState: number;
    host?: string;
    name?: string;
  } {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }

  /**
   * Setup MongoDB event listeners
   */
  private setupEventListeners(): void {
    // Connected event
    mongoose.connection.on('connected', () => {
      winstonLogger.info('MongoDB connection established');
    });

    // Error event
    mongoose.connection.on('error', (error) => {
      winstonLogger.error('MongoDB connection error:', error);
      this.isConnected = false;
    });

    // Disconnected event
    mongoose.connection.on('disconnected', () => {
      winstonLogger.warn('MongoDB disconnected');
      this.isConnected = false;
    });

    // Reconnected event
    mongoose.connection.on('reconnected', () => {
      winstonLogger.info('MongoDB reconnected');
      this.isConnected = true;
    });

    // Reconnect failed event
    mongoose.connection.on('reconnectFailed', () => {
      winstonLogger.error('MongoDB reconnection failed');
      this.isConnected = false;
    });

    // Process termination handling
    process.on('SIGINT', async () => {
      await this.disconnect();
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
    });
  }

  /**
   * Sanitize URI for logging (hide credentials)
   */
  private sanitizeUri(uri: string): string {
    try {
      const url = new URL(uri);
      if (url.username || url.password) {
        url.username = '****';
        url.password = '****';
      }
      return url.toString();
    } catch {
      return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for database
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        return false;
      }
      // Ping the database
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      winstonLogger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();
export default dbConnection;