import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { redisConfig } from './environment';

/**
 * Logging configuration for HTTP requests and responses
 * This system captures API calls, responses, and headers with a BullMQ-like UI
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip?: string;
  userId?: number | undefined;
  headers: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  level: 'info' | 'warn' | 'error';
}

export interface LogQueryOptions {
  page?: number | undefined;
  limit?: number | undefined;
  level?: string | undefined;
  method?: string | undefined;
  statusCode?: number | undefined;
  userId?: number | undefined;
  url?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

export interface LogQueryResult {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Redis-based log storage
 */
export class LogStorage {
  private redis: Redis;
  private readonly LOG_PREFIX = 'api_logs:';
  private readonly LOG_INDEX = 'api_logs_index';
  private readonly MAX_LOGS = 10000; // Keep last 10,000 logs
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(redis: Redis) {
    this.redis = redis;
    this.initializeCleanup();
  }

  /**
   * Initialize periodic cleanup of old logs
   */
  private initializeCleanup(): void {
    setInterval(async () => {
      try {
        await this.cleanupOldLogs();
      } catch (error) {
        console.error('Log cleanup error:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Store a log entry in Redis
   */
  async storeLog(log: LogEntry): Promise<void> {
    try {
      const key = `${this.LOG_PREFIX}${log.id}`;
      
      // Store the log entry
      await this.redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(log)); // 7 days TTL
      
      // Add to sorted set for querying by timestamp
      await this.redis.zadd(this.LOG_INDEX, Date.now(), log.id);
      
      // Keep only the latest logs
      const totalCount = await this.redis.zcard(this.LOG_INDEX);
      if (totalCount > this.MAX_LOGS) {
        const toRemove = totalCount - this.MAX_LOGS;
        const oldLogs = await this.redis.zrange(this.LOG_INDEX, 0, toRemove - 1);
        if (oldLogs.length > 0) {
          await this.redis.zremrangebyrank(this.LOG_INDEX, 0, toRemove - 1);
          await this.redis.del(...oldLogs.map(id => `${this.LOG_PREFIX}${id}`));
        }
      }
    } catch (error) {
      console.error('Error storing log:', error);
    }
  }

  /**
   * Retrieve logs with filtering and pagination
   */
  async getLogs(options: LogQueryOptions = {}): Promise<LogQueryResult> {
    try {
      const {
        page = 1,
        limit = 50,
        level,
        method,
        statusCode,
        userId,
        url,
        startDate,
        endDate
      } = options;

      // Get all log IDs sorted by timestamp (newest first)
      const allLogIds = await this.redis.zrevrange(this.LOG_INDEX, 0, -1);
      
      // Filter logs based on criteria
      let filteredLogs: LogEntry[] = [];
      
      for (const id of allLogIds) {
        const logData = await this.redis.get(`${this.LOG_PREFIX}${id}`);
        if (!logData) continue;
        
        const log: LogEntry = JSON.parse(logData);
        
        // Apply filters
        if (level && log.level !== level) continue;
        if (method && log.method !== method) continue;
        if (statusCode && log.statusCode !== statusCode) continue;
        if (userId && log.userId !== userId) continue;
        if (url && !log.url.includes(url)) continue;
        if (startDate && new Date(log.timestamp) < new Date(startDate)) continue;
        if (endDate && new Date(log.timestamp) > new Date(endDate)) continue;
        
        filteredLogs.push(log);
      }

      // Calculate pagination
      const total = filteredLogs.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

      return {
        logs: paginatedLogs,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      console.error('Error retrieving logs:', error);
      return {
        logs: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      };
    }
  }

  /**
   * Get a specific log by ID
   */
  async getLogById(id: string): Promise<LogEntry | null> {
    try {
      const logData = await this.redis.get(`${this.LOG_PREFIX}${id}`);
      return logData ? JSON.parse(logData) : null;
    } catch (error) {
      console.error('Error retrieving log by ID:', error);
      return null;
    }
  }

  /**
   * Get log statistics
   */
  async getStats(): Promise<{
    total: number;
    byLevel: Record<string, number>;
    byMethod: Record<string, number>;
    byStatusCode: Record<string, number>;
    recentErrors: LogEntry[];
  }> {
    try {
      const allLogIds = await this.redis.zrevrange(this.LOG_INDEX, 0, -1);
      const recentLogs: LogEntry[] = [];
      
      // Get last 1000 logs for statistics
      const sampleSize = Math.min(1000, allLogIds.length);
      for (let i = 0; i < sampleSize; i++) {
        const logData = await this.redis.get(`${this.LOG_PREFIX}${allLogIds[i]}`);
        if (logData) {
          recentLogs.push(JSON.parse(logData));
        }
      }

      const byLevel: Record<string, number> = {};
      const byMethod: Record<string, number> = {};
      const byStatusCode: Record<string, number> = {};

      recentLogs.forEach(log => {
        byLevel[log.level] = (byLevel[log.level] || 0) + 1;
        byMethod[log.method] = (byMethod[log.method] || 0) + 1;
        const statusGroup = Math.floor(log.statusCode / 100) * 100;
        byStatusCode[`${statusGroup}x`] = (byStatusCode[`${statusGroup}x`] || 0) + 1;
      });

      const recentErrors = recentLogs
        .filter(log => log.level === 'error')
        .slice(0, 10);

      return {
        total: allLogIds.length,
        byLevel,
        byMethod,
        byStatusCode,
        recentErrors
      };
    } catch (error) {
      console.error('Error getting log stats:', error);
      return {
        total: 0,
        byLevel: {},
        byMethod: {},
        byStatusCode: {},
        recentErrors: []
      };
    }
  }

  /**
   * Clean up old logs
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      // Remove old logs from sorted set
      await this.redis.zremrangebyscore(this.LOG_INDEX, 0, sevenDaysAgo);
      
      // Get remaining log IDs
      const remainingIds = await this.redis.zrange(this.LOG_INDEX, 0, -1);
      
      // Find all log keys
      const allKeys = await this.redis.keys(`${this.LOG_PREFIX}*`);
      
      // Remove keys that are no longer in the index
      const keysToRemove = allKeys.filter(key => {
        const id = key.replace(this.LOG_PREFIX, '');
        return !remainingIds.includes(id);
      });
      
      if (keysToRemove.length > 0) {
        await this.redis.del(...keysToRemove);
      }
      
      console.log(`Cleaned up ${keysToRemove.length} old log entries`);
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  /**
   * Clear all logs
   */
  async clearAllLogs(): Promise<void> {
    try {
      const allKeys = await this.redis.keys(`${this.LOG_PREFIX}*`);
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
      }
      await this.redis.del(this.LOG_INDEX);
      console.log('Cleared all logs');
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  }
}

/**
 * HTTP logging middleware for Fastify
 */
export function createHttpLogger(fastify: FastifyInstance) {
  return async (request: any, reply: any) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to request object for tracking
    request.id = requestId;
    
    // Hook into response lifecycle
    reply.hook('onSend', async (request: any, reply: any, payload: any) => {
      const responseTime = Date.now() - startTime;
      
      try {
        // Extract user information if available
        let userId: number | undefined;
        try {
          const authHeader = request.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = await request.jwtVerify();
            userId = decoded?.userId;
          }
        } catch (error) {
          // Ignore JWT errors for logging
        }

        // Parse request body if available
        let requestBody: any;
        if (request.body && typeof request.body === 'object') {
          requestBody = sanitizeForLogging(request.body);
        }

        // Parse response payload
        let responseBody: any;
        if (payload && typeof payload === 'string') {
          try {
            responseBody = JSON.parse(payload);
            responseBody = sanitizeForLogging(responseBody);
          } catch {
            responseBody = payload.substring(0, 1000); // Truncate long responses
          }
        } else if (payload && typeof payload === 'object') {
          responseBody = sanitizeForLogging(payload);
        }

        // Determine log level based on status code
        let level: LogEntry['level'] = 'info';
        if (reply.statusCode >= 400 && reply.statusCode < 500) {
          level = 'warn';
        } else if (reply.statusCode >= 500) {
          level = 'error';
        }

        // Create log entry
        const logEntry: LogEntry = {
          id: requestId,
          timestamp: new Date().toISOString(),
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime,
          userAgent: request.headers['user-agent'],
          ip: request.ip || request.connection?.remoteAddress,
          userId,
          headers: sanitizeHeaders(request.headers),
          requestBody,
          responseBody,
          level
        };

        // Store log in Redis
        const logStorage = new LogStorage(fastify.redis);
        await logStorage.storeLog(logEntry);

      } catch (error) {
        // Don't let logging errors break the request
        fastify.log.error('HTTP logging error:', error);
      }
    });
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize headers for logging (remove sensitive information)
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'token', 'api-key', 'x-api-key'];
  
  Object.keys(headers).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = String(headers[key]);
    }
  });
  
  return sanitized;
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credit', 'card', 'ssn'];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const sanitize = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = sanitize(obj[key]);
        }
      });
      return result;
    }
    return obj;
  };

  return sanitize(sanitized);
}

/**
 * Initialize logging system
 */
export function initializeLogging(fastify: FastifyInstance): void {
  // Add the HTTP logger as a hook
  fastify.addHook('onRequest', createHttpLogger(fastify));
  
  fastify.log.info('📊 HTTP logging system initialized');
}
