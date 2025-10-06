#!/usr/bin/env node

/**
 * Server Entry Point
 * 
 * This file is responsible for starting the HTTP server.
 * It's separated from app.ts to make the application more testable
 * and to follow the single responsibility principle.
 */

import app from './app';
import http from 'http';
import {AddressInfo} from "node:net";

/**
 * Normalize a port into a number, string, or false.
 * This handles various ways ports can be specified
 */
function normalizePort(val: string): number | string | boolean {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // Named pipe
    return val;
  }

  if (port >= 0) {
    // Port number
    return port;
  }

  return false;
}

// Get port from environment variable or default to 3000
// Using environment variables makes deployment to cloud platforms easier
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Create the HTTP server using our Express app
const server = http.createServer(app);

/**
 * Event listener for HTTP server "error" event.
 * Provides friendly error messages for common issues
 */
function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 * Logs where the server is accessible
 */
function onListening(): void {
  const addr: string | AddressInfo | null | any = server.address();
  const bind: string = typeof addr === 'string'
    ? 'pipe ' + addr 
    : 'port ' + addr?.port;
  
  console.log('=================================');
  console.log('🚀 Server is running!');
  console.log(`📡 Listening on ${bind}`);
  console.log(`🌐 Open http://localhost:${addr?.port}`);
  console.log('=================================');
}

// Start listening on the specified port
server.listen(port);

// Attach event handlers
server.on('error', onError);
server.on('listening', onListening);

// Graceful shutdown handling
// This ensures workers are properly terminated when the server stops
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});