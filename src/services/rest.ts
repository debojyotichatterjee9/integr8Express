import http from 'http';
import config from 'config';
import { winstonLogger } from '../utils/winston';
import { createApp } from '../app';

/**
 * REST Service with graceful shutdown support
 * This wraps the Express app in an HTTP server with lifecycle management
 */
export function createRestService(): http.Server {
    const app = createApp();
    const port = process.env.PORT || config.get<any>('services.rest.port');
    const host = config.get<string>('services.rest.host');

    // Create HTTP server
    const server = http.createServer(app);

    // Track active connections for graceful shutdown
    const connections = new Set<any>();
    let isShuttingDown = false;

    server.on('connection', (connection) => {
        connections.add(connection);

        connection.on('close', () => {
            connections.delete(connection);
        });
    });

    // Reject new connections during shutdown
    server.on('request', (req, res) => {
        if (isShuttingDown) {
            res.setHeader('Connection', 'close');
        }
    });

    // Start server
    server.listen(port, () => {
        winstonLogger.info(`Worker ${process.pid} Express server listening`, {
            host,
            port,
            env: process.env.NODE_ENV || 'development'
        });
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

        switch (error.code) {
            case 'EACCES':
                winstonLogger.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                winstonLogger.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    /**
     * Graceful shutdown handler
     * Stops accepting new connections and waits for existing ones to finish
     */
    const shutdown = async (): Promise<void> => {
        if (isShuttingDown) {
            winstonLogger.warn(`Worker ${process.pid} shutdown already in progress`);
            return;
        }

        isShuttingDown = true;
        winstonLogger.info(`Worker ${process.pid} starting HTTP server shutdown`);

        // Stop accepting new connections
        server.close(() => {
            winstonLogger.info(`Worker ${process.pid} HTTP server closed`);
        });

        // Give existing connections time to finish (10 seconds)
        const shutdownTimeout = setTimeout(() => {
            winstonLogger.warn(`Worker ${process.pid} forcing connection closure`, {
                activeConnections: connections.size
            });

            connections.forEach((connection) => {
                connection.destroy();
            });
        }, 10000);

        // Wait for all connections to close naturally
        const checkConnections = setInterval(() => {
            if (connections.size === 0) {
                clearInterval(checkConnections);
                clearTimeout(shutdownTimeout);
                winstonLogger.info(`Worker ${process.pid} all connections closed`);
            }
        }, 100);
    };

    // Handle shutdown messages from cluster master
    process.on('message', (message: any) => {
        if (message?.type === 'shutdown') {
            shutdown().then(() => {
                // Notify master that shutdown is complete
                if (process.send) {
                    process.send({ type: 'shutdown-complete' });
                }
            }).catch((error) => {
                winstonLogger.error(`Worker ${process.pid} shutdown error:`, error);
            });
        }
    });

    // Handle direct signals to worker (when not using cluster)
    process.on('SIGTERM', () => {
        winstonLogger.info(`Worker ${process.pid} received SIGTERM`);
        shutdown().then(() => {
            setTimeout(() => process.exit(0), 1000);
        });
    });

    process.on('SIGINT', () => {
        winstonLogger.info(`Worker ${process.pid} received SIGINT`);
        shutdown().then(() => {
            setTimeout(() => process.exit(0), 1000);
        });
    });

    return server;
}

export default createRestService;