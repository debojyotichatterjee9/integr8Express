import { Request, Response, NextFunction } from 'express';
import { CustomRequest, ApiResponse } from '../types';

// Request ID middleware - adds unique identifier to each request
// This is incredibly useful for tracking requests through logs and debugging
export const requestId = (req: CustomRequest, res: Response, next: NextFunction): void => {
  // Generate a simple unique ID for this request
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add the request ID to response headers for easy tracking
  res.setHeader('X-Request-ID', req.requestId);
  
  console.log(`[${req.requestId}] ${req.method} ${req.path} - Request started`);
  next();
};

// Request timing middleware - measures how long each request takes
export const requestTimer = (req: CustomRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Override the res.end method to capture when the response finishes
  const originalEnd = res.end;
  res.end = function(...args: any[]): Response {
    const duration = Date.now() - startTime;
    console.log(`[${req.requestId}] Request completed in ${duration}ms`);
    
    // Call the original end method to actually send the response
    return originalEnd.apply(this, args);
  };
  
  next();
};

// Validation middleware factory - creates validation middleware for different scenarios
export const validateBody = <T>(validationRules: (body: any) => body is T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if the request body matches our validation rules
      if (!validationRules(req.body)) {
        const errorResponse: ApiResponse = {
          success: false,
          message: 'Invalid request body',
          error: 'Validation failed',
          timestamp: new Date().toISOString(),
        };
        
        res.status(400).json(errorResponse);
        return;
      }
      
      next();
    } catch (error) {
      const errorResponse: ApiResponse = {
        success: false,
        message: 'Validation error',
        error: error instanceof Error ? error.message : 'Unknown validation error',
        timestamp: new Date().toISOString(),
      };
      
      res.status(400).json(errorResponse);
    }
  };
};

// Rate limiting middleware - prevents abuse by limiting requests per IP
export const createRateLimit = (windowMs: number, maxRequests: number) => {
  // Store request counts per IP address
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Get or create request count for this IP
    let clientData = requestCounts.get(clientIP);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset the count if the window has expired
      clientData = {
        count: 1,
        resetTime: now + windowMs,
      };
      requestCounts.set(clientIP, clientData);
    } else {
      clientData.count++;
    }
    
    // Add rate limit headers to help clients understand the limits
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - clientData.count).toString());
    res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());
    
    if (clientData.count > maxRequests) {
      const errorResponse: ApiResponse = {
        success: false,
        message: 'Too many requests',
        error: `Rate limit exceeded. Try again after ${Math.ceil((clientData.resetTime - now) / 1000)} seconds`,
        timestamp: new Date().toISOString(),
      };
      
      res.status(429).json(errorResponse);
      return;
    }
    
    next();
  };
};

// Authentication middleware example - verifies user authentication
export const requireAuth = (req: CustomRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const errorResponse: ApiResponse = {
      success: false,
      message: 'Authentication required',
      error: 'No valid authorization header found',
      timestamp: new Date().toISOString(),
    };
    
    res.status(401).json(errorResponse);
    return;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // In a real application, you would verify the JWT token here
    // For now, we'll just check if it's not empty
    if (!token || token.length < 10) {
      throw new Error('Invalid token format');
    }
    
    // Mock user data - in real apps, this would come from token verification
    req.user = {
      id: 'user123',
      email: 'user@example.com',
      role: 'user',
    };
    
    next();
  } catch (error) {
    const errorResponse: ApiResponse = {
      success: false,
      message: 'Invalid authentication token',
      error: error instanceof Error ? error.message : 'Token verification failed',
      timestamp: new Date().toISOString(),
    };
    
    res.status(401).json(errorResponse);
  }
};

// CORS preflight handler - handles OPTIONS requests for complex CORS scenarios
export const handleCORSPreflight = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.status(200).end();
    return;
  }
  next();
};