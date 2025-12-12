import cluster, { Worker } from 'cluster';       // Node.js cluster module for multi-process management
import os from 'os';                             // Provides CPU/memory info
import config from 'config';                     // Loads configuration settings
import { winstonLogger } from './utils/winston'; // Winston logger for structured logging
import dotenv from 'dotenv';                     // Loads environment variables
import createRestService from './services/rest'; // Function that starts the Express REST API
import loggernaut from 'loggernaut';              // Logger utility

// Load environment variables from .env file
dotenv.config();

/**
 * Cluster Manager for Express TypeScript Application
 * Manages worker processes with graceful shutdown and health monitoring
 */

interface WorkerInfo {
    worker: Worker;       // Worker instance reference
    restarts: number;     // Number of times this worker restarted recently
    lastRestart: number;  // Timestamp of last restart
}

class ClusterManager {
    private workers: Map<number, WorkerInfo> = new Map();  // Tracks workers by PID
    private isShuttingDown: boolean = false;               // Prevents new forks during shutdown
    private readonly MAX_RESTARTS: number;                 // Max restarts allowed in time window
    private readonly RESTART_WINDOW: number;               // Time window to track restarts
    private readonly SHUTDOWN_TIMEOUT: number;             // Max wait during graceful shutdown
    private readonly WORKER_READY_TIMEOUT: number;         // Max time for worker to signal readiness

    constructor() {
        // Load cluster-related config options
        this.MAX_RESTARTS = config.get<number>('cluster.maxRestarts');
        this.RESTART_WINDOW = config.get<number>('cluster.restartWindow');
        this.SHUTDOWN_TIMEOUT = config.get<number>('cluster.shutdownTimeout');
        this.WORKER_READY_TIMEOUT = config.get<number>('cluster.workerReadyTimeout');

        this.setupSignalHandlers(); // Register shutdown and error handlers
    }

    /**
     * Set up workers based on CPU cores
     */
    public setupWorkerProcesses(): void {
        const port = process.env.PORT || config.get<any>('services.rest.port');
        const host = config.get<string>('services.rest.host');
        const numCores = process.env.WORKER_COUNT
            ? parseInt(process.env.WORKER_COUNT, 10)  // Manual override
            : os.cpus().length;                       // Default to number of CPU cores

        // Limit worker count to avoid excessive forking
        const maxWorkers = os.cpus().length * 2;
        const validatedCores = Math.max(1, Math.min(numCores, maxWorkers));

        if (validatedCores !== numCores) {
            loggernaut.warn(`Adjusted worker count from ${numCores} to ${validatedCores}`);
        }

        // Log system information
        loggernaut.info(`Master cluster setting up ${validatedCores} workers`);
        loggernaut.info({
            cpuCores: os.cpus().length,
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`
        });

        this.forkWorkers(validatedCores);              // Create worker pool
        this.setupClusterEventHandlers(host, port);     // Listen for worker events
    }

    /**
     * Fork multiple workers
     */
    private forkWorkers(count: number): void {
        for (let i = 0; i < count; i++) {
            this.forkWorker(); // Create each worker
        }
    }

    /**
     * Fork a single worker with proper tracking
     */
    private forkWorker(): Worker | null {
        if (this.isShuttingDown) {
            // Prevent forking while shutdown is in progress
            loggernaut.info('Shutdown in progress, not forking new worker');
            return null;
        }

        const worker = cluster.fork();    // Spawn new worker process
        const pid = worker.process.pid!;  // Get worker PID

        // Track worker metadata
        this.workers.set(pid, {
            worker,
            restarts: 0,
            lastRestart: Date.now()
        });

        loggernaut.debug(`Forked worker ${pid}`);

        this.setupWorkerMessageHandler(worker);    // Handle worker messages
        this.setupWorkerReadyTimeout(worker);      // Ensure worker becomes ready quickly

        return worker;
    }

    /**
     * Handle messages from workers (ready, shutdown, health checks)
     */
    private setupWorkerMessageHandler(worker: Worker): void {
        const messageHandler = (message: any) => {
            const pid = worker.process.pid;

            if (message?.type === 'ready') {
                loggernaut.info(`Worker ${pid} is ready`);
            } else if (message?.type === 'shutdown-complete') {
                loggernaut.info(`Worker ${pid} shutdown complete`);
                worker.disconnect(); // Master closes IPC channel
            } else if (message?.type === 'health') {
                loggernaut.debug(`Worker ${pid} health check:`);
                loggernaut.log(message.data)
            } else {
                loggernaut.debug(`Worker ${pid} message:`);
                loggernaut.log(message);
            }
        };

        worker.on('message', messageHandler);

        // Remove listener after worker exits
        worker.once('exit', () => {
            worker.removeListener('message', messageHandler);
        });
    }

    /**
     * Timeout to ensure workers don't hang before becoming ready
     */
    private setupWorkerReadyTimeout(worker: Worker): void {
        const timeout = setTimeout(() => {
            const pid = worker.process.pid;
            loggernaut.error(`Worker ${pid} failed to become ready in time`);
            worker.kill('SIGTERM'); // Force terminate
        }, this.WORKER_READY_TIMEOUT);

        const readyHandler = (message: any) => {
            if (message?.type === 'ready') {
                clearTimeout(timeout);        // Worker responded in time
                worker.removeListener('message', readyHandler);
            }
        };

        worker.on('message', readyHandler);
    }

    /**
     * Set up cluster-level events for worker lifecycle tracking
     */
    private setupClusterEventHandlers(host: string, port: number): void {
        cluster.on('online', (worker) => {
            loggernaut.info(`Worker ${worker.process.pid} online on http://${host}:${port}`);
        });

        cluster.on('disconnect', (worker) => {
            loggernaut.info(`Worker ${worker.process.pid} disconnected`);
        });

        cluster.on('exit', (worker, code, signal) => {
            this.handleWorkerExit(worker, code, signal); // Custom restart logic
        });
    }

