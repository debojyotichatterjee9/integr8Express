import cluster, { Worker } from 'cluster';
import os from 'os';
import config from 'config';
import { winstonLogger } from './utils/winston';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Cluster Manager for Express TypeScript Application
 * Manages worker processes with graceful shutdown and health monitoring
 */

interface WorkerInfo {
    worker: Worker;
    restarts: number;
    lastRestart: number;
}

class ClusterManager {
    private workers: Map<number, WorkerInfo> = new Map();
    private isShuttingDown: boolean = false;
    private readonly MAX_RESTARTS: number;
    private readonly RESTART_WINDOW: number;
    private readonly SHUTDOWN_TIMEOUT: number;
    private readonly WORKER_READY_TIMEOUT: number;

    constructor() {
        // Load configuration
        this.MAX_RESTARTS = config.get<number>('cluster.maxRestarts');
        this.RESTART_WINDOW = config.get<number>('cluster.restartWindow');
        this.SHUTDOWN_TIMEOUT = config.get<number>('cluster.shutdownTimeout');
        this.WORKER_READY_TIMEOUT = config.get<number>('cluster.workerReadyTimeout');

        this.setupSignalHandlers();
    }

    /**
     * Set up workers based on CPU cores
     */
    public setupWorkerProcesses(): void {
        const port = process.env.PORT || config.get<any>('services.rest.port');
        const host = config.get<string>('services.rest.host');
        const numCores = process.env.WORKER_COUNT
            ? parseInt(process.env.WORKER_COUNT, 10)
            : os.cpus().length;

        // Validate worker count
        const maxWorkers = os.cpus().length * 2;
        const validatedCores = Math.max(1, Math.min(numCores, maxWorkers));

        if (validatedCores !== numCores) {
            winstonLogger.warn(`Adjusted worker count from ${numCores} to ${validatedCores}`);
        }

        winstonLogger.info(`Master cluster setting up ${validatedCores} workers`, {
            cpuCores: os.cpus().length,
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`
        });

        this.forkWorkers(validatedCores);
        this.setupClusterEventHandlers(host, port);
    }

    /**
     * Fork multiple workers
     */
    private forkWorkers(count: number): void {
        for (let i = 0; i < count; i++) {
            this.forkWorker();
        }
    }

    /**
     * Fork a single worker with proper tracking
     */
    private forkWorker(): Worker | null {
        if (this.isShuttingDown) {
            winstonLogger.info('Shutdown in progress, not forking new worker');
            return null;
        }

        const worker = cluster.fork();
        const pid = worker.process.pid!;

        this.workers.set(pid, {
            worker,
            restarts: 0,
            lastRestart: Date.now()
        });

        winstonLogger.debug(`Forked worker ${pid}`);

        // Set up message handling for this specific worker
        this.setupWorkerMessageHandler(worker);

        // Set up ready timeout
        this.setupWorkerReadyTimeout(worker);

        return worker;
    }

    /**
     * Handle messages from workers
     */
    private setupWorkerMessageHandler(worker: Worker): void {
        const messageHandler = (message: any) => {
            const pid = worker.process.pid;

            if (message?.type === 'ready') {
                winstonLogger.info(`Worker ${pid} is ready`);
            } else if (message?.type === 'shutdown-complete') {
                winstonLogger.info(`Worker ${pid} shutdown complete`);
                worker.disconnect();
            } else if (message?.type === 'health') {
                winstonLogger.debug(`Worker ${pid} health check:`, message.data);
            } else {
                winstonLogger.debug(`Worker ${pid} message:`, message);
            }
        };

        worker.on('message', messageHandler);

        // Clean up listener when worker exits
        worker.once('exit', () => {
            worker.removeListener('message', messageHandler);
        });
    }

    /**
     * Set up timeout for worker readiness
     */
    private setupWorkerReadyTimeout(worker: Worker): void {
        const timeout = setTimeout(() => {
            const pid = worker.process.pid;
            winstonLogger.error(`Worker ${pid} failed to become ready in time`);
            worker.kill('SIGTERM');
        }, this.WORKER_READY_TIMEOUT);

        const readyHandler = (message: any) => {
            if (message?.type === 'ready') {
                clearTimeout(timeout);
                worker.removeListener('message', readyHandler);
            }
        };

        worker.on('message', readyHandler);
    }

    /**
     * Set up cluster event handlers
     */
    private setupClusterEventHandlers(host: string, port: number): void {
        cluster.on('online', (worker) => {
            winstonLogger.info(`Worker ${worker.process.pid} online on http://${host}:${port}`);
        });

        cluster.on('disconnect', (worker) => {
            winstonLogger.info(`Worker ${worker.process.pid} disconnected`);
        });

        cluster.on('exit', (worker, code, signal) => {
            this.handleWorkerExit(worker, code, signal);
        });
    }

    /**
     * Handle worker exit with restart logic
     */
    private handleWorkerExit(worker: Worker, code: number, signal: string): void {
        const pid = worker.process.pid!;
        const workerInfo = this.workers.get(pid);

        winstonLogger.warn(`Worker ${pid} died`, {
            code,
            signal,
            exitedAfterDisconnect: worker.exitedAfterDisconnect
        });

        // Remove from workers map
        this.workers.delete(pid);

        // Don't restart if shutting down or if it was a graceful exit
        if (this.isShuttingDown || worker.exitedAfterDisconnect) {
            return;
        }

        // Check if we should restart based on exit code
        if (code === 0) {
            winstonLogger.info(`Worker ${pid} exited cleanly, not restarting`);
            return;
        }

        // Check restart limits to prevent crash loops
        if (workerInfo && this.shouldRestartWorker(workerInfo)) {
            winstonLogger.info(`Restarting worker to replace ${pid}`);
            const newWorker = this.forkWorker();

            if (newWorker && workerInfo) {
                const newPid = newWorker.process.pid!;
                const newWorkerInfo = this.workers.get(newPid);

                if (newWorkerInfo) {
                    // Track restarts within the time window
                    if (Date.now() - workerInfo.lastRestart < this.RESTART_WINDOW) {
                        newWorkerInfo.restarts = workerInfo.restarts + 1;
                    }
                    newWorkerInfo.lastRestart = Date.now();
                }
            }
        } else {
            winstonLogger.error(`Worker ${pid} exceeded restart limit`, {
                maxRestarts: this.MAX_RESTARTS,
                window: `${this.RESTART_WINDOW}ms`
            });
        }
    }

