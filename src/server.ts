#!/usr/bin/env node

/**
 * Standalone Server Entry Point (No Clustering)
 *
 * This file is used when you want to run a single process
 * without cluster management. Useful for development or
 * when running behind a process manager like PM2.
 *
 * Use this with: npm run dev:single
 */
import dotenv from 'dotenv';                  // Import dotenv to load environment variables
import { winstonLogger } from './utils/winston';  // Custom Winston logger instance
import createRestService from './services/rest';  // Function that sets up and returns an Express server
import loggernaut from 'loggernaut';              // Logger utility

// Load environment variables from .env file into process.env
dotenv.config();

/**
 * Start the Express server in standalone mode
 */
function startServer(): void {
    try {
        // Log that the server boot sequence has started
        loggernaut.log('Starting Express server in standalone mode');

        // Initialize and start the REST/Express service
        // (createRestService returns the running server instance)
        const server = createRestService();

        // If running under a process manager (like PM2), notify that the app is ready
        if (process.send) {
            process.send('ready');
        }

        // Log that the server has successfully started
        loggernaut.log('Server started successfully in standalone mode');

    } catch (error) {
        // Log startup failure details
        loggernaut.error('Failed to start server:');
        loggernaut.error(error);

        // Exit with error code 1 to signal failure
        process.exit(1);
    }
}

// Handle uncaught exceptions (errors thrown outside try/catch)
process.on('uncaughtException', (error) => {
    // Log the exception through Winston
    loggernaut.error('Uncaught exception:');
    loggernaut.error(error);

    // Exit process to avoid undefined state
    process.exit(1);
});

// Handle promises that reject without a catch handler
process.on('unhandledRejection', (reason, promise) => {
    // Log information about the unhandled rejection
    loggernaut.error('Unhandeled Rejection:');
    winstonLogger.error({ reason, promise });

    // Exit process to ensure stability
    process.exit(1);
});

// Start the standalone server
startServer();
