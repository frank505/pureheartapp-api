import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ISubscriptionAttributes {
  id: number;
  userId: number; // FK to users.id
  appUserId: string; // RevenueCat app_user_id (should mirror user UUID/ID used on client)
  platform: 'apple' | 'google' | 'stripe' | 'amazon' | 'promotional' | 'unknown';
  productId: string | null;
  entitlementId: string | null;
  storeTransactionId: string | null;
  originalPurchaseDate: Date | null;
  expirationDate: Date | null;
  willRenew: boolean;
  isActive: boolean;
  periodType: 'trial' | 'intro' | 'normal' | null;
  environment: string | null; // sandbox / production
  lastEventAt: Date | null;
  lastEventType: string | null;
  latestPayload: object | null; // Raw webhook payload slice (sanitized)
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type CreationAttrs = Optional<
  ISubscriptionAttributes,
  'id' | 'productId' | 'entitlementId' | 'storeTransactionId' | 'originalPurchaseDate' | 'expirationDate' | 'periodType' | 'environment' | 'lastEventAt' | 'lastEventType' | 'latestPayload'
>;

class Subscription extends Model<ISubscriptionAttributes, CreationAttrs> implements ISubscriptionAttributes {
  public id!: number;
  public userId!: number;
  public appUserId!: string;
  public platform!: 'apple' | 'google' | 'stripe' | 'amazon' | 'promotional' | 'unknown';
  public productId!: string | null;
  public entitlementId!: string | null;
  public storeTransactionId!: string | null;
  public originalPurchaseDate!: Date | null;
  public expirationDate!: Date | null;
  public willRenew!: boolean;
  public isActive!: boolean;
  public periodType!: 'trial' | 'intro' | 'normal' | null;
  public environment!: string | null;
  public lastEventAt!: Date | null;
  public lastEventType!: string | null;
  public latestPayload!: object | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Subscription.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    appUserId: { type: DataTypes.STRING(191), allowNull: false },
    platform: { type: DataTypes.ENUM('apple','google','stripe','amazon','promotional','unknown'), allowNull: false, defaultValue: 'unknown' },
    productId: { type: DataTypes.STRING(191), allowNull: true },
    entitlementId: { type: DataTypes.STRING(191), allowNull: true },
    storeTransactionId: { type: DataTypes.STRING(191), allowNull: true },
    originalPurchaseDate: { type: DataTypes.DATE, allowNull: true },
    expirationDate: { type: DataTypes.DATE, allowNull: true },
    willRenew: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    periodType: { type: DataTypes.ENUM('trial','intro','normal'), allowNull: true },
    environment: { type: DataTypes.STRING(50), allowNull: true },
    lastEventAt: { type: DataTypes.DATE, allowNull: true },
    lastEventType: { type: DataTypes.STRING(100), allowNull: true },
    latestPayload: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['app_user_id'] },
      { fields: ['entitlement_id'] },
      { fields: ['is_active'] },
      { fields: ['expiration_date'] },
    ],
  }
);

export default Subscription;