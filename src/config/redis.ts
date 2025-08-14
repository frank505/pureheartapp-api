import { redisConfig, serverConfig } from './environment';

/**
 * Redis client configuration and utilities
 * This module sets up Redis connection and provides helper functions for caching
 */

// Redis client options interface
interface RedisClientOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
}

/**
 * Get Redis connection options
 * This function returns the Redis configuration options for Fastify Redis plugin
 */
export const getRedisOptions = (): RedisClientOptions => {
  const options: RedisClientOptions = {
    host: redisConfig.host,
    port: redisConfig.port,
    db: 0, // Use database 0 by default
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    ...(redisConfig.password && { password: redisConfig.password }),
  };

  return options;
};

/**
 * Redis key prefixes for different data types
 * This helps organize data in Redis and prevents key collisions
 */
export const REDIS_KEYS = {
  // Session keys
  SESSION: 'session:',
  
  // JWT token blacklist (for logout functionality)
  BLACKLIST: 'blacklist:',
  
  // Password reset tokens
  PASSWORD_RESET: 'password_reset:',
  
  // Email verification tokens
  EMAIL_VERIFICATION: 'email_verification:',
  
  // Rate limiting keys
  RATE_LIMIT: 'rate_limit:',
  
  // User cache
  USER_CACHE: 'user:',
  
  // Authentication attempts
  AUTH_ATTEMPTS: 'auth_attempts:',
} as const;

/**
 * Redis utility functions
 * These provide convenient methods for common Redis operations
 */
export class RedisUtils {
  private redis: any;

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  /**
   * Set a value in Redis with optional expiration
   * @param key - The Redis key
   * @param value - The value to store
   * @param expireInSeconds - Optional expiration time in seconds
   */
  async set(key: string, value: any, expireInSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    
    if (expireInSeconds) {
      await this.redis.setex(key, expireInSeconds, serializedValue);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  /**
   * Get a value from Redis
   * @param key - The Redis key
   * @returns The parsed value or null if not found
   */
  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);
    
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      // If JSON parse fails, return the raw value
      return value;
    }
  }

  /**
   * Delete a key from Redis
   * @param key - The Redis key to delete
   */
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Check if a key exists in Redis
   * @param key - The Redis key to check
   * @returns True if key exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Set expiration time for a key
   * @param key - The Redis key
   * @param expireInSeconds - Expiration time in seconds
   */
  async expire(key: string, expireInSeconds: number): Promise<void> {
    await this.redis.expire(key, expireInSeconds);
  }

  /**
   * Increment a numeric value in Redis
   * @param key - The Redis key
   * @param increment - The amount to increment by (default: 1)
   */
  async increment(key: string, increment: number = 1): Promise<number> {
    return await this.redis.incrby(key, increment);
  }

  /**
   * Set a value only if the key doesn't exist
   * @param key - The Redis key
   * @param value - The value to store
   * @param expireInSeconds - Optional expiration time in seconds
   */
  async setIfNotExists(key: string, value: any, expireInSeconds?: number): Promise<boolean> {
    const serializedValue = JSON.stringify(value);
    const result = await this.redis.set(key, serializedValue, 'NX');
    
    if (result === 'OK' && expireInSeconds) {
      await this.expire(key, expireInSeconds);
    }
    
    return result === 'OK';
  }

  /**
   * Add a token to the JWT blacklist
   * @param token - The JWT token to blacklist
   * @param expireInSeconds - Time until the token naturally expires
   */
  async blacklistToken(token: string, expireInSeconds: number): Promise<void> {
    const key = `${REDIS_KEYS.BLACKLIST}${token}`;
    await this.set(key, true, expireInSeconds);
  }

  /**
   * Check if a token is blacklisted
   * @param token - The JWT token to check
   * @returns True if token is blacklisted, false otherwise
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${REDIS_KEYS.BLACKLIST}${token}`;
    return await this.exists(key);
  }

  /**
   * Store password reset token
   * @param userId - The user ID
   * @param token - The reset token
   * @param expireInSeconds - Token expiration time
   */
  async storePasswordResetToken(userId: string, token: string, expireInSeconds: number): Promise<void> {
    const key = `${REDIS_KEYS.PASSWORD_RESET}${userId}`;
    await this.set(key, token, expireInSeconds);
  }

  /**
   * Get and validate password reset token
   * @param userId - The user ID
   * @param token - The reset token to validate
   * @returns True if token is valid, false otherwise
   */
  async validatePasswordResetToken(userId: string, token: string): Promise<boolean> {
    const key = `${REDIS_KEYS.PASSWORD_RESET}${userId}`;
    const storedToken = await this.get(key);
    
    if (!storedToken || storedToken !== token) {
      return false;
    }

    // Delete the token after successful validation (one-time use)
    await this.delete(key);
    return true;
  }

  /**
   * Increment authentication attempts for a user/IP
   * @param identifier - User ID or IP address
   * @param expireInSeconds - Time window for attempts counting
   * @returns Number of attempts
   */
  async incrementAuthAttempts(identifier: string, expireInSeconds: number): Promise<number> {
    const key = `${REDIS_KEYS.AUTH_ATTEMPTS}${identifier}`;
    const attempts = await this.increment(key);
    
    // Set expiration only on first attempt
    if (attempts === 1) {
      await this.expire(key, expireInSeconds);
    }
    
    return attempts;
  }

  /**
   * Reset authentication attempts for a user/IP
   * @param identifier - User ID or IP address
   */
  async resetAuthAttempts(identifier: string): Promise<void> {
    const key = `${REDIS_KEYS.AUTH_ATTEMPTS}${identifier}`;
    await this.delete(key);
  }
}

/**
 * Redis health check function
 * This can be used to verify Redis connectivity
 */
export const checkRedisHealth = async (redisClient: any): Promise<boolean> => {
  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};