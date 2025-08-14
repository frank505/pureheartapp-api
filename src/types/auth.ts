/**
 * Authentication-related TypeScript interfaces and types
 * This file defines all the types used throughout the authentication system
 */

import { FastifyRequest } from 'fastify';
import { IUser } from './user';

/**
 * Defines the shape of the user object in the database, including all fields.
 */
export { IUser };

/**
 * User creation interface (without auto-generated fields)
 */
export interface IUserCreate {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  username?: string;
}

/**
 * User update interface (all fields optional except id)
 */
export interface IUserUpdate {
  id: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date;
}

/**
 * User public interface (without sensitive data)
 */
export interface IUserPublic {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar?: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JWT payload interface
 */
export interface IJWTPayload {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  iat?: number;  // Issued at
  exp?: number;  // Expires at
}

/**
 * JWT tokens interface
 */
export interface IJWTTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login request interface
 */
export interface ILoginRequest {
  email: string;
  password: string;
}

/**
 * Login response interface
 */
export interface ILoginResponse {
  user: IUserPublic;
  tokens: IJWTTokens;
  message: string;
}

/**
 * Register request interface
 */
export interface IRegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

/**
 * Register response interface
 */
export interface IRegisterResponse {
  user: IUserPublic;
  tokens: IJWTTokens;
  message: string;
}

/**
 * Forgot password request interface
 */
export interface IForgotPasswordRequest {
  email: string;
}

/**
 * Forgot password response interface
 */
export interface IForgotPasswordResponse {
  message: string;
  success: boolean;
}

/**
 * Reset password request interface
 */
export interface IResetPasswordRequest {
  token: string;
  userId: number;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Reset password response interface
 */
export interface IResetPasswordResponse {
  message: string;
  success: boolean;
}

/**
 * Change password request interface
 */
export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Email verification request interface
 */
export interface IEmailVerificationRequest {
  token: string;
  userId: number;
}

/**
 * Refresh token request interface
 */
export interface IRefreshTokenRequest {
  refreshToken: string;
}

/**
 * API Response interface for consistent responses
 */
export interface IAPIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
}

/**
 * Authentication context interface (for request context)
 */
export interface IAuthContext {
  user: IUserPublic;
  userId: number;
  isAuthenticated: boolean;
}

/**
 * Rate limiting context interface
 */
export interface IRateLimitContext {
  identifier: string;
  attempts: number;
  isBlocked: boolean;
  timeRemaining?: number;
}

/**
 * Email template data interface
 */
export interface IEmailTemplateData {
  firstName: string;
  lastName: string;
  email: string;
  resetUrl?: string;
  verificationUrl?: string;
  appName: string;
}

/**
 * Password validation result interface
 */
export interface IPasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

/**
 * Validation error interface
 */
export interface IValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Request with user context (for authenticated routes)
 */
export interface IAuthenticatedRequest {
  user: IUserPublic;
  userId: number;
}

export interface IRequest extends FastifyRequest {
  user: IUser;
}

/**
 * Database transaction type
 */
export type DatabaseTransaction = any; // Will be properly typed with Sequelize transaction type

/**
 * Email service interface
 */
export interface IEmailService {
  sendPasswordResetEmail(email: string, resetUrl: string, userData: IEmailTemplateData): Promise<boolean>;
  sendEmailVerificationEmail(email: string, verificationUrl: string, userData: IEmailTemplateData): Promise<boolean>;
  sendWelcomeEmail(email: string, userData: IEmailTemplateData): Promise<boolean>;
}

/**
 * Authentication service interface
 */
export interface IAuthService {
  register(userData: IRegisterRequest): Promise<IRegisterResponse>;
  login(credentials: ILoginRequest): Promise<ILoginResponse>;
  forgotPassword(request: IForgotPasswordRequest): Promise<IForgotPasswordResponse>;
  resetPassword(request: IResetPasswordRequest): Promise<IResetPasswordResponse>;
  changePassword(userId: number, request: IChangePasswordRequest): Promise<IAPIResponse>;
  verifyEmail(request: IEmailVerificationRequest): Promise<IAPIResponse>;
  refreshTokens(request: IRefreshTokenRequest): Promise<IJWTTokens>;
  logout(token: string): Promise<void>;
}

/**
 * Onboarding Data Interfaces
 */

export interface PersonalInfo {
  // This is a placeholder, real properties should be defined as needed.
  name?: string;
  age?: number;
}

export interface AssessmentData {
  // This is a placeholder, real properties should be defined as needed.
  question1?: string;
}

export interface AdditionalAssessmentData {
  // This is a placeholder, real properties should be defined as needed.
  question2?: string;
}

export interface FaithData {
  // This is a placeholder, real properties should be defined as needed.
  denomination?: string;
}

export interface HowTheyHeard {
  // This is a placeholder, real properties should be defined as needed.
  source?: string;
}

export interface AccountabilityPreferences {
  // This is a placeholder, real properties should be defined as needed.
  partner?: boolean;
  invitationHash?: string;
}

export interface RecoveryJourneyData {
  // This is a placeholder, real properties should be defined as needed.
  startDate?: string;
}

export interface OnboardingState {
  personalInfo: Partial<PersonalInfo>;
  assessmentData: Partial<AssessmentData>;
  additionalAssessmentData: Partial<AdditionalAssessmentData>;
  faithData: Partial<FaithData>;
  howTheyHeard: Partial<HowTheyHeard>;
  accountabilityPreferences: Partial<AccountabilityPreferences>;
  recoveryJourneyData: Partial<RecoveryJourneyData>;
  lastSaveTime: string | null;
}


export interface IGoogleLoginRequest {
  idToken: string;
  onboardingData: OnboardingState;
  init_sent_accountability_id?: string;
  init_reciever_sent_accountablity_id?: string;
  invitedEmails?: string[];
}

export interface IAppleLoginRequest {
  idToken: string;
  onboardingData: OnboardingState;
  accountability_partner_hash?: string;
}

export interface IMatchInstallRequest {
  deviceFingerprint: {
    [key: string]: any;
  };
}

export interface IInviteUser {
  emails: string[];
  hash?: string;
}
