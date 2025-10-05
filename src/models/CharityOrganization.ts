import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import CharityDonation from './CharityDonation';
import Commitment from './Commitment';

export enum CharityCategory {
  ANTI_PORNOGRAPHY = 'anti_pornography',
  HUMAN_TRAFFICKING = 'human_trafficking',
  CHILD_PROTECTION = 'child_protection',
  SEXUAL_EXPLOITATION = 'sexual_exploitation',
  ADDICTION_RECOVERY = 'addiction_recovery',
  FAITH_BASED = 'faith_based',
  MENTAL_HEALTH = 'mental_health',
  EDUCATION = 'education',
  RESCUE_OPERATIONS = 'rescue_operations',
  LEGAL_ADVOCACY = 'legal_advocacy'
}

export enum GeographicScope {
  LOCAL = 'local',
  REGIONAL = 'regional',
  NATIONAL = 'national',
  INTERNATIONAL = 'international'
}

export interface CharityOrganizationAttributes {
  id: number;
  name: string;
  legal_name?: string;
  description?: string;
  mission?: string;
  category: CharityCategory;
  
  // Contact Information
  website: string;
  email: string;
  phone?: string;
  address?: string;
  mailing_address?: string;
  
  // Financial & Legal Information
  stripe_account_id?: string;
  bank_account_last4?: string;
  routing_number_last4?: string;
  bank_name?: string;
  country: string;
  currency: string;
  tax_id: string;
  tax_exempt_status: string;
  
  // Verification & Credibility
  is_active: boolean;
  is_verified: boolean;
  verification_date?: Date;
  verification_notes?: string;
  charity_navigator_rating?: number;
  charity_navigator_url?: string;
  guidestar_url?: string;
  founded_year?: number;
  
  // Third Party Verification
  ecfa_member: boolean;
  ecfa_url?: string;
  bbb_accredited: boolean;
  bbb_rating?: string;
  bbb_url?: string;
  
  // Impact & Statistics
  total_donations_received: number;
  total_commitments_count: number;
  annual_budget?: number;
  program_expense_ratio?: number;
  people_served_annually?: number;
  
  // Additional Information
  focus_areas?: string[];
  geographic_scope: GeographicScope;
  primary_services?: string[];
  leadership_info?: any;
  awards_recognition?: any;
  social_media_links?: any;
  metadata?: any;
  
  // System Fields
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export type CharityOrganizationCreationAttributes = Optional<CharityOrganizationAttributes, 
  'id' | 'country' | 'currency' | 'tax_exempt_status' | 'is_active' | 'is_verified' | 
  'ecfa_member' | 'bbb_accredited' | 'total_donations_received' | 'total_commitments_count' | 
  'geographic_scope' | 'created_at' | 'updated_at'>;

export class CharityOrganization extends Model<CharityOrganizationAttributes, CharityOrganizationCreationAttributes> implements CharityOrganizationAttributes {
  public id!: number;
  public name!: string;
  public legal_name?: string;
  public description?: string;
  public mission?: string;
  public category!: CharityCategory;
  
  // Contact Information
  public website!: string;
  public email!: string;
  public phone?: string;
  public address?: string;
  public mailing_address?: string;
  
  // Financial & Legal Information
  public stripe_account_id?: string;
  public bank_account_last4?: string;
  public routing_number_last4?: string;
  public bank_name?: string;
  public country!: string;
  public currency!: string;
  public tax_id!: string;
  public tax_exempt_status!: string;
  
  // Verification & Credibility
  public is_active!: boolean;
  public is_verified!: boolean;
  public verification_date?: Date;
  public verification_notes?: string;
  public charity_navigator_rating?: number;
  public charity_navigator_url?: string;
  public guidestar_url?: string;
  public founded_year?: number;
  
  // Third Party Verification
  public ecfa_member!: boolean;
  public ecfa_url?: string;
  public bbb_accredited!: boolean;
  public bbb_rating?: string;
  public bbb_url?: string;
  
  // Impact & Statistics
  public total_donations_received!: number;
  public total_commitments_count!: number;
  public annual_budget?: number;
  public program_expense_ratio?: number;
  public people_served_annually?: number;
  
  // Additional Information
  public focus_areas?: string[];
  public geographic_scope!: GeographicScope;
  public primary_services?: string[];
  public leadership_info?: any;
  public awards_recognition?: any;
  public social_media_links?: any;
  public metadata?: any;
  
  // System Fields
  public created_at!: Date;
  public updated_at!: Date;
  public deleted_at?: Date;

  // Associations
  public donations?: CharityDonation[];
  public commitments?: Commitment[];
}

CharityOrganization.init({
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  legal_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mission: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM(...Object.values(CharityCategory)),
    allowNull: false
  },
  
  // Contact Information
  website: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mailing_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Financial & Legal Information
  stripe_account_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  bank_account_last4: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  routing_number_last4: {
    type: DataTypes.STRING(4),
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: false,
    defaultValue: 'US'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  tax_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  tax_exempt_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '501c3'
  },
  
  // Verification & Credibility
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  verification_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verification_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  charity_navigator_rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: true
  },
  charity_navigator_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  guidestar_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  founded_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Third Party Verification
  ecfa_member: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  ecfa_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  bbb_accredited: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  bbb_rating: {
    type: DataTypes.STRING(2),
    allowNull: true
  },
  bbb_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  // Impact & Statistics
  total_donations_received: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  total_commitments_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  annual_budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  program_expense_ratio: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  people_served_annually: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Additional Information
  focus_areas: {
    type: DataTypes.JSON,
    allowNull: true
  },
  geographic_scope: {
    type: DataTypes.ENUM(...Object.values(GeographicScope)),
    allowNull: false,
    defaultValue: GeographicScope.NATIONAL
  },
  primary_services: {
    type: DataTypes.JSON,
    allowNull: true
  },
  leadership_info: {
    type: DataTypes.JSON,
    allowNull: true
  },
  awards_recognition: {
    type: DataTypes.JSON,
    allowNull: true
  },
  social_media_links: {
    type: DataTypes.JSON,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // System Fields
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  tableName: 'charity_organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true
});

// Define associations
CharityOrganization.hasMany(CharityDonation, {
  foreignKey: 'charity_id',
  as: 'donations'
});

CharityOrganization.hasMany(Commitment, {
  foreignKey: 'charity_id',
  as: 'commitments'
});

export default CharityOrganization;
