import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import {
  ILoginRequest,
  IRegisterRequest,
  IForgotPasswordRequest,
  IResetPasswordRequest,
  IChangePasswordRequest,
  IEmailVerificationRequest,
  IRefreshTokenRequest,
  IAPIResponse,
  ILoginResponse,
  IRegisterResponse,
  IForgotPasswordResponse,
  IResetPasswordResponse,
  IGoogleLoginRequest,
  IAppleLoginRequest,
  IUserPublic,
} from '../types/auth';
import {
  validateWithSchema,
  validateRegistration,
  validateResetPassword,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  emailVerificationSchema,
  refreshTokenSchema,
} from '../utils/validation';
import { generateTokens, verifyRefreshToken, extractTokenFromHeader } from '../utils/jwt';
import { generateUniqueHash } from '../utils/hash';
import { EmailQueueService } from '../jobs/emailJobs';
// Import models through the index to ensure associations are initialized
import { User, OnboardingData, AccountabilityPartner, sequelize } from '../models';
import { TruthLiesQueueService } from '../jobs/truthLiesJobs';
import {
  authenticate,
  authRateLimit,
  passwordResetRateLimit,
  accountLockout,
  recordFailedLoginAttempt,
  clearFailedLoginAttempts,
  AuthenticatedFastifyRequest,
} from '../middleware/auth';
import { RedisUtils } from '../config/redis';
import { appConfig, googleConfig } from '../config/environment';
import { SubscriptionService } from '../services/subscriptionService';

const client = new OAuth2Client(googleConfig.clientId);

