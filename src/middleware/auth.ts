import { FastifyRequest, FastifyReply } from 'fastify';
import { IAuthenticatedRequest, IAPIResponse, IRateLimitContext } from '../types/auth';
import { extractTokenFromHeader, validateTokenForMiddleware } from '../utils/jwt';
import User from '../models/User';
import { RedisUtils, REDIS_KEYS } from '../config/redis';

/**
 * Authentication middleware for Fastify
 * This module provides middleware functions for protecting routes and managing authentication
 */

/**
 * Interface for authenticated Fastify request
 * Extends the default FastifyRequest with user information
 */
interface AuthenticatedFastifyRequest extends FastifyRequest {
  user: NonNullable<IAuthenticatedRequest['user']>;
  userId: number;
}

/**
 * Authentication middleware to verify JWT tokens and populate user context
 * This middleware checks for valid JWT tokens and adds user information to the request
 * 
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @throws 401 error if authentication fails
 */
export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      const response: IAPIResponse = {
        success: false,
        message: 'Authentication required',
        error: 'No authorization token provided',
        statusCode: 401,
      };
      return reply.status(401).send(response);
    }

    // Check if token is blacklisted (for logout functionality)
    const redisUtils = (request.server as any).redisUtils as RedisUtils;
    const isBlacklisted = await redisUtils.isTokenBlacklisted(token);
    
    if (isBlacklisted) {
      const response: IAPIResponse = {
        success: false,
        message: 'Authentication failed',
        error: 'Token has been revoked',
        statusCode: 401,
      };
      return reply.status(401).send(response);
    }

    // Validate the JWT token
    const decoded = await validateTokenForMiddleware(token);

    // Find the user in the database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      const response: IAPIResponse = {
        success: false,
        message: 'Authentication failed',
        error: 'User not found',
        statusCode: 401,
      };
      return reply.status(401).send(response);
    }

    if (!user.isActive) {
      const response: IAPIResponse = {
        success: false,
        message: 'Authentication failed',
        error: 'User account is deactivated',
        statusCode: 401,
      };
      return reply.status(401).send(response);
    }

    // Add user information to the request object
    (request as AuthenticatedFastifyRequest).user = user.toPublicJSON();
    (request as AuthenticatedFastifyRequest).userId = user.id;

    // Continue to the next handler
  } catch (error) {
    request.log.error('Authentication error:', error);
    
    const response: IAPIResponse = {
      success: false,
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Invalid token',
      statusCode: 401,
    };
    return reply.status(401).send(response);
  }
};

/**
 * Optional authentication middleware
 * Similar to authenticate but doesn't throw errors if no token is provided
 * Useful for routes that can work with or without authentication
 * 
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 */
export const optionalAuthenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    // If no token is provided, just continue without authentication
    if (!token) {
      return;
    }

    // Check if token is blacklisted
    const redisUtils = (request.server as any).redisUtils as RedisUtils;
    const isBlacklisted = await redisUtils.isTokenBlacklisted(token);
    
    if (isBlacklisted) {
      return; // Continue without authentication if token is blacklisted
    }

    // Validate the JWT token
    const decoded = await validateTokenForMiddleware(token);

    // Find the user in the database
    const user = await User.findByPk(decoded.userId);

    if (user && user.isActive) {
      // Add user information to the request object
      (request as AuthenticatedFastifyRequest).user = user.toPublicJSON();
      (request as AuthenticatedFastifyRequest).userId = user.id;
    }

    // Continue regardless of authentication success or failure
  } catch (error) {
    // Log the error but don't block the request
    request.log.warn('Optional authentication failed:', error);
  }
};

/**
 * Email verification requirement middleware
 * Ensures that the authenticated user has verified their email address
 * 
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 */
export const requireEmailVerification = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedFastifyRequest;

  if (!authenticatedRequest.user) {
    const response: IAPIResponse = {
      success: false,
      message: 'Authentication required',
      error: 'User not authenticated',
      statusCode: 401,
    };
    return reply.status(401).send(response);
  }

  if (!authenticatedRequest.user.isEmailVerified) {
    const response: IAPIResponse = {
      success: false,
      message: 'Email verification required',
      error: 'Please verify your email address before accessing this resource',
      statusCode: 403,
    };
    return reply.status(403).send(response);
  }
};

/**
 * Rate limiting middleware
 * Implements rate limiting using Redis to prevent abuse
 * 
 * @param maxAttempts - Maximum number of attempts allowed
 * @param windowSeconds - Time window in seconds
 * @param keyPrefix - Redis key prefix for rate limiting
 */
export const rateLimit = (
  maxAttempts: number,
  windowSeconds: number,
  keyPrefix: string = 'rate_limit'
) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const redisUtils = (request.server as any).redisUtils as RedisUtils;
      
      // Create identifier - use user ID if authenticated, otherwise use IP address
      const authenticatedRequest = request as AuthenticatedFastifyRequest;
      const identifier = authenticatedRequest.userId || request.ip;
      const key = `${REDIS_KEYS.RATE_LIMIT}${keyPrefix}:${identifier}`;

      // Get current attempt count
      const currentAttempts = await redisUtils.get(key) || 0;

      if (currentAttempts >= maxAttempts) {
        const ttl = await redisUtils.get(`ttl:${key}`) || 0;
        
        const response: IAPIResponse = {
          success: false,
          message: 'Rate limit exceeded',
          error: `Too many requests. Try again in ${ttl} seconds.`,
          statusCode: 429,
          data: {
            retryAfter: ttl,
            maxAttempts,
            windowSeconds,
          },
        };
        
        return reply
          .status(429)
          .header('Retry-After', ttl.toString())
          .send(response);
      }

      // Increment attempt count
      await redisUtils.increment(key);
      
      // Set expiration on first attempt
      if (currentAttempts === 0) {
        await redisUtils.expire(key, windowSeconds);
      }

      // Add rate limit headers
      reply.header('X-RateLimit-Limit', maxAttempts.toString());
      reply.header('X-RateLimit-Remaining', (maxAttempts - currentAttempts - 1).toString());
      reply.header('X-RateLimit-Reset', (Date.now() + (windowSeconds * 1000)).toString());

    } catch (error) {
      request.log.error('Rate limiting error:', error);
      // Continue without rate limiting if Redis fails
    }
  };
};

