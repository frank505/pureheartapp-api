export interface IUser {
  id: number;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar?: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  timezone?: string | null;
  uninstallSuspectedAt?: Date | null;
  lastReinstallAt?: Date | null;
  lastReinstallDeviceId?: string | null;
  lastReinstallPlatform?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
