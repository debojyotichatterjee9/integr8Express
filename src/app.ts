import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { engine } from 'express-handlebars';
import { winstonLogger } from './utils/logger';

// Import our custom routes
import indexRouter from './routes/index';

/**
 * Create and configure Express application
 * This function is called by the REST service to create the Express app
 */
export function createApp(): Express {
    const app: Express = express();

    // Configure Handlebars as the view engine
    app.engine('hbs', engine({
        extname: 'hbs',
        defaultLayout: 'main',
        layoutsDir: path.join(__dirname, '../views/layouts'),
        partialsDir: path.join(__dirname, '../views/partials')
    }));

    // Tell Express where to find views and which engine to use
    app.set('views', path.join(__dirname, '../views'));
    app.set('view engine', 'hbs');

    // HTTP request logging - use morgan in development, Winston in production
    if (process.env.NODE_ENV === 'production') {
        app.use(logger('combined', {
            stream: {
                write: (message: string) => winstonLogger.info(message.trim())
            }
        }));
    } else {
        app.use(logger('dev'));
    }

    // Parse incoming JSON payloads (for API requests)
    app.use(express.json({ limit: '10mb' }));

    // Parse URL-encoded bodies (from HTML forms)
    app.use(express.urlencoded({ extended: false, limit: '10mb' }));

    // Parse cookies attached to the client request
    app.use(cookieParser());

    // Serve static files (CSS, images, JavaScript) from the public directory
    app.use(express.static(path.join(__dirname, '../public')));

    // Add request ID and timing middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        req.headers['x-request-id'] = requestId;

        const startTime = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            winstonLogger.debug('Request completed', {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                requestId,
                pid: process.pid
            });
        });

        next();
    });

    // Health check endpoint (before routes for fast response)
    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({
            status: 'healthy',
            pid: process.pid,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        });
    });

    // Readiness check endpoint (checks if app is ready to serve traffic)
    app.get('/ready', (req: Request, res: Response) => {
        // Add any readiness checks here (database connection, etc.)
        res.status(200).json({
            status: 'ready',
            pid: process.pid
        });
    });

    // Mount our route handlers
    app.use('/', indexRouter);

    // Error handling middleware for 404 errors
    app.use((req: Request, res: Response, next: NextFunction) => {
        winstonLogger.warn('404 Not Found', {
            method: req.method,
            url: req.url,
            ip: req.ip
        });

        res.status(404).render('error', {
            message: 'Page Not Found',
            error: { status: 404, stack: '' }
        });
    });

    // Global error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        // Log the error with full details
        winstonLogger.error('Express error handler', {
            error: err.message,
            stack: err.stack,
            url: req.url,
            method: req.method,
            ip: req.ip
        });

        // Set locals for the error page
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // Render the error page
        res.status(err.status || 500);
        res.render('error');
    });

    return app;
}

export default createApp;