    /**
     * Determine if worker should be restarted
     */
    private shouldRestartWorker(workerInfo: WorkerInfo): boolean {
        const now = Date.now();

        // Reset restart count if outside the time window
        if (now - workerInfo.lastRestart > this.RESTART_WINDOW) {
            return true;
        }

        // Check if we've exceeded max restarts within the window
        return workerInfo.restarts < this.MAX_RESTARTS;
    }

    /**
     * Set up signal handlers for graceful shutdown
     */
    private setupSignalHandlers(): void {
        // Handle graceful shutdown signals
        const handleShutdown = (signal: string) => {
            this.gracefulShutdown(signal).catch(error => {
                winstonLogger.error(`Error during ${signal} shutdown:`, error);
                process.exit(1);
            });
        };

        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
        process.on('SIGINT', () => handleShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            winstonLogger.error('Uncaught exception in master process:', error);
            this.gracefulShutdown('UNCAUGHT_EXCEPTION')
                .catch(err => winstonLogger.error('Error during uncaught exception shutdown:', err))
                .finally(() => process.exit(1));
        });

        process.on('unhandledRejection', (reason, promise) => {
            winstonLogger.error('Unhandled rejection in master process:', { reason, promise });
        });
    }

    /**
     * Graceful shutdown of all workers
     */
    private async gracefulShutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) {
            winstonLogger.warn('Shutdown already in progress');
            return;
        }

        this.isShuttingDown = true;
        winstonLogger.info(`Received ${signal}, initiating graceful shutdown`);

        const shutdownPromises: Promise<void>[] = [];

        // Notify all workers to shut down
        for (const [pid, workerInfo] of this.workers.entries()) {
            const promise = this.shutdownWorker(workerInfo.worker, pid);
            shutdownPromises.push(promise);
        }

        try {
            // Wait for all workers to shut down gracefully
            await Promise.race([
                Promise.all(shutdownPromises),
                this.createTimeout(this.SHUTDOWN_TIMEOUT, 'Worker shutdown timeout')
            ]);

            winstonLogger.info('All workers shut down gracefully');
        } catch (error) {
            winstonLogger.error('Error during graceful shutdown:', error);
        }

        // Force kill any remaining workers
        for (const [pid, workerInfo] of this.workers.entries()) {
            if (workerInfo.worker.isConnected()) {
                winstonLogger.warn(`Force killing worker ${pid}`);
                workerInfo.worker.kill('SIGKILL');
            }
        }

        winstonLogger.info('Server shutdown complete');
        process.exit(0);
    }

    /**
     * Shutdown a single worker gracefully
     */
    private shutdownWorker(worker: Worker, pid: number): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                winstonLogger.warn(`Worker ${pid} did not respond to shutdown, disconnecting`);
                worker.disconnect();
                resolve();
            }, 10000);

            const exitHandler = () => {
                clearTimeout(timeout);
                resolve();
            };

            worker.once('exit', exitHandler);

            // Send shutdown message to worker
            try {
                worker.send({ type: 'shutdown' });
            } catch (error) {
                winstonLogger.error(`Error sending shutdown to worker ${pid}:`, error);
                clearTimeout(timeout);
                worker.disconnect();
                resolve();
            }
        });
    }

    /**
     * Create a timeout promise
     */
    private createTimeout(ms: number, message: string): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), ms);
        });
    }
}

/**
 * Worker process setup with Express REST service
 */
async function setupWorkerProcess(): Promise<void> {
    try {
        winstonLogger.info(`Worker ${process.pid} starting`);

        // Start Express REST service
        const createRestService = require('../services/rest').default;
        createRestService();

        // Notify master that worker is ready
        if (process.send) {
            process.send({ type: 'ready' });
        }

        // Set up health check reporting
        setupHealthCheck();

    } catch (err: any) {
        winstonLogger.error(`Worker ${process.pid} failed to start:`, err);
        process.exit(1);
    }
}

/**
 * Send periodic health checks to master
 */
function setupHealthCheck(): void {
    setInterval(() => {
        if (process.send) {
            process.send({
                type: 'health',
                data: {
                    pid: process.pid,
                    memory: process.memoryUsage(),
                    uptime: process.uptime()
                }
            });
        }
    }, 30000); // Every 30 seconds
}

/**
 * Main entry point
 */
function setupServer(isClusterRequired: boolean): void {
    if (isClusterRequired && cluster.isPrimary) {
        const clusterManager = new ClusterManager();
        clusterManager.setupWorkerProcesses();
    } else {
        setupWorkerProcess().catch((error) => {
            winstonLogger.error('Failed to start worker process:', error);
            process.exit(1);
        });
    }
}

// Determine if clustering should be enabled
const clusteringEnabled =
    process.env.NODE_ENV === 'production' ||
    process.env.CLUSTERING === 'true' ||
    config.get<boolean>('cluster.enabled');

// Start the server
setupServer(clusteringEnabled);