/**
 * Authentication routes for the Fastify application
 * This module contains all authentication-related endpoints:
 * - POST /register - User registration
 * - POST /login - User login
 * - POST /logout - User logout
 * - POST /forgot-password - Request password reset
 * - POST /reset-password - Reset password with token
 * - POST /change-password - Change password (authenticated)
 * - POST /verify-email - Verify email address
 * - POST /refresh-token - Refresh JWT tokens
 * - GET /me - Get current user profile
 */

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * Google Login Endpoint
   * POST /api/auth/google-login
   * 
   * Authenticates a user with a Google ID token and saves onboarding data.
   */
  // accountability_partner_hash this one is the id that is initially sent as invitation
  // account_partner_hash_value this is the one the user uses when he opens the app from a link
  fastify.post<{ Body: IGoogleLoginRequest }>('/google-login', async (request, reply) => {
    const { idToken, onboardingData, 
      init_sent_accountability_id,
       init_reciever_sent_accountablity_id,
       invitedEmails
      } = request.body;
   
    const t = await sequelize.transaction();

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: googleConfig.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        await t.rollback();
        return reply.status(401).send({
          success: false,
          message: 'Invalid Google token',
          statusCode: 401,
        });
      }

      let user = await User.findByEmail(payload.email);
      let isRegistration = false;
      if (!user) {
        isRegistration = true;
        const username = await User.generateUniqueUsername(payload.given_name || '', payload.family_name || '');
        user = await User.create({
          email: payload.email,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          username,
          isEmailVerified: true,
        }, { transaction: t });
      }

      if (isRegistration && onboardingData) {
       await Promise.all(
          [
            OnboardingData.create({
              userId: user.id,
              ...onboardingData,
            }, { transaction: t }),
            TruthLiesQueueService.addGenerateTruthLiesJob(user.id, onboardingData)
          ]
        );
        
      } else if (isRegistration) {
        // Generate general truth/lies if no onboarding data
        await TruthLiesQueueService.addGenerateTruthLiesJob(user.id);
      }
      if(init_sent_accountability_id || onboardingData.accountabilityPreferences?.invitationHash ){
        if(isRegistration){
            await AccountabilityPartner.create({
                userId: user.id,
                hash: init_sent_accountability_id || onboardingData.accountabilityPreferences?.invitationHash || '',
            }, { transaction: t });
        }
      }

      if (isRegistration && invitedEmails && invitedEmails.length > 0) {
        const inviterName = `${user.firstName} ${user.lastName}`;
        const invitationPromises = invitedEmails.map(async (email) => {
            if (email) {
                const hash = await generateUniqueHash();
                await AccountabilityPartner.create({
                    userId: user.id,
                    hash,
                }, { transaction: t });
                await EmailQueueService.addAccountabilityInviteEmailJob(email, inviterName, hash);
            }
        });
        await Promise.all(invitationPromises);
      }

      if(init_reciever_sent_accountablity_id){
        const accountabilityPartner = await AccountabilityPartner.findOne({ where: { hash: init_reciever_sent_accountablity_id } });
        if(accountabilityPartner){
          accountabilityPartner.receiverId = user.id;
          accountabilityPartner.usedAt = new Date();
          await accountabilityPartner.save({ transaction: t });
        }
      }
     
      await t.commit();

      const tokens = generateTokens(user.toPublicJSON());

      reply.send({
        user: user.toPublicJSON(),
        tokens,
        message: 'Google login successful',
      });
    } catch (error) {
      await t.rollback();
      request.log.error('Google login error:', error);
      reply.status(500).send({
        success: false,
        message: 'An error occurred during Google login.',
        statusCode: 500,
      });
    }
  });

  /**
   * Apple Login Endpoint (Placeholder)
   * POST /api/auth/apple-login
   * 
   * A placeholder for Apple login functionality.
   */
  fastify.post<{ Body: IAppleLoginRequest }>('/apple-login', async (request, reply) => {
    // This is a placeholder and needs a real Apple ID token verification implementation
    // For now, it simulates the logic based on a mock payload.
    const { idToken, onboardingData, accountability_partner_hash } = request.body;
    const t = await sequelize.transaction();

    try {
      // In a real implementation, you would verify the Apple ID token here.
      // const appleUser = await verifyAppleToken(idToken);
      // For demonstration, we'll use a mock payload.
      const payload = {
        email: `user-${Date.now()}@apple.com`,
        given_name: 'Apple',
        family_name: 'User',
      };

      if (!payload || !payload.email) {
        await t.rollback();
        return reply.status(401).send({
          success: false,
          message: 'Invalid Apple token',
          statusCode: 401,
        });
      }

      let user = await User.findByEmail(payload.email);

      if (!user) {
        const username = await User.generateUniqueUsername(payload.given_name || '', payload.family_name || '');
        user = await User.create({
          email: payload.email,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          username,
          isEmailVerified: true,
        }, { transaction: t });
      }

      await OnboardingData.create({
        userId: user.id,
        ...onboardingData,
      }, { transaction: t });

      if (accountability_partner_hash) {
        const accountabilityPartner = await AccountabilityPartner.findOne({ where: { hash: accountability_partner_hash } });
        if (accountabilityPartner) {
          accountabilityPartner.receiverId = user.id;
          accountabilityPartner.usedAt = new Date();
          await accountabilityPartner.save({ transaction: t });
        }
      }

      await t.commit();

      const tokens = generateTokens(user.toPublicJSON());

      reply.send({
        user: user.toPublicJSON(),
        tokens,
        message: 'Apple login successful',
      });
    } catch (error) {
      await t.rollback();
      request.log.error('Apple login error:', error);
      reply.status(500).send({
        success: false,
        message: 'An error occurred during Apple login.',
        statusCode: 500,
      });
    }
  });

  /**
   * User Registration Endpoint
   * POST /api/auth/register
   * 
   * Creates a new user account with email verification
   */
  fastify.post<{ Body: IRegisterRequest }>('/register', {
    preHandler: [authRateLimit],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'confirmPassword', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
          confirmPassword: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: IRegisterRequest }>, reply: FastifyReply) => {
    try {
      // Validate input data
      const validationErrors = validateRegistration(request.body);
      if (validationErrors.length > 0) {
        const response: IAPIResponse = {
          success: false,
          message: 'Validation failed',
          error: 'Invalid input data',
          statusCode: 400,
          data: { validationErrors },
        };
        return reply.status(400).send(response);
      }

      const { email, password, firstName, lastName } = request.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        const response: IAPIResponse = {
          success: false,
          message: 'Registration failed',
          error: 'An account with this email address already exists',
          statusCode: 409,
        };
        return reply.status(409).send(response);
      }

      // Create new user
      const username = await User.generateUniqueUsername(firstName, lastName);
      const user = await User.createUser({
        email,
        password,
        firstName,
        lastName,
        username,
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Generate JWT tokens
      const tokens = generateTokens(user.toPublicJSON());

      // Queue verification email
      const verificationUrl = `${appConfig.frontendUrl}/verify-email?token=${verificationToken}&userId=${user.id}`;
      try {
        await EmailQueueService.addEmailVerificationJob(
          user.email,
          verificationUrl,
          {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            verificationUrl,
            appName: appConfig.name,
          }
        );
        fastify.log.info('Email verification job queued', { userId: user.id });
      } catch (error) {
        fastify.log.error('Failed to queue verification email', { userId: user.id, error });
      }

      // Queue welcome email
      try {
        await EmailQueueService.addWelcomeEmailJob(user.email, {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          appName: appConfig.name,
        });
        fastify.log.info('Welcome email job queued', { userId: user.id });
      } catch (error) {
        fastify.log.error('Failed to queue welcome email', { userId: user.id, error });
      }

      const response: IRegisterResponse = {
        user: user.toPublicJSON(),
        tokens,
        message: 'Registration successful! Please check your email to verify your account.',
      };

      return reply.status(201).send(response);

    } catch (error) {
      request.log.error('Registration error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Registration failed',
        error: 'An error occurred during registration',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * User Login Endpoint
   * POST /api/auth/login
   * 
   * Authenticates user and returns JWT tokens
   */
  fastify.post<{ Body: ILoginRequest }>('/login', {
    preHandler: [authRateLimit, accountLockout()],
    schema: {
      body: loginSchema,
    },
  }, async (request: FastifyRequest<{ Body: ILoginRequest }>, reply: FastifyReply) => {
    try {
      // Validate input data
      const validationErrors = validateWithSchema(request.body, loginSchema);
      if (validationErrors.length > 0) {
        const response: IAPIResponse = {
          success: false,
          message: 'Validation failed',
          error: 'Invalid input data',
          statusCode: 400,
          data: { validationErrors },
        };
        return reply.status(400).send(response);
      }

      const { email, password } = request.body;
      const redisUtils = (request.server as any).redisUtils as RedisUtils;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        // Record failed attempt
        await recordFailedLoginAttempt(email, redisUtils);
        
        const response: IAPIResponse = {
          success: false,
          message: 'Authentication failed',
          error: 'Invalid email or password',
          statusCode: 401,
        };
        return reply.status(401).send(response);
      }

      // Check if user account is active
      if (!user.isActive) {
        const response: IAPIResponse = {
          success: false,
          message: 'Authentication failed',
          error: 'Account is deactivated. Please contact support.',
          statusCode: 401,
        };
        return reply.status(401).send(response);
      }

      // Validate password if provided
      if (password) {
        const isPasswordValid = await user.validatePassword(password);
        if (!isPasswordValid) {
          // Record failed attempt
          await recordFailedLoginAttempt(email, redisUtils);
          
          const response: IAPIResponse = {
            success: false,
            message: 'Authentication failed',
            error: 'Invalid email or password',
            statusCode: 401,
          };
          return reply.status(401).send(response);
        }
      } else if (user.password) {
        // If password is not provided but user has one, fail
        const response: IAPIResponse = {
          success: false,
          message: 'Authentication failed',
          error: 'Password is required for this account',
          statusCode: 401,
        };
        return reply.status(401).send(response);
      }

      // Clear failed login attempts on successful login
      await clearFailedLoginAttempts(email, redisUtils);

      // Update last login time
      await user.updateLastLogin();

      // Generate JWT tokens
      const tokens = generateTokens(user.toPublicJSON());

      const response: ILoginResponse = {
        user: user.toPublicJSON(),
        tokens,
        message: 'Login successful',
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Login error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Login failed',
        error: 'An error occurred during login',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * User Logout Endpoint
   * POST /api/auth/logout
   * 
   * Invalidates the JWT token by adding it to blacklist
   */
  fastify.post('/logout', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = extractTokenFromHeader(authHeader);

      if (token) {
        const redisUtils = (request.server as any).redisUtils as RedisUtils;
        // Add token to blacklist for remaining lifetime
        await redisUtils.blacklistToken(token, 7 * 24 * 60 * 60); // 7 days
      }

      const response: IAPIResponse = {
        success: true,
        message: 'Logout successful',
        statusCode: 200,
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Logout error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Logout failed',
        error: 'An error occurred during logout',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * Forgot Password Endpoint
   * POST /api/auth/forgot-password
   * 
   * Sends password reset email to user
   */
  fastify.post<{ Body: IForgotPasswordRequest }>('/forgot-password', {
    preHandler: [passwordResetRateLimit],
    schema: {
      body: forgotPasswordSchema,
    },
  }, async (request: FastifyRequest<{ Body: IForgotPasswordRequest }>, reply: FastifyReply) => {
    try {
      // Validate input data
      const validationErrors = validateWithSchema(request.body, forgotPasswordSchema);
      if (validationErrors.length > 0) {
        const response: IAPIResponse = {
          success: false,
          message: 'Validation failed',
          error: 'Invalid input data',
          statusCode: 400,
          data: { validationErrors },
        };
        return reply.status(400).send(response);
      }

      const { email } = request.body;

      // Find user by email
      const user = await User.findByEmail(email);

      // Always return success message for security (don't reveal if email exists)
      const response: IForgotPasswordResponse = {
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true,
      };

      // If user exists and is active, send reset email
      if (user && user.isActive) {
        // Generate password reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // Queue reset email
        const resetUrl = `${appConfig.frontendUrl}/reset-password?token=${resetToken}&userId=${user.id}`;
        try {
          await EmailQueueService.addPasswordResetEmailJob(
            user.email,
            resetUrl,
            {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              resetUrl,
              appName: appConfig.name,
            }
          );
          fastify.log.info('Password reset email job queued', { userId: user.id });
        } catch (error) {
          fastify.log.error('Failed to queue password reset email', { userId: user.id, error });
        }
      }

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Forgot password error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Password reset request failed',
        error: 'An error occurred while processing your request',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * Reset Password Endpoint
   * POST /api/auth/reset-password
   * 
   * Resets user password using token from email
   */
  fastify.post<{ Body: IResetPasswordRequest }>('/reset-password', {
    preHandler: [authRateLimit],
    schema: {
      body: {
        type: 'object',
        required: ['token', 'userId', 'newPassword', 'confirmPassword'],
        properties: {
          token: { type: 'string' },
          userId: { type: 'string' },
          newPassword: { type: 'string' },
          confirmPassword: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: IResetPasswordRequest }>, reply: FastifyReply) => {
    try {
      // Validate input data
      const validationErrors = validateResetPassword(request.body);
      if (validationErrors.length > 0) {
        const response: IAPIResponse = {
          success: false,
          message: 'Validation failed',
          error: 'Invalid input data',
          statusCode: 400,
          data: { validationErrors },
        };
        return reply.status(400).send(response);
      }

      const { token, userId, newPassword } = request.body;

      // Find user by ID
      const user = await User.findByPk(userId);
      if (!user) {
        const response: IAPIResponse = {
          success: false,
          message: 'Password reset failed',
          error: 'Invalid reset token',
          statusCode: 400,
        };
        return reply.status(400).send(response);
      }

      // Validate reset token
      if (!user.isPasswordResetTokenValid(token)) {
        const response: IAPIResponse = {
          success: false,
          message: 'Password reset failed',
          error: 'Invalid or expired reset token',
          statusCode: 400,
        };
        return reply.status(400).send(response);
      }

      // Update password
      await user.updatePassword(newPassword);

      // Clear reset token
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save();

      // Clear any failed login attempts
      const redisUtils = (request.server as any).redisUtils as RedisUtils;
      await clearFailedLoginAttempts(user.email, redisUtils);

      const response: IResetPasswordResponse = {
        message: 'Password has been reset successfully. You can now log in with your new password.',
        success: true,
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Reset password error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Password reset failed',
        error: 'An error occurred while resetting your password',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * Change Password Endpoint
   * POST /api/auth/change-password
   * 
   * Changes password for authenticated user
   */
  fastify.post<{ Body: IChangePasswordRequest }>('/change-password', {
    preHandler: [authenticate, authRateLimit],
    schema: {
      body: changePasswordSchema,
    },
  }, async (request: FastifyRequest<{ Body: IChangePasswordRequest }>, reply: FastifyReply) => {
    try {
      // Validate input data
      const validationErrors = validateWithSchema(request.body, changePasswordSchema);
      if (validationErrors.length > 0) {
        const response: IAPIResponse = {
          success: false,
          message: 'Validation failed',
          error: 'Invalid input data',
          statusCode: 400,
          data: { validationErrors },
        };
        return reply.status(400).send(response);
      }

      const { currentPassword, newPassword } = request.body;
      const authenticatedRequest = request as AuthenticatedFastifyRequest;
      const userId = authenticatedRequest.userId;

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        const response: IAPIResponse = {
          success: false,
          message: 'User not found',
          error: 'Invalid user',
          statusCode: 404,
        };
        return reply.status(404).send(response);
      }

      // Validate current password
      const isCurrentPasswordValid = await user.validatePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        const response: IAPIResponse = {
          success: false,
          message: 'Password change failed',
          error: 'Current password is incorrect',
          statusCode: 400,
        };
        return reply.status(400).send(response);
      }

      // Update password
      await user.updatePassword(newPassword);

      // Queue password changed notification
      try {
        await EmailQueueService.addPasswordChangedNotificationJob(
          user.email,
          {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            appName: appConfig.name,
          },
          new Date().toISOString(),
          request.ip,
          request.headers['user-agent']
        );
        fastify.log.info('Password changed notification job queued', { userId: user.id });
      } catch (error) {
        fastify.log.error('Failed to queue password changed notification', { userId: user.id, error });
      }

      const response: IAPIResponse = {
        success: true,
        message: 'Password changed successfully',
        statusCode: 200,
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Change password error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Password change failed',
        error: 'An error occurred while changing your password',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * Email Verification Endpoint
   * POST /api/auth/verify-email
   * 
   * Verifies user email address using token
   */
  fastify.post<{ Body: IEmailVerificationRequest }>('/verify-email', {
    schema: {
      body: emailVerificationSchema,
    },
  }, async (request: FastifyRequest<{ Body: IEmailVerificationRequest }>, reply: FastifyReply) => {
    try {
      // Validate input data
      const validationErrors = validateWithSchema(request.body, emailVerificationSchema);
      if (validationErrors.length > 0) {
        const response: IAPIResponse = {
          success: false,
          message: 'Validation failed',
          error: 'Invalid input data',
          statusCode: 400,
          data: { validationErrors },
        };
        return reply.status(400).send(response);
      }

      const { token, userId } = request.body;

      // Find user by ID
      const user = await User.findByPk(userId);
      if (!user) {
        const response: IAPIResponse = {
          success: false,
          message: 'Email verification failed',
          error: 'Invalid verification token',
          statusCode: 400,
        };
        return reply.status(400).send(response);
      }

      // Check if email is already verified
      if (user.isEmailVerified) {
        const response: IAPIResponse = {
          success: true,
          message: 'Email is already verified',
          statusCode: 200,
        };
        return reply.status(200).send(response);
      }

      // Validate verification token
      if (!user.isEmailVerificationTokenValid(token)) {
        const response: IAPIResponse = {
          success: false,
          message: 'Email verification failed',
          error: 'Invalid or expired verification token',
          statusCode: 400,
        };
        return reply.status(400).send(response);
      }

      // Verify email
      await user.verifyEmail();

      const response: IAPIResponse = {
        success: true,
        message: 'Email verified successfully! You now have full access to your account.',
        statusCode: 200,
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Email verification error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Email verification failed',
        error: 'An error occurred while verifying your email',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * Refresh Token Endpoint
   * POST /api/auth/refresh-token
   * 
   * Refreshes JWT tokens using refresh token
   */
  fastify.post<{ Body: IRefreshTokenRequest }>('/refresh-token', {
    schema: {
      body: refreshTokenSchema,
    },
  }, async (request: FastifyRequest<{ Body: IRefreshTokenRequest }>, reply: FastifyReply) => {
    try {
      // Validate input data
      const validationErrors = validateWithSchema(request.body, refreshTokenSchema);
      if (validationErrors.length > 0) {
        const response: IAPIResponse = {
          success: false,
          message: 'Validation failed',
          error: 'Invalid input data',
          statusCode: 400,
          data: { validationErrors },
        };
        return reply.status(400).send(response);
      }

      const { refreshToken } = request.body;

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        const response: IAPIResponse = {
          success: false,
          message: 'Token refresh failed',
          error: 'User not found or inactive',
          statusCode: 401,
        };
        return reply.status(401).send(response);
      }

      // Generate new tokens
      const tokens = generateTokens(user.toPublicJSON());

      const response: IAPIResponse = {
        success: true,
        message: 'Tokens refreshed successfully',
        data: tokens,
        statusCode: 200,
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Token refresh error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Token refresh failed',
        error: error instanceof Error ? error.message : 'Invalid refresh token',
        statusCode: 401,
      };
      return reply.status(401).send(response);
    }
  });

  /**
   * Get Current User Profile Endpoint
   * GET /api/auth/me
   * 
   * Returns current authenticated user's profile
   */
  fastify.get('/me', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedFastifyRequest;
      const userId = authenticatedRequest.userId;

      // Find user with fresh data
      const user = await User.findByPk(userId);
      if (!user) {
        const response: IAPIResponse = {
          success: false,
          message: 'User not found',
          error: 'User profile not found',
          statusCode: 404,
        };
        return reply.status(404).send(response);
      }

      // Attach subscription (premium) summary
      const activeSub = await SubscriptionService.getActivePremiumForUser(user.id);
      const response: IAPIResponse = {
        success: true,
        message: 'User profile retrieved successfully',
        data: { 
          user: user.toPublicJSON(),
          subscription: activeSub ? {
            active: true,
            productId: activeSub.productId,
            platform: activeSub.platform,
            expirationDate: activeSub.expirationDate,
            willRenew: activeSub.willRenew,
            periodType: activeSub.periodType,
          } : { active: false }
        },
        statusCode: 200,
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Get user profile error:', error);
      
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to retrieve user profile',
        error: 'An error occurred while retrieving your profile',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * Get User Details (including onboarding data)
   * GET /api/auth/user-details
   *
   * Returns the authenticated user's id, name (full name), email,
   * and all fields from the onboarding data table for that user.
   */
  fastify.get('/user-details', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedFastifyRequest;
      const userId = authenticatedRequest.userId;

      // Fetch minimal user fields with associated onboarding data via defined association
      const user = await User.findByPk(userId, {
        attributes: ['id', 'email', 'firstName', 'lastName'],
        include: [
          {
            model: OnboardingData,
            as: 'onboardingData',
          },
        ],
      });

      if (!user) {
        const response: IAPIResponse = {
          success: false,
          message: 'User not found',
          error: 'User profile not found',
          statusCode: 404,
        };
        return reply.status(404).send(response);
      }

      // Extract onboarding data from association
      const userJson = user.toJSON() as any;
      const onboarding = userJson.onboardingData ?? null;

      const response: IAPIResponse = {
        success: true,
        message: 'User details retrieved successfully',
        data: {
          id: user.id,
          name: user.getFullName(),
          email: user.email,
          onboarding,
        },
        statusCode: 200,
      };

      return reply.status(200).send(response);

    } catch (error) {
      request.log.error('Get user details error:', error);
      const response: IAPIResponse = {
        success: false,
        message: 'Failed to retrieve user details',
        error: 'An error occurred while retrieving user details',
        statusCode: 500,
      };
      return reply.status(500).send(response);
    }
  });

  /**
   * Update User Profile Endpoint
   * PATCH /api/auth/user-profile
   *
   * Updates the authenticated user's first and last name.
   */
  fastify.patch<{ Body: { firstName?: string; lastName?: string; username?: string } }>('/user-profile', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authenticatedRequest = request as AuthenticatedFastifyRequest;
      const userId = authenticatedRequest.userId;
      const { firstName, lastName, username } = request.body as { firstName?: string; lastName?: string; username?: string };

      if (!firstName && !lastName && !username) {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          error: 'At least one field (firstName, lastName, or username) must be provided',
          statusCode: 400,
        });
      }

      const user = await User.findByPk(userId);

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
          statusCode: 404,
        });
      }

      if (firstName) {
        user.firstName = firstName;
      }
      if (lastName) {
        user.lastName = lastName;
      }
      if (username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return reply.status(409).send({
            success: false,
            message: 'Username is already taken',
            statusCode: 409,
          });
        }
        user.username = username;
      }

      await user.save();

      return reply.status(200).send({
        success: true,
        message: 'User profile updated successfully',
        data: { user: user.toPublicJSON() },
        statusCode: 200,
      });

    } catch (error) {
      request.log.error('Update user profile error:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to update user profile',
        error: 'An error occurred while updating your profile',
        statusCode: 500,
      });
    }
  });
}