// Import core Express framework and TypeScript types for type safety
import express, { Express, Request, Response, NextFunction } from "express";
// Import path module for cross-platform file path operations
import path from "path";
// Import middleware for parsing cookies from incoming requests
import cookieParser from "cookie-parser";
// Import Morgan HTTP request logger middleware
import logger from "morgan";
// Import Handlebars template engine for server-side rendering
import { engine } from "express-handlebars";
// Import custom Winston logger for production-grade logging
import { winstonLogger } from "./utils/winston";
// Import our custom routes
import indexRouter from "./routes/index";
import apiRouter from "./routes/api";

/**
 * Create and configure Express application
 * This function is called by the REST service to create the Express app
 */
export function createApp(): Express {
  // Initialize a new Express application instance
  const app: Express = express();

  // Configure Handlebars as the view engine
  app.engine(
    "hbs", // File extension for Handlebars templates
    engine({
      extname: "hbs", // Set file extension to .hbs
      defaultLayout: "main", // Use 'main.hbs' as the default layout wrapper
      layoutsDir: path.join(__dirname, "../views/layouts"), // Directory containing layout templates
      partialsDir: path.join(__dirname, "../views/partials"), // Directory containing reusable partial templates
    })
  );

  // Tell Express where to find views and which engine to use
  app.set("views", path.join(__dirname, "../views")); // Set the directory for view templates
  app.set("view engine", "hbs"); // Set Handlebars as the template engine

  // HTTP request logging - use morgan in development, Winston in production
  if (process.env.NODE_ENV === "production") {
    // In production, use 'combined' format (Apache standard) and pipe logs to Winston
    app.use(
      logger("combined", {
        stream: {
          // Redirect Morgan logs to Winston for centralized logging
          write: (message: string) => winstonLogger.info(message.trim()),
        },
      })
    );
  } else {
    // In development, use 'dev' format for colorized, concise output to console
    app.use(logger("dev"));
  }

  // Parse incoming JSON payloads (for API requests)
  // Limit set to 10mb to prevent memory issues from large payloads
  app.use(express.json({ limit: "10mb" }));

  // Parse URL-encoded bodies (from HTML forms)
  // extended: false uses querystring library (simpler, faster for flat data)
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  // Parse cookies attached to the client request
  // Makes cookies available via req.cookies
  app.use(cookieParser());

  // Serve static files (CSS, images, JavaScript) from the public directory
  // Files in public/ are served directly without going through route handlers
  app.use(express.static(path.join(__dirname, "../public")));

  // Add request ID and timing middleware
  // This middleware tracks each request with a unique ID and measures response time
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Generate a unique request ID combining timestamp and random string
    const requestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    // Attach request ID to headers for tracing across services
    req.headers["x-request-id"] = requestId;

    // Record the start time of the request
    const startTime = Date.now();

    // Listen for the 'finish' event (when response is sent)
    res.on("finish", () => {
      // Calculate total request processing time
      const duration = Date.now() - startTime;
      // Log request details including timing for performance monitoring
      winstonLogger.debug("Request completed", {
        method: req.method, // HTTP method (GET, POST, etc.)
        url: req.url, // Request URL path
        statusCode: res.statusCode, // HTTP response status code
        duration: `${duration}ms`, // Time taken to process request
        requestId, // Unique request identifier
        pid: process.pid, // Process ID (useful in cluster mode)
      });
    });

    // Pass control to the next middleware in the stack
    next();
  });

  // Health check endpoint (before routes for fast response)
  // Used by load balancers and monitoring systems to verify the service is running
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy", // Simple health status indicator
      pid: process.pid, // Process ID for debugging in multi-process environments
      uptime: process.uptime(), // How long this process has been running (in seconds)
      memory: process.memoryUsage(), // Memory usage stats (rss, heapTotal, heapUsed, external)
      timestamp: new Date().toISOString(), // Current server time in ISO format
    });
  });

  // Readiness check endpoint (checks if app is ready to serve traffic)
  // Differs from health check - indicates if app can handle requests (e.g., DB connected)
  app.get("/ready", (req: Request, res: Response) => {
    // Add any readiness checks here (database connection, etc.)
    // Currently just returns ready status, but should validate dependencies in production
    res.status(200).json({
      status: "ready", // Indicates app is ready to accept traffic
      pid: process.pid, // Process ID for multi-process environments
    });
  });

  // Mount our route handlers
  // All routes defined in indexRouter will be accessible from the root path "/"
  app.use("/", indexRouter);
  // All routes defined in apiRouter will be prefixed with "/api"
  app.use("/api", apiRouter);

  // Error handling middleware for 404 errors
  // This catches any requests that don't match defined routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Log 404 errors with request details for debugging
    winstonLogger.warn("404 Not Found", {
      method: req.method, // HTTP method used
      url: req.url, // The URL that wasn't found
      ip: req.ip, // Client IP address
    });

    // Check if request accepts JSON
    // Respond with JSON for API clients, HTML for browser clients
    if (req.accepts("json") && !req.accepts("html")) {
      // Send JSON response for API requests
      res.status(404).json({
        success: false,
        message: "Endpoint not found",
        path: req.url, // Echo back the requested path
      });
    } else {
      // Render HTML error page for browser requests
      res.status(404).render("error", {
        message: "Page Not Found",
        error: { status: 404, stack: "" }, // No stack trace for 404s
      });
    }
  });

  // Global error handler
  // Must have 4 parameters (err, req, res, next) for Express to recognize it as error middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Log the error with full details
    // Includes error message, stack trace, and request context for debugging
    winstonLogger.error("Express error handler", {
      error: err.message, // Error message
      stack: err.stack, // Full stack trace for debugging
      url: req.url, // URL where error occurred
      method: req.method, // HTTP method
      ip: req.ip, // Client IP address
    });

    // Set locals for the error page
    // Makes error details available to the view template
    res.locals.message = err.message;
    // Only expose detailed error in development (security best practice)
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // Check if request accepts JSON
    // Content negotiation: send appropriate format based on client preference
    if (req.accepts("json") && !req.accepts("html")) {
      // Send JSON error response for API requests
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        // Only include stack trace in development for security
        error: req.app.get("env") === "development" ? err.stack : undefined,
      });
    } else {
      // Render the error page for browser requests
      res.status(err.status || 500); // Set HTTP status code (500 if not specified)
      res.render("error"); // Render the error template with locals set above
    }
  });

  // Return the configured Express application
  return app;
}

// Export the createApp function as the default export
export default createApp;