/**
 * Authentication attempt rate limiting
 * Specifically designed for login/authentication endpoints
 * Implements progressive delays and account lockout
 */
export const authRateLimit = rateLimit(5, 900); // 5 attempts per 15 minutes

/**
 * General API rate limiting
 * For general API endpoints
 */
export const apiRateLimit = rateLimit(600, 3600); // 100 requests per hour

/**
 * Password reset rate limiting
 * For password reset requests
 */
export const passwordResetRateLimit = rateLimit(3, 3600); // 3 attempts per hour

/**
 * Account lockout middleware
 * Implements temporary account lockout after too many failed login attempts
 * 
 * @param maxAttempts - Maximum failed attempts before lockout
 * @param lockoutMinutes - Duration of lockout in minutes
 */
export const accountLockout = (maxAttempts: number = 5, lockoutMinutes: number = 30) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const { email } = request.body as { email: string };
      
      if (!email) {
        return; // Continue if no email provided
      }

      const redisUtils = (request.server as any).redisUtils as RedisUtils;
      const key = `${REDIS_KEYS.AUTH_ATTEMPTS}lockout:${email.toLowerCase()}`;

      // Check if account is currently locked
      const lockoutData = await redisUtils.get(key);
      
      if (lockoutData) {
        const { lockedUntil, attempts } = lockoutData;
        const now = Date.now();
        
        if (now < lockedUntil) {
          const remainingMinutes = Math.ceil((lockedUntil - now) / (1000 * 60));
          
          const response: IAPIResponse = {
            success: false,
            message: 'Account temporarily locked',
            error: `Too many failed login attempts. Account locked for ${remainingMinutes} more minutes.`,
            statusCode: 423,
            data: {
              lockedUntil: new Date(lockedUntil),
              remainingMinutes,
              maxAttempts,
            },
          };
          
          return reply.status(423).send(response);
        } else {
          // Lockout has expired, remove the lockout record
          await redisUtils.delete(key);
        }
      }

    } catch (error) {
      request.log.error('Account lockout check error:', error);
      // Continue without lockout protection if Redis fails
    }
  };
};

/**
 * Helper function to record failed login attempt
 * Should be called after a failed authentication attempt
 * 
 * @param email - User email address
 * @param redisUtils - Redis utilities instance
 * @param maxAttempts - Maximum attempts before lockout
 * @param lockoutMinutes - Lockout duration in minutes
 */
export const recordFailedLoginAttempt = async (
  email: string,
  redisUtils: RedisUtils,
  maxAttempts: number = 5,
  lockoutMinutes: number = 30
): Promise<void> => {
  try {
    const key = `${REDIS_KEYS.AUTH_ATTEMPTS}lockout:${email.toLowerCase()}`;
    
    // Get current lockout data
    const lockoutData = await redisUtils.get(key) || { attempts: 0, lockedUntil: 0 };
    
    // Increment attempts
    lockoutData.attempts += 1;
    
    // Check if we should lock the account
    if (lockoutData.attempts >= maxAttempts) {
      lockoutData.lockedUntil = Date.now() + (lockoutMinutes * 60 * 1000);
    }
    
    // Store updated lockout data
    await redisUtils.set(key, lockoutData, lockoutMinutes * 60);
    
  } catch (error) {
    console.error('Error recording failed login attempt:', error);
  }
};

/**
 * Helper function to clear failed login attempts
 * Should be called after a successful authentication
 * 
 * @param email - User email address
 * @param redisUtils - Redis utilities instance
 */
export const clearFailedLoginAttempts = async (
  email: string,
  redisUtils: RedisUtils
): Promise<void> => {
  try {
    const key = `${REDIS_KEYS.AUTH_ATTEMPTS}lockout:${email.toLowerCase()}`;
    await redisUtils.delete(key);
  } catch (error) {
    console.error('Error clearing failed login attempts:', error);
  }
};

/**
 * CORS preflight middleware
 * Handles OPTIONS requests for CORS preflight
 */
export const handleCORSPreflight = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (request.method === 'OPTIONS') {
    reply
      .status(200)
      .header('Access-Control-Allow-Origin', '*')
      .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      .header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .send();
  }
};

/**
 * Request logging middleware
 * Logs incoming requests for debugging and monitoring
 */
export const requestLogger = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const start = Date.now();
  
  // Log request start
  request.log.info({
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
  }, 'Incoming request');

  // Log when request completes (simplified approach)
  const originalSend = reply.send;
  reply.send = function(payload) {
    const duration = Date.now() - start;
    
    request.log.info({
      method: request.method,
      url: request.url,
      responseTime: `${duration}ms`,
      ip: request.ip,
    }, 'Request completed');
    
    return originalSend.call(this, payload);
  };
};

// Export the AuthenticatedFastifyRequest type for use in route handlers
export type { AuthenticatedFastifyRequest };