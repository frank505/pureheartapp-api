import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration interface
 * This ensures type safety for all environment variables
 */
interface EnvironmentConfig {
  // Server configuration
  NODE_ENV: string;
  PORT: number;
  HOST: string;

  // Database configuration
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;

  // Redis configuration
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;

  // JWT configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // Email configuration
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_FROM: string;

  // Application configuration
  APP_NAME: string;
  APP_URL: string;
  FRONTEND_URL: string;
  APP_STORE_URL: string;

  // Security configuration
  BCRYPT_ROUNDS: number;
  PASSWORD_RESET_EXPIRES: number;
  EMAIL_VERIFICATION_EXPIRES: number;

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: string;

  // Invite Match Configuration
  INVITE_MATCH_WINDOW_SECONDS: number;

  // YouTube/Google API for recommendations
  GOOGLE_API_KEY: string;

  // Gemini for advanced query generation
  GEMINI_API_KEY: string;
}

/**
 * Validates and returns environment configuration
 * Throws error if required environment variables are missing
 */
const getEnvironmentConfig = (): EnvironmentConfig => {
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'HOST',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
    'APP_NAME',
    'APP_URL',
    'FRONTEND_URL',
    'APP_STORE_URL',
    'BCRYPT_ROUNDS',
    'PASSWORD_RESET_EXPIRES',
    'EMAIL_VERIFICATION_EXPIRES',
    'GOOGLE_CLIENT_ID',
    'INVITE_MATCH_WINDOW_SECONDS'
  ];

  // Check for missing required environment variables
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV!,
    PORT: parseInt(process.env.PORT!, 10),
    HOST: process.env.HOST!,

    DB_HOST: process.env.DB_HOST!,
    DB_PORT: parseInt(process.env.DB_PORT!, 10),
    DB_NAME: process.env.DB_NAME!,
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,

    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: parseInt(process.env.REDIS_PORT!, 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN!,

    EMAIL_HOST: process.env.EMAIL_HOST!,
    EMAIL_PORT: parseInt(process.env.EMAIL_PORT!, 10),
    EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
    EMAIL_USER: process.env.EMAIL_USER!,
    EMAIL_PASS: process.env.EMAIL_PASS!,
    EMAIL_FROM: process.env.EMAIL_FROM!,
    
    APP_NAME: process.env.APP_NAME!,
    APP_URL: process.env.APP_URL!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    APP_STORE_URL: process.env.APP_STORE_URL!,

    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS!, 10),
    PASSWORD_RESET_EXPIRES: parseInt(process.env.PASSWORD_RESET_EXPIRES!, 10),
    EMAIL_VERIFICATION_EXPIRES: parseInt(process.env.EMAIL_VERIFICATION_EXPIRES!, 10),
    
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,

    INVITE_MATCH_WINDOW_SECONDS: parseInt(process.env.INVITE_MATCH_WINDOW_SECONDS!, 10),

    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  };
};

// Export the configuration object
export const config = getEnvironmentConfig();

// Export individual configuration sections for convenience
export const serverConfig = {
  NODE_ENV: config.NODE_ENV,
  PORT: config.PORT,
  HOST: config.HOST,
};

export const databaseConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  username: config.DB_USER,
  password: config.DB_PASSWORD,
};

export const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
};

export const jwtConfig = {
  secret: config.JWT_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
};

export const emailConfig = {
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  secure: config.EMAIL_SECURE,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
  from: config.EMAIL_FROM,
};

export const appConfig = {
  name: config.APP_NAME,
  url: config.APP_URL,
  frontendUrl: config.FRONTEND_URL,
  appStoreUrl: config.APP_STORE_URL,
};

export const securityConfig = {
  bcryptRounds: config.BCRYPT_ROUNDS,
  passwordResetExpires: config.PASSWORD_RESET_EXPIRES,
  emailVerificationExpires: config.EMAIL_VERIFICATION_EXPIRES,
  inviteMatchWindowSeconds: config.INVITE_MATCH_WINDOW_SECONDS,
};

export const googleConfig = {
  clientId: config.GOOGLE_CLIENT_ID,
};

export const youtubeConfig = {
  apiKey: config.GOOGLE_API_KEY,
};

export const geminiConfig = {
  apiKey: config.GEMINI_API_KEY,
};