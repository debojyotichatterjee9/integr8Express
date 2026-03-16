// Import required modules and dependencies
import express, { Router, Request, Response } from 'express';
import { WorkerPool } from '../workerUtils/workerPool';
import { winstonLogger } from '../utils/winston';
import path from 'path';
import config from 'config';
import os from 'os';
import loggernaut from 'loggernaut';

// Create an Express router instance to define routes
const router: Router = express.Router();

// Initialize a pool of worker threads for handling intensive tasks
// Get the pool size from configuration file, defaulting to 4 workers if not specified
const poolSize = config.get<number>('workerThreads.poolSize') || 4;
// Construct the absolute path to the compiled worker script
const workerPath = path.join(__dirname, '../../dist/workerUtils/taskWorker.js');

// Declare workerPool variable with null as initial value (will be initialized in try-catch)
let workerPool: WorkerPool | null = null;

// Initialize worker pool with error handling
try {
    // Create a new WorkerPool instance with the worker script path and desired pool size
    workerPool = new WorkerPool(workerPath, poolSize);
    // Log successful initialization
    loggernaut.info(`Worker thread pool initialized`);
    // Log pool configuration details including size and process ID
    loggernaut.info({
        poolSize,
        pid: process.pid
    });
} catch (error) {
    // Log any errors that occur during worker pool initialization
    winstonLogger.error('Failed to initialize worker pool:', error);
}

/**
 * Default GET route - Homepage
 * This demonstrates a simple view rendering with Handlebars
 */
