import { DataTypes, Model, Optional, Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database';
import { IUser, IUserCreate, IUserPublic } from '../types/auth';
import { UserType } from '../types/user';
import { securityConfig } from '../config/environment';
import { generateSecureToken } from '../utils/jwt';

/**
 * User model attributes for Sequelize
 * These define what fields are required when creating a User instance
 */
interface UserCreationAttributes extends Optional<IUser, 'id' | 'userType' | 'isEmailVerified' | 'isActive' | 'lastLoginAt' | 'passwordResetToken' | 'passwordResetExpires' | 'emailVerificationToken' | 'emailVerificationExpires' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

/**
 * User Model Class
 * This class extends Sequelize Model and defines the User entity with all its methods
 */
class User extends Model<IUser, UserCreationAttributes> implements IUser {
  // Define all the properties that exist on a User instance
  public id!: number;
  public email!: string;
  public password?: string;
  public firstName!: string;
  public lastName!: string;
  public username!: string;
  public userType!: UserType;
  public avatar?: string | null;
  public isEmailVerified!: boolean;
  public isActive!: boolean;
  public lastLoginAt?: Date;
  public passwordResetToken?: string | null;
  public passwordResetExpires?: Date | null;
  public emailVerificationToken?: string | null;
  public emailVerificationExpires?: Date | null;
  public timezone?: string | null;
  public uninstallSuspectedAt?: Date | null;
  public lastReinstallAt?: Date | null;
  public lastReinstallDeviceId?: string | null;
  public lastReinstallPlatform?: string | null;

  // Timestamps (automatically managed by Sequelize)
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  /**
   * Instance method to check if the provided password matches the user's password
   * @param candidatePassword - The password to check against the stored hash
   * @returns Promise<boolean> - True if password matches, false otherwise
   */
  public async validatePassword(candidatePassword: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }
    return bcrypt.compare(candidatePassword, this.password);
  }

  /**
   * Instance method to hash a new password
   * @param newPassword - The plain text password to hash
   * @returns Promise<string> - The hashed password
   */
  public async hashPassword(newPassword: string): Promise<string> {
    const saltRounds = securityConfig.bcryptRounds;
    return bcrypt.hash(newPassword, saltRounds);
  }

  /**
   * Instance method to update the user's password
   * @param newPassword - The new plain text password
   * @returns Promise<void>
   */
  public async updatePassword(newPassword: string): Promise<void> {
    this.password = await this.hashPassword(newPassword);
    await this.save();
  }

  /**
   * Instance method to generate a password reset token
   * @returns string - A UUID token for password reset
   */
  public generatePasswordResetToken(): string {
    const token = generateSecureToken();
    this.passwordResetToken = token;
    this.passwordResetExpires = new Date(Date.now() + securityConfig.passwordResetExpires);
    return token;
  }

  /**
   * Instance method to generate an email verification token
   * @returns string - A UUID token for email verification
   */
  public generateEmailVerificationToken(): string {
    const token = generateSecureToken();
    this.emailVerificationToken = token;
    this.emailVerificationExpires = new Date(Date.now() + securityConfig.emailVerificationExpires);
    return token;
  }

  /**
   * Instance method to verify email
   * @returns Promise<void>
   */
  public async verifyEmail(): Promise<void> {
    this.isEmailVerified = true;
    this.emailVerificationToken = null;
    this.emailVerificationExpires = null;
    await this.save();
  }

  /**
   * Instance method to update last login time
   * @returns Promise<void>
   */
  public async updateLastLogin(): Promise<void> {
    this.lastLoginAt = new Date();
    await this.save();
  }

  /**
   * Instance method to get public user data (without sensitive information)
   * @returns IUserPublic - User data safe for public consumption
   */
  public toPublicJSON(): IUserPublic {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      userType: this.userType,
      avatar: this.avatar ?? null,
      isEmailVerified: this.isEmailVerified,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt || undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Instance method to get the user's full name
   * @returns string - The user's full name
   */
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Instance method to check if password reset token is valid
   * @param token - The token to validate
   * @returns boolean - True if token is valid and not expired
   */
  public isPasswordResetTokenValid(token: string): boolean {
    if (!this.passwordResetToken || !this.passwordResetExpires) {
      return false;
    }
    
    return this.passwordResetToken === token && this.passwordResetExpires > new Date();
  }

  /**
   * Instance method to check if email verification token is valid
   * @param token - The token to validate
   * @returns boolean - True if token is valid and not expired
   */
  public isEmailVerificationTokenValid(token: string): boolean {
    if (!this.emailVerificationToken || !this.emailVerificationExpires) {
      return false;
    }
    
    return this.emailVerificationToken === token && this.emailVerificationExpires > new Date();
  }

  /**
   * Static method to find a user by email
   * @param email - The email address to search for
   * @returns Promise<User | null> - The user if found, null otherwise
   */
  public static async findByEmail(email: string): Promise<User | null> {
    return User.findOne({
      where: { email: email.toLowerCase() }
    });
  }

  /**
   * Static method to find a user by username
   * @param username - The username to search for
   * @returns Promise<User | null> - The user if found, null otherwise
   */
  public static async findByUsername(username: string): Promise<User | null> {
    return User.findOne({
      where: { username: username }
    });
  }

  /**
   * Static method to find a user by password reset token
   * @param token - The reset token to search for
   * @returns Promise<User | null> - The user if found, null otherwise
   */
  public static async findByPasswordResetToken(token: string): Promise<User | null> {
    return User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [Op.gt]: new Date()
        }
      }
    });
  }

  /**
   * Static method to find a user by email verification token
   * @param token - The verification token to search for
   * @returns Promise<User | null> - The user if found, null otherwise
   */
  public static async findByEmailVerificationToken(token: string): Promise<User | null> {
    return User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          [Op.gt]: new Date()
        }
      }
    });
  }

  /**
   * Static method to create a new user with hashed password
   * @param userData - The user data for creation
   * @returns Promise<User> - The created user instance
   */
  public static async createUser(userData: IUserCreate): Promise<User> {
    const { password, ...restData } = userData;

    const creationData: any = {
      ...restData,
      email: userData.email.toLowerCase(),
      isEmailVerified: false,
      isActive: true,
    };

    if (password) {
      const saltRounds = securityConfig.bcryptRounds;
      creationData.password = await bcrypt.hash(password, saltRounds);
    }
    
    return User.create(creationData);
  }

  /**
   * Static method to generate a unique username
   * @param firstName - The user's first name
   * @param lastName - The user's last name
   * @returns Promise<string> - A unique username
   */
  public static async generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
    const baseUsername = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`.slice(0, 20);
    let username = baseUsername;
    let counter = 1;
    while (await this.findByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }
    return username;
  }
}

// Initialize the User model with Sequelize
User.init(
  {
    // Primary key
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    // Email field - unique and required
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        name: 'unique_email',
        msg: 'Email address is already registered'
      },
      validate: {
        isEmail: {
          msg: 'Please provide a valid email address'
        },
        notEmpty: {
          msg: 'Email is required'
        },
        len: {
          args: [5, 255],
          msg: 'Email must be between 5 and 255 characters'
        }
      },
      set(value: string) {
        // Always store email in lowercase
        this.setDataValue('email', value.toLowerCase());
      }
    },

    // Password field - will be hashed before storage
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [8, 255],
          msg: 'Password must be at least 8 characters long'
        }
      }
    },

    // Username field - unique and required
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: {
        name: 'unique_username',
        msg: 'Username is already taken'
      },
      validate: {
        notEmpty: {
          msg: 'Username is required'
        },
        len: {
          args: [3, 100],
          msg: 'Username must be between 3 and 100 characters'
        },
        is: {
          args: /^[a-zA-Z0-9_]+$/,
          msg: 'Username can only contain letters, numbers, and underscores'
        }
      }
    },

    // User type - 'user' or 'partner'
    userType: {
      type: DataTypes.ENUM('user', 'partner'),
      allowNull: false,
      defaultValue: 'user',
      validate: {
        isIn: {
          args: [['user', 'partner']],
          msg: 'User type must be either "user" or "partner"'
        }
      }
    },

    // First name
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'First name is required'
        },
        len: {
          args: [1, 100],
          msg: 'First name must be between 1 and 100 characters'
        }
      }
    },

    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Last name
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Last name is required'
        },
        len: {
          args: [1, 100],
          msg: 'Last name must be between 1 and 100 characters'
        }
      }
    },

    // Email verification status
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },

    // Account active status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },

    // Last login timestamp
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Password reset token
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Password reset token expiration
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Email verification token
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Email verification token expiration
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    timezone: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    uninstallSuspectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'uninstall_suspected_at'
    },
    lastReinstallAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_reinstall_at'
    },
    lastReinstallDeviceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'last_reinstall_device_id'
    },
    lastReinstallPlatform: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'last_reinstall_platform'
    },

    // Timestamps
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    underscored: true, // Use snake_case for column names
    
    // Define indexes for better query performance
    indexes: [
      {
        fields: ['password_reset_token']
      },
      {
        fields: ['email_verification_token']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['is_email_verified']
      }
    ],

    // Model-level validations
    validate: {
      // Custom validation to ensure password reset token and expiry are both present or both null
      passwordResetConsistency() {
        if ((this.passwordResetToken && !this.passwordResetExpires) || 
            (!this.passwordResetToken && this.passwordResetExpires)) {
          throw new Error('Password reset token and expiry must both be present or both be null');
        }
      },
      
      // Custom validation for email verification token consistency
      emailVerificationConsistency() {
        if ((this.emailVerificationToken && !this.emailVerificationExpires) || 
            (!this.emailVerificationToken && this.emailVerificationExpires)) {
          throw new Error('Email verification token and expiry must both be present or both be null');
        }
      }
    }
  }
);

export default User;