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

import { winstonLogger } from './utils/logger';
import createRestService from './services/rest';

/**
 * Start the Express server in standalone mode
 */
function startServer(): void {
    try {
        winstonLogger.info('Starting Express server in standalone mode', {
            nodeVersion: process.version,
            platform: process.platform,
            env: process.env.NODE_ENV || 'development'
        });

        // Create and start the REST service
        const server = createRestService();

        // Notify that server is ready (for process managers)
        if (process.send) {
            process.send('ready');
        }

        winstonLogger.info('Server started successfully in standalone mode');

    } catch (error) {
        winstonLogger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    winstonLogger.error('Uncaught exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    winstonLogger.error('Unhandled rejection:', { reason, promise });
    process.exit(1);
});

// Start the server
startServer();