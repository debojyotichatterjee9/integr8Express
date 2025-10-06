import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import { engine } from 'express-handlebars';

// Import our custom routes
import indexRouter from './routes/index';

// Create the Express application instance
const app: Express = express();

// Configure Handlebars as the view engine
// express-handlebars gives us more features than the basic hbs package
app.engine('hbs', engine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, '../views/layouts'),
  partialsDir: path.join(__dirname, '../views/partials')
}));

// Tell Express where to find views and which engine to use
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'hbs');

// Middleware stack - these process requests in order
// Morgan logs HTTP requests for debugging and monitoring
app.use(logger('dev'));

// Parse incoming JSON payloads (for API requests)
app.use(express.json());

// Parse URL-encoded bodies (from HTML forms)
app.use(express.urlencoded({ extended: false }));

// Parse cookies attached to the client request
app.use(cookieParser());

// Serve static files (CSS, images, JavaScript) from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Mount our route handlers
app.use('/', indexRouter);

// Error handling middleware for 404 errors
// This catches any requests that didn't match our defined routes
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).render('error', {
    message: 'Page Not Found',
    error: { status: 404, stack: '' }
  });
});

// Global error handler
// Express recognizes this as an error handler because it has 4 parameters
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Set locals for the error page, only providing stack traces in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;