    /**
     * Handle worker exit with restart protection (anti-crash loop)
     */
    private handleWorkerExit(worker: Worker, code: number, signal: string): void {
        const pid = worker.process.pid!;
        const workerInfo = this.workers.get(pid);

        loggernaut.warn(`Worker ${pid} died`);
        loggernaut.log({
            code,
            signal,
            exitedAfterDisconnect: worker.exitedAfterDisconnect
        });

        this.workers.delete(pid); // Remove from tracking

        // Do not restart if:
        // - master is shutting down
        // - worker intentionally disconnected
        if (this.isShuttingDown || worker.exitedAfterDisconnect) return;

        // If exit code is 0, it shut down cleanly
        if (code === 0) {
            loggernaut.info(`Worker ${pid} exited cleanly, not restarting`);
            return;
        }

        // Decide if we should restart based on restart counters
        if (workerInfo && this.shouldRestartWorker(workerInfo)) {
            loggernaut.info(`Restarting worker to replace ${pid}`);
            const newWorker = this.forkWorker();

            // Update restart counters for the new worker
            if (newWorker && workerInfo) {
                const newPid = newWorker.process.pid!;
                const newWorkerInfo = this.workers.get(newPid);

                if (newWorkerInfo) {
                    if (Date.now() - workerInfo.lastRestart < this.RESTART_WINDOW) {
                        newWorkerInfo.restarts = workerInfo.restarts + 1;
                    }
                    newWorkerInfo.lastRestart = Date.now();
                }
            }
        } else {
            loggernaut.error(`Worker ${pid} exceeded restart limit`);
            loggernaut.error({
                maxRestarts: this.MAX_RESTARTS,
                window: `${this.RESTART_WINDOW}ms`
            });
        }
    }

    /**
     * Determine whether restarting a crashed worker is allowed
     */
    private shouldRestartWorker(workerInfo: WorkerInfo): boolean {
        const now = Date.now();

        // If last restart was long ago, reset counter
        if (now - workerInfo.lastRestart > this.RESTART_WINDOW) {
            return true;
        }

        // Only restart if max restarts not exceeded
        return workerInfo.restarts < this.MAX_RESTARTS;
    }

