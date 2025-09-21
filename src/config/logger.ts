import winston from 'winston';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels: logLevels,
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'all.log'),
    }),
    // HTTP request logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'http.log'),
      level: 'http',
    }),
  ],
});

// Create a specific logger for HTTP requests
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'http-requests.log'),
    }),
  ],
});

export default logger;
