/**
 * Input validation utilities and schemas
 * This module provides comprehensive validation for all API inputs
 * Using JSON Schema validation for type safety and security
 */

import { IValidationError, IPasswordValidation } from '../types/auth';

/**
 * JSON Schema definitions for request validation
 */

// User registration schema
export const registerSchema = {
  type: 'object',
  required: ['email', 'firstName', 'lastName'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      minLength: 5,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    },
    password: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128
    },
    firstName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z\\s\\-\']+$'
    },
    lastName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z\\s\\-\']+$'
    }
  },
  additionalProperties: false
};

// User login schema
export const loginSchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      minLength: 5,
      maxLength: 255
    },
    password: {
      type: 'string',
      minLength: 1,
      maxLength: 128
    }
  },
  additionalProperties: false
};

// Forgot password schema
export const forgotPasswordSchema = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      minLength: 5,
      maxLength: 255
    }
  },
  additionalProperties: false
};

// Reset password schema
export const resetPasswordSchema = {
  type: 'object',
  required: ['token', 'userId', 'newPassword', 'confirmPassword'],
  properties: {
    token: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    userId: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128
    }
  },
  additionalProperties: false
};

// Change password schema
export const changePasswordSchema = {
  type: 'object',
  required: ['currentPassword', 'newPassword', 'confirmPassword'],
  properties: {
    currentPassword: {
      type: 'string',
      minLength: 1,
      maxLength: 128
    },
    newPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
    },
    confirmPassword: {
      type: 'string',
      minLength: 8,
      maxLength: 128
    }
  },
  additionalProperties: false
};

// Email verification schema
export const emailVerificationSchema = {
  type: 'object',
  required: ['token', 'userId'],
  properties: {
    token: {
      type: 'string',
      minLength: 1,
      maxLength: 500
    },
    userId: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    }
  },
  additionalProperties: false
};

// Refresh token schema
export const refreshTokenSchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: {
      type: 'string',
      minLength: 1,
      maxLength: 1000
    }
  },
  additionalProperties: false
};

/**
 * Basic email validation function
 * @param email - Email address to validate
 * @returns boolean - True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length >= 5 && email.length <= 255;
};

/**
 * Password strength validation
 * @param password - Password to validate
 * @returns IPasswordValidation - Validation result with strength and errors
 */
export const validatePassword = (password: string): IPasswordValidation => {
  const errors: string[] = [];
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check maximum length
  if (password.length > 128) {
    errors.push('Password must be no more than 128 characters long');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for digit
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  // Check for common patterns to avoid
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /123|abc|qwe|password|admin|user/i, // Common sequences
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns that make it weak');
      break;
    }
  }

  // Determine password strength
  const criteria = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[@$!%*?&]/.test(password),
    password.length >= 12,
    /[^a-zA-Z0-9@$!%*?&]/.test(password), // Additional special characters
  ];

  const score = criteria.filter(Boolean).length;

  if (score <= 3) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'fair';
  } else if (score <= 5) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

/**
 * Validate if passwords match
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns boolean - True if passwords match
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword;
};

/**
 * Validate name fields (firstName, lastName)
 * @param name - Name to validate
 * @param fieldName - Field name for error messages
 * @returns IValidationError[] - Array of validation errors
 */
export const validateName = (name: string, fieldName: string): IValidationError[] => {
  const errors: IValidationError[] = [];

  if (!name || name.trim().length === 0) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      value: name,
    });
    return errors;
  }

  if (name.length < 1 || name.length > 100) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be between 1 and 100 characters`,
      value: name,
    });
  }

  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
      value: name,
    });
  }

  return errors;
};

/**
 * Validate UUID format
 * @param uuid - UUID string to validate
 * @returns boolean - True if valid UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uuid);
};

/**
 * Sanitize input string to prevent XSS
 * @param input - Input string to sanitize
 * @returns string - Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>\"'&]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[match] || match;
    });
};

/**
 * Generic validation function using JSON schema
 * @param data - Data to validate
 * @param schema - JSON schema to validate against
 * @returns IValidationError[] - Array of validation errors
 */
export const validateWithSchema = (data: any, schema: any): IValidationError[] => {
  const errors: IValidationError[] = [];

  // Basic type checking
  if (schema.type === 'object' && typeof data !== 'object') {
    errors.push({
      field: 'root',
      message: 'Data must be an object',
      value: data,
    });
    return errors;
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!data.hasOwnProperty(field) || data[field] === undefined || data[field] === null) {
        errors.push({
          field,
          message: `${field} is required`,
          value: data[field],
        });
      }
    }
  }

  // Validate each property
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties as any)) {
      const value = data[field];

      if (value !== undefined) {
        const fieldErrors = validateField(field, value, fieldSchema);
        errors.push(...fieldErrors);
      }
    }
  }

  // Check for additional properties
  if (schema.additionalProperties === false) {
    const allowedProperties = Object.keys(schema.properties || {});
    for (const field of Object.keys(data)) {
      if (!allowedProperties.includes(field)) {
        errors.push({
          field,
          message: `${field} is not allowed`,
          value: data[field],
        });
      }
    }
  }

  return errors;
};

/**
 * Validate individual field against schema
 * @param fieldName - Name of the field
 * @param value - Value to validate
 * @param schema - Field schema
 * @returns IValidationError[] - Array of validation errors
 */
const validateField = (fieldName: string, value: any, schema: any): IValidationError[] => {
  const errors: IValidationError[] = [];

  // Type validation
  if (schema.type && typeof value !== schema.type) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be of type ${schema.type}`,
      value,
    });
    return errors; // Return early if type is wrong
  }

  // String validations
  if (schema.type === 'string') {
    if (schema.minLength && value.length < schema.minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${schema.minLength} characters long`,
        value,
      });
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be no more than ${schema.maxLength} characters long`,
        value,
      });
    }

    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} format is invalid`,
        value,
      });
    }

    if (schema.format === 'email' && !isValidEmail(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid email address`,
        value,
      });
    }
  }

  return errors;
};

/**
 * Comprehensive registration validation
 * @param data - Registration data
 * @returns IValidationError[] - Array of validation errors
 */
export const validateRegistration = (data: any): IValidationError[] => {
  const errors = validateWithSchema(data, registerSchema);

  // Additional custom validations
  if (data.password) {
    if (!data.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'Password confirmation is required',
      });
    } else if (!validatePasswordMatch(data.password, data.confirmPassword)) {
      errors.push({
        field: 'confirmPassword',
        message: 'Passwords do not match',
        value: data.confirmPassword,
      });
    }

    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      for (const error of passwordValidation.errors) {
        errors.push({
          field: 'password',
          message: error,
          value: data.password,
        });
      }
    }
  }

  return errors;
};

/**
 * Comprehensive reset password validation
 * @param data - Reset password data
 * @returns IValidationError[] - Array of validation errors
 */
export const validateResetPassword = (data: any): IValidationError[] => {
  const errors = validateWithSchema(data, resetPasswordSchema);

  // Additional custom validations
  if (data.newPassword && data.confirmPassword) {
    if (!validatePasswordMatch(data.newPassword, data.confirmPassword)) {
      errors.push({
        field: 'confirmPassword',
        message: 'Passwords do not match',
        value: data.confirmPassword,
      });
    }

    const passwordValidation = validatePassword(data.newPassword);
    if (!passwordValidation.isValid) {
      for (const error of passwordValidation.errors) {
        errors.push({
          field: 'newPassword',
          message: error,
          value: data.newPassword,
        });
      }
    }
  }

  return errors;
};