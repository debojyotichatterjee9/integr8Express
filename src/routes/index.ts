import express, { Router, Request, Response } from 'express';
import { WorkerPool } from '../workerUtils/workerPool';
import { winstonLogger } from '../utils/winston';
import path from 'path';
import config from 'config';
import os from 'os';
import loggernaut from 'loggernaut';

const router: Router = express.Router();

// Initialize a pool of worker threads for handling intensive tasks
const poolSize = config.get<number>('workerThreads.poolSize') || 4;
const workerPath = path.join(__dirname, '../../dist/workerUtils/taskWorker.js');

let workerPool: WorkerPool | null = null;

// Initialize worker pool with error handling
try {
    workerPool = new WorkerPool(workerPath, poolSize);
    loggernaut.info(`Worker thread pool initialized`);
    loggernaut.info({
        poolSize,
        pid: process.pid
    });
} catch (error) {
    winstonLogger.error('Failed to initialize worker pool:', error);
}

/**
 * Default GET route - Homepage
 * This demonstrates a simple view rendering with Handlebars
 */
router.get('/', (req: Request, res: Response) => {
    loggernaut.info("REACHING HERE")
    res.render('index', {
        title: 'Express TypeScript App',
        message: 'Welcome to your production-ready Express application!',
        features: [
            'TypeScript with latest ES2022 features',
            'Handlebars templating engine',
            'Cluster mode with graceful shutdown',
            'Worker threads for parallel processing',
            'Winston logging with rotation',
            'Health monitoring and metrics',
            'Configuration management'
        ],
        systemInfo: {
            nodeVersion: process.version,
            pid: process.pid,
            platform: process.platform,
            cpus: os.cpus().length,
            memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`
        }
    });
});

/**
 * API route that demonstrates worker thread usage
 * This offloads a CPU-intensive calculation to a worker thread
 * so it doesn't block the main event loop
 */
router.get('/api/calculate', async (req: Request, res: Response) => {
    if (!workerPool) {
        return res.status(503).json({
            success: false,
            error: 'Worker pool not available'
        });
    }

    try {
        // Get the number from query parameters, default to 40
        const number: number = parseInt(req.query.num as string) || 40;

        // Validate input
        if (number < 1 || number > 45) {
            return res.status(400).json({
                success: false,
                error: 'Number must be between 1 and 45'
            });
        }

        winstonLogger.debug(`Starting calculation for number: ${number}`, {
            pid: process.pid
        });

        const startTime = Date.now();

        // Execute the task in a worker thread from our pool
        const result = await workerPool.runTask({ number });

        const duration = Date.now() - startTime;

        winstonLogger.info(`Calculation completed`, {
            input: number,
            duration: `${duration}ms`,
            pid: process.pid
        });

        // Send JSON response with the calculation result
        res.json({
            success: true,
            input: number,
            result: result,
            computationTime: `${duration}ms`,
            processId: process.pid,
            message: 'Calculation completed using worker thread'
        });

    } catch (error: any) {
        winstonLogger.error('Error in worker thread calculation:', {
            error: error.message,
            pid: process.pid
        });

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
    if (!workerPool) {
        return res.status(503).json({
            success: false,
            message: 'Worker pool not initialized'
        });
    }

    res.json({
        success: true,
        totalWorkers: workerPool.getPoolSize(),
        activeWorkers: workerPool.getActiveWorkers(),
        availableWorkers: workerPool.getPoolSize() - workerPool.getActiveWorkers(),
        processId: process.pid,
        message: 'Worker pool is operational'
    });
});

/**
 * System information endpoint
 */
router.get('/api/system-info', (req: Request, res: Response) => {
    res.json({
        success: true,
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cpus: os.cpus().length,
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
            freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`,
            uptime: `${Math.round(os.uptime() / 60)} minutes`
        },
        process: {
            pid: process.pid,
            uptime: `${Math.round(process.uptime())} seconds`,
            memoryUsage: process.memoryUsage(),
            env: process.env.NODE_ENV || 'development'
        }
    });
});

/**
 * Stress test endpoint - generate load for testing
 * Use with caution in production
 */
router.get('/api/stress-test', async (req: Request, res: Response) => {
    if (!workerPool) {
        return res.status(503).json({
            success: false,
            error: 'Worker pool not available'
        });
    }

    const count = Math.min(parseInt(req.query.count as string) || 10, 20);
    const number = Math.min(parseInt(req.query.num as string) || 35, 40);

    winstonLogger.info(`Starting stress test`, {
        count,
        number,
        pid: process.pid
    });

    try {
        const startTime = Date.now();
        const promises = [];

        for (let i = 0; i < count; i++) {
            promises.push(workerPool.runTask({ number }));
        }

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;

        res.json({
            success: true,
            tasksCompleted: count,
            totalTime: `${duration}ms`,
            averageTime: `${Math.round(duration / count)}ms`,
            processId: process.pid,
            message: `Completed ${count} parallel calculations`
        });

    } catch (error: any) {
        winstonLogger.error('Stress test error:', error);
        res.status(500).json({
            success: false,
            error: 'Stress test failed',
            message: error.message
        });
    }
});

export default router;