router.get('/', (req: Request, res: Response) => {
    // Log that the homepage route has been accessed
    loggernaut.info("REACHING HERE")
    // Render the 'index' Handlebars template with data
    res.render('index', {
        // Page title displayed in the browser
        title: 'Express TypeScript App',
        // Welcome message for the homepage
        message: 'Welcome to your production-ready Express application!',
        // List of application features to display
        features: [
            'TypeScript with latest ES2022 features',
            'Handlebars templating engine',
            'Cluster mode with graceful shutdown',
            'Worker threads for parallel processing',
            'Winston logging with rotation',
            'Health monitoring and metrics',
            'Configuration management'
        ],
        // System information to display on the homepage
        systemInfo: {
            nodeVersion: process.version, // Node.js version
            pid: process.pid, // Current process ID
            platform: process.platform, // Operating system platform
            cpus: os.cpus().length, // Number of CPU cores
            memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB` // Total system memory in GB
        }
    });
});

/**
 * API route that demonstrates worker thread usage
 * This offloads a CPU-intensive calculation to a worker thread
 * so it doesn't block the main event loop
 */
router.get('/api/calculate', async (req: Request, res: Response) => {
    // Check if worker pool is available before processing
    if (!workerPool) {
        // Return 503 Service Unavailable if worker pool failed to initialize
        return res.status(503).json({
            success: false,
            error: 'Worker pool not available'
        });
    }

    try {
        // Get the number from query parameters, default to 40
        // Parse the 'num' query parameter as an integer, fallback to 40 if not provided
        const number: number = parseInt(req.query.num as string) || 40;

        // Validate input
        // Ensure the number is within acceptable range (1-45) to prevent excessive computation
        if (number < 1 || number > 45) {
            return res.status(400).json({
                success: false,
                error: 'Number must be between 1 and 45'
            });
        }

        // Log the start of calculation with input details and process ID
        winstonLogger.debug(`Starting calculation for number: ${number}`, {
            pid: process.pid
        });

        // Record the start time for performance measurement
        const startTime = Date.now();

        // Execute the task in a worker thread from our pool
        // This delegates the CPU-intensive work to a background thread
        const result = await workerPool.runTask({ number });

        // Calculate how long the computation took
        const duration = Date.now() - startTime;

        // Log completion details including input, duration, and process ID
        winstonLogger.info(`Calculation completed`, {
            input: number,
            duration: `${duration}ms`,
            pid: process.pid
        });

        // Send JSON response with the calculation result
        res.json({
            success: true,
            input: number, // Echo back the input number
            result: result, // The calculation result from the worker
            computationTime: `${duration}ms`, // Time taken for computation
            processId: process.pid, // Process ID that handled the request
            message: 'Calculation completed using worker thread'
        });

    } catch (error: any) {
        // Log any errors that occur during calculation
        winstonLogger.error('Error in worker thread calculation:', {
            error: error.message,
            pid: process.pid
        });

        // Return 500 Internal Server Error with error details
        res.status(500).json({
            success: false,
            error: 'Failed to process calculation',
            message: error.message
        });
    }
});

/**
 * Route to check worker pool status
 * Useful for monitoring and debugging
 */
router.get('/api/worker-status', (req: Request, res: Response) => {
    // Check if worker pool is initialized
    if (!workerPool) {
        // Return 503 if worker pool is not available
        return res.status(503).json({
            success: false,
            message: 'Worker pool not initialized'
        });
    }

    // Return worker pool statistics
    res.json({
        success: true,
        totalWorkers: workerPool.getPoolSize(), // Total number of workers in the pool
        activeWorkers: workerPool.getActiveWorkers(), // Number of workers currently processing tasks
        availableWorkers: workerPool.getPoolSize() - workerPool.getActiveWorkers(), // Number of idle workers
        processId: process.pid, // Current process ID
        message: 'Worker pool is operational'
    });
});

/**
 * System information endpoint
 */
router.get('/api/system-info', (req: Request, res: Response) => {
    // Return comprehensive system and process information
    res.json({
        success: true,
        // Operating system level information
        system: {
            nodeVersion: process.version, // Node.js version
            platform: process.platform, // OS platform (linux, darwin, win32, etc.)
            arch: process.arch, // CPU architecture (x64, arm64, etc.)
            cpus: os.cpus().length, // Number of CPU cores
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`, // Total system memory in GB
            freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`, // Available system memory in GB
            uptime: `${Math.round(os.uptime() / 60)} minutes` // System uptime in minutes
        },
        // Current Node.js process information
        process: {
            pid: process.pid, // Process ID
            uptime: `${Math.round(process.uptime())} seconds`, // Process uptime in seconds
            memoryUsage: process.memoryUsage(), // Detailed memory usage of the process
            env: process.env.NODE_ENV || 'development' // Current environment (development/production)
        }
    });
});

/**
 * Stress test endpoint - generate load for testing
 * Use with caution in production
 */
router.get('/api/stress-test', async (req: Request, res: Response) => {
    // Verify worker pool availability before stress testing
    if (!workerPool) {
        return res.status(503).json({
            success: false,
            error: 'Worker pool not available'
        });
    }

    // Parse and limit the number of concurrent tasks (max 20 to prevent overwhelming the system)
    const count = Math.min(parseInt(req.query.count as string) || 10, 20);
    // Parse and limit the calculation input number (max 40 to prevent excessive computation time)
    const number = Math.min(parseInt(req.query.num as string) || 35, 40);

    // Log the start of stress test with parameters
    winstonLogger.info(`Starting stress test`, {
        count,
        number,
        pid: process.pid
    });

    try {
        // Record start time for overall stress test duration
        const startTime = Date.now();
        // Array to store all task promises
        const promises = [];

        // Create multiple concurrent worker tasks
        for (let i = 0; i < count; i++) {
            // Queue each task without awaiting, collecting promises for parallel execution
            promises.push(workerPool.runTask({ number }));
        }

        // Wait for all tasks to complete in parallel
        const results = await Promise.all(promises);
        // Calculate total time taken for all parallel tasks
        const duration = Date.now() - startTime;

        // Return stress test results with timing metrics
        res.json({
            success: true,
            tasksCompleted: count, // Number of tasks that completed
            totalTime: `${duration}ms`, // Total time for all parallel tasks
            averageTime: `${Math.round(duration / count)}ms`, // Average time per task
            processId: process.pid, // Process ID that handled the stress test
            message: `Completed ${count} parallel calculations`
        });

    } catch (error: any) {
        // Log any errors during stress test
        winstonLogger.error('Stress test error:', error);
        // Return 500 error with details
        res.status(500).json({
            success: false,
            error: 'Stress test failed',
            message: error.message
        });
    }
});

// Export the router to be used in the main application
export default router;