import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type DevicePlatform = 'ios' | 'android';

export interface IDeviceToken {
  id: number;
  userId: number;
  platform: DevicePlatform;
  token: string;
  isActive: boolean;
  lastActiveAt?: Date | null;
  deviceId?: string | null;
  lastHealthCheckAt?: Date | null;
  lastErrorCode?: string | null;
  reinstallDetectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type DeviceTokenCreation = Optional<IDeviceToken, 'id' | 'isActive' | 'lastActiveAt' | 'deviceId' | 'lastHealthCheckAt' | 'lastErrorCode' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

class DeviceToken extends Model<IDeviceToken, DeviceTokenCreation> implements IDeviceToken {
  public id!: number;
  public userId!: number;
  public platform!: DevicePlatform;
  public token!: string;
  public isActive!: boolean;
  public lastActiveAt!: Date | null;
  public deviceId!: string | null;
  public lastHealthCheckAt!: Date | null;
  public lastErrorCode!: string | null;
  public reinstallDetectedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

DeviceToken.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
  platform: { type: DataTypes.ENUM('ios', 'android'), allowNull: false },
  token: { type: DataTypes.STRING(255), allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    lastActiveAt: { type: DataTypes.DATE, allowNull: true, field: 'last_active_at' },
  deviceId: { type: DataTypes.STRING(255), allowNull: true, field: 'device_id' },
  lastHealthCheckAt: { type: DataTypes.DATE, allowNull: true, field: 'last_health_check_at' },
  lastErrorCode: { type: DataTypes.STRING(255), allowNull: true, field: 'last_error_code' },
  reinstallDetectedAt: { type: DataTypes.DATE, allowNull: true, field: 'reinstall_detected_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'DeviceToken',
    tableName: 'device_tokens',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
  { fields: ['platform'] },
  { unique: false, fields: ['token'] },
  { fields: ['device_id'] },
    ],
  }
);

export default DeviceToken;