    /**
     * Register signal handlers for clean shutdown and global error handling
     */
    private setupSignalHandlers(): void {
        const handleShutdown = (signal: string) => {
            this.gracefulShutdown(signal).catch(error => {
                loggernaut.error(`Error during ${signal} shutdown:`);
                loggernaut.error(error);
                process.exit(1);
            });
        };

        process.on('SIGTERM', () => handleShutdown('SIGTERM')); // Kill signal
        process.on('SIGINT', () => handleShutdown('SIGINT'));   // Ctrl+C

        // Fatal error handlers
        process.on('uncaughtException', (error) => {
            loggernaut.error('Uncaught exception in master process:');
            loggernaut.error(error);
            this.gracefulShutdown('UNCAUGHT_EXCEPTION')
                .catch(err => loggernaut.error(`Error during uncaught exception shutdown: ${err}`))
                .finally(() => process.exit(1));
        });

        process.on('unhandledRejection', (reason, promise) => {
            loggernaut.error('Unhandled rejection in master process:');
            loggernaut.error({ reason, promise });
        });
    }

    /**
     * Gracefully shut down all workers
     */
    private async gracefulShutdown(signal: string): Promise<void> {
        if (this.isShuttingDown) {
            loggernaut.warn('Shutdown already in progress');
            return;
        }

        this.isShuttingDown = true;
        loggernaut.info(`Received ${signal}, initiating graceful shutdown`);

        const shutdownPromises: Promise<void>[] = [];

        // Ask each worker to shut down
        for (const [pid, workerInfo] of this.workers.entries()) {
            shutdownPromises.push(this.shutdownWorker(workerInfo.worker, pid));
        }

        try {
            // Wait for all workers OR timeout
            await Promise.race([
                Promise.all(shutdownPromises),
                this.createTimeout(this.SHUTDOWN_TIMEOUT, 'Worker shutdown timeout')
            ]);

            loggernaut.info('All workers shut down gracefully');
        } catch (error) {
            loggernaut.error('Error during graceful shutdown:');
            loggernaut.error(error);
        }

        // Force kill workers that are still alive
        for (const [pid, workerInfo] of this.workers.entries()) {
            if (workerInfo.worker.isConnected()) {
                loggernaut.warn(`Force killing worker ${pid}`);
                workerInfo.worker.kill('SIGKILL');
            }
        }

        loggernaut.info('Server shutdown complete');
        process.exit(0);
    }

    /**
     * Gracefully shut down a single worker
     */
    private shutdownWorker(worker: Worker, pid: number): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                // Worker didn’t respond in time → force disconnect
                loggernaut.warn(`Worker ${pid} did not respond to shutdown, disconnecting`);
                worker.disconnect();
                resolve();
            }, 10000);

            const exitHandler = () => {
                clearTimeout(timeout);
                resolve(); // Worker exited
            };

            worker.once('exit', exitHandler);

            // Ask worker to shut down itself
            try {
                worker.send({ type: 'shutdown' });
            } catch (error) {
                loggernaut.error(`Error sending shutdown to worker ${pid}:`);
                loggernaut.error(error);
                clearTimeout(timeout);
                worker.disconnect();
                resolve();
            }
        });
    }

    /**
     * Convenience wrapper for creating a timeout promise
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
        loggernaut.info(`Worker ${process.pid} starting`);

        // Start Express REST service
        createRestService();

        // Notify master process that worker is ready
        if (process.send) {
            process.send({ type: 'ready' });
        }

        setupHealthCheck(); // Start periodic reporting

    } catch (err: any) {
        loggernaut.error(`Worker ${process.pid} failed to start: ${err}`);
        process.exit(1);
    }
}

/**
 * Periodically send health data (RAM/uptime) to master process
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
        // Start master cluster when clustering is enabled
        const clusterManager = new ClusterManager();
        clusterManager.setupWorkerProcesses();
    } else {
        // Run as single worker process
        setupWorkerProcess().catch((error) => {
            loggernaut.error(`Failed to start worker process: ${error}`);
            process.exit(1);
        });
    }
}

// Determine if clustering should be enabled based on environment or config
const clusteringEnabled =
    process.env.NODE_ENV === 'production' ||
    process.env.CLUSTERING === 'true' ||
    config.get<boolean>('cluster.enabled');

// Start the server (clustered or standalone)
setupServer(clusteringEnabled);
