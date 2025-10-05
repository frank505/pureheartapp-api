import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export enum DonationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  MANUAL = 'manual',
  OTHER = 'other'
}

export interface ICharityDonation {
  id: number;
  commitmentId: number;
  userId: number;
  charityId: number;
  amount: number;
  currency: string;
  status: DonationStatus;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId?: string;
  stripeTransferId?: string;
  stripeChargeId?: string;
  paymentDate?: Date;
  transferDate?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface CharityDonationCreationAttributes extends Optional<ICharityDonation, 'id' | 'createdAt' | 'updatedAt'> {}

class CharityDonation extends Model<ICharityDonation, CharityDonationCreationAttributes> implements ICharityDonation {
  public id!: number;
  public commitmentId!: number;
  public userId!: number;
  public charityId!: number;
  public amount!: number;
  public currency!: string;
  public status!: DonationStatus;
  public paymentMethod!: PaymentMethod;
  public stripePaymentIntentId?: string;
  public stripeTransferId?: string;
  public stripeChargeId?: string;
  public paymentDate?: Date;
  public transferDate?: Date;
  public failureReason?: string;
  public metadata?: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CharityDonation.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    commitmentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'commitment_id',
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    charityId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'charity_id',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    paymentMethod: {
      type: DataTypes.ENUM('stripe', 'manual', 'other'),
      allowNull: false,
      defaultValue: 'stripe',
      field: 'payment_method',
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: 'stripe_payment_intent_id',
    },
    stripeTransferId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_transfer_id',
    },
    stripeChargeId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'stripe_charge_id',
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'payment_date',
    },
    transferDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'transfer_date',
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'failure_reason',
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
  },
  {
    sequelize,
    tableName: 'charity_donations',
    timestamps: true,
    underscored: true,
  }
);

export default CharityDonation;
