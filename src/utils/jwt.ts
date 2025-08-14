import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/environment';
import { IJWTPayload, IJWTTokens, IUserPublic } from '../types/auth';

/**
 * JWT Utilities for token generation, validation, and management
 * This module provides all JWT-related functionality for the authentication system
 */

/**
 * Generate JWT access token
 * @param user - User data to include in the token payload
 * @returns string - The generated JWT token
 */
export const generateAccessToken = (user: IUserPublic): string => {
  const payload: IJWTPayload = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  };
    console.log({jwtConfig});
    console.log({payload});
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn } as any);
};

/**
 * Generate JWT refresh token
 * @param user - User data to include in the token payload
 * @returns string - The generated refresh token
 */
export const generateRefreshToken = (user: IUserPublic): string => {
  const payload: IJWTPayload = {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
  };

  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.refreshExpiresIn } as any);
};

/**
 * Generate both access and refresh tokens
 * @param user - User data to include in the token payload
 * @returns IJWTTokens - Object containing both tokens and expiration info
 */
export const generateTokens = (user: IUserPublic): IJWTTokens => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // Calculate expiration time in seconds
  const expiresIn = getTokenExpirationTime(jwtConfig.expiresIn);

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
};

/**
 * Verify and decode JWT token
 * @param token - The JWT token to verify
 * @returns IJWTPayload - The decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyToken = (token: string): IJWTPayload => {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as IJWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error('Token not active yet');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify refresh token specifically
 * @param token - The refresh token to verify
 * @returns IJWTPayload - The decoded token payload
 * @throws Error if token is invalid or expired
 */
export const verifyRefreshToken = (token: string): IJWTPayload => {
  return verifyToken(token); // Same verification process for now
};

/**
 * Decode JWT token without verification (useful for extracting info from expired tokens)
 * @param token - The JWT token to decode
 * @returns IJWTPayload | null - The decoded payload or null if invalid
 */
export const decodeToken = (token: string): IJWTPayload | null => {
  try {
    const decoded = jwt.decode(token) as IJWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiration time in seconds
 * @param expiresIn - The expiration string (e.g., '7d', '1h', '30m')
 * @returns number - Expiration time in seconds
 */
export const getTokenExpirationTime = (expiresIn: string): number => {
  // Convert expiration string to seconds
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 's': // seconds
      return value;
    case 'm': // minutes
      return value * 60;
    case 'h': // hours
      return value * 3600;
    case 'd': // days
      return value * 86400;
    case 'w': // weeks
      return value * 604800;
    default:
      throw new Error(`Invalid expiration format: ${expiresIn}`);
  }
};

/**
 * Check if token is expired
 * @param token - The JWT token to check
 * @returns boolean - True if token is expired, false otherwise
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration date
 * @param token - The JWT token to check
 * @returns Date | null - The expiration date or null if invalid
 */
export const getTokenExpirationDate = (token: string): Date | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Get remaining time until token expires
 * @param token - The JWT token to check
 * @returns number - Remaining time in seconds (0 if expired)
 */
export const getTokenTimeRemaining = (token: string): number => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - currentTime;
    
    return Math.max(0, remaining);
  } catch (error) {
    return 0;
  }
};

/**
 * Extract token from Authorization header
 * @param authHeader - The Authorization header value (e.g., "Bearer token123")
 * @returns string | null - The extracted token or null if invalid format
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
};

/**
 * Check if token is blacklisted (placeholder - actual implementation in RedisUtils)
 * @param token - The JWT token
 * @returns Promise<boolean> - True if token is blacklisted
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  // This is handled by RedisUtils in the middleware
  return false;
};

/**
 * Create a token blacklist key for Redis
 * @param token - The JWT token
 * @returns string - The Redis key for blacklisting
 */
export const createTokenBlacklistKey = (token: string): string => {
  return `blacklist:${token}`;
};

/**
 * Generate a secure token for password reset or email verification
 * @param length - The length of the token (default: 32)
 * @returns string - A cryptographically secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate JWT token structure (basic format check)
 * @param token - The token to validate
 * @returns boolean - True if token has valid JWT structure
 */
export const isValidJWTStructure = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Get user ID from token without full verification
 * @param token - The JWT token
 * @returns string | null - The user ID or null if not found
 */
export const getUserIdFromToken = (token: string): number | null => {
  try {
    const decoded = decodeToken(token);
    return decoded?.userId || null;
  } catch (error) {
    return null;
  }
};

/**
 * Token validation middleware helper
 * @param token - The JWT token to validate
 * @returns Promise<IJWTPayload> - The validated token payload
 */
export const validateTokenForMiddleware = async (token: string): Promise<IJWTPayload> => {
  if (!token) {
    throw new Error('No token provided');
  }

  if (!isValidJWTStructure(token)) {
    throw new Error('Invalid token format');
  }

  if (isTokenExpired(token)) {
    throw new Error('Token has expired');
  }

  return verifyToken(token);
};

/**
 * Create JWT options object for consistent token generation
 * @param expiresIn - Optional custom expiration time
 * @returns object - JWT sign options
 */
export const createJWTOptions = (expiresIn?: string) => {
  return {
    expiresIn: expiresIn || jwtConfig.expiresIn,
    issuer: 'christian-recovery-app',
    audience: 'christian-recovery-app-users',
    algorithm: 'HS256' as const
  };
};

/**
 * Refresh tokens utility
 * @param refreshToken - The refresh token to use
 * @param user - The user data for generating new tokens
 * @returns IJWTTokens - New access and refresh tokens
 */
export const refreshTokens = (refreshToken: string, user: IUserPublic): IJWTTokens => {
  // Verify the refresh token first
  const decoded = verifyRefreshToken(refreshToken);
  
  // Ensure the token belongs to the same user
  if (decoded.userId !== user.id) {
    throw new Error('Invalid refresh token for user');
  }

  // Generate new tokens
  return generateTokens(user);
};