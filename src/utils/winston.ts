import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Winston Logger Configuration
 * Provides structured logging with rotation and multiple transports
 */

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development (more readable)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
console.log('>> ################################################## <<');
console.log(logsDir);
console.log(process.env.FILE_LOGGING)

// Create transports array
const transports: winston.transport[] = [
    // Console transport for all environments
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
    })
];

// Add file transports only in production or if explicitly enabled
if (process.env.NODE_ENV === 'production' || process.env.FILE_LOGGING === 'true') {
    // Error logs - rotated daily, kept for 14 days
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            format: logFormat,
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true
        })
    );

    // Combined logs - rotated daily, kept for 14 days
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            format: logFormat,
            maxSize: '20m',
            maxFiles: '14d',
            zippedArchive: true
        })
    );
}

// Create the logger
export const winstonLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'express-typescript-app',
        pid: process.pid,
        hostname: require('os').hostname()
    },
    transports,
    exitOnError: false
});

// Handle logging errors
winstonLogger.on('error', (error) => {
    console.error('Logger error:', error);
});

// Export convenience methods
export default winstonLogger;