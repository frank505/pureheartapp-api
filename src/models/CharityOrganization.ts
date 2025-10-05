import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum CharityCategory {
  ADDICTION_RECOVERY = 'addiction_recovery',
  FAITH_BASED = 'faith_based',
  MENTAL_HEALTH = 'mental_health',
  EDUCATION = 'education',
  RESCUE_OPERATIONS = 'rescue_operations'
}

export interface ICharityOrganization {
  id: number;
  name: string;
  description?: string;
  mission?: string;
  category: CharityCategory;
  website?: string;
  email?: string;
  phone?: string;
  stripeAccountId?: string;
  bankAccountLast4?: string;
  country: string;
  currency: string;
  taxId?: string;
  isActive: boolean;
  isVerified: boolean;
  verificationDate?: Date;
  totalDonationsReceived: number;
  totalCommitmentsCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface CharityOrganizationCreationAttributes extends Optional<ICharityOrganization, 'id' | 'createdAt' | 'updatedAt'> {}

class CharityOrganization extends Model<ICharityOrganization, CharityOrganizationCreationAttributes> implements ICharityOrganization {
  public id!: number;
  public name!: string;
  public description?: string;
  public mission?: string;
  public category!: CharityCategory;
  public website?: string;
  public email?: string;
  public phone?: string;
  public stripeAccountId?: string;
  public bankAccountLast4?: string;
  public country!: string;
  public currency!: string;
  public taxId?: string;
  public isActive!: boolean;
  public isVerified!: boolean;
  public verificationDate?: Date;
  public totalDonationsReceived!: number;
  public totalCommitmentsCount!: number;
  public metadata?: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

CharityOrganization.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mission: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        'addiction_recovery',
        'faith_based',
        'mental_health',
        'education',
        'rescue_operations'
      ),
      allowNull: false,
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    stripeAccountId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'stripe_account_id',
    },
    bankAccountLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      field: 'bank_account_last4',
    },
    country: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'US',
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    taxId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'tax_id',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified',
    },
    verificationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verification_date',
    },
    totalDonationsReceived: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'total_donations_received',
    },
    totalCommitmentsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_commitments_count',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'charity_organizations',
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);

export default CharityOrganization;
