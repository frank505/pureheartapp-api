import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type SensitiveStatus = 'clean' | 'suspicious' | 'explicit';

export interface ISensitiveImage {
  id: number;
  userId: number;
  imageUrl?: string | null;
  imageHash?: string | null;
  summary?: string | null;
  status: SensitiveStatus;
  rawMeta?: any | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type CreateAttrs = Optional<ISensitiveImage, 'id' | 'imageUrl' | 'imageHash' | 'summary' | 'rawMeta' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

class SensitiveImage extends Model<ISensitiveImage, CreateAttrs> implements ISensitiveImage {
  public id!: number;
  public userId!: number;
  public imageUrl!: string | null;
  public imageHash!: string | null;
  public summary!: string | null;
  public status!: SensitiveStatus;
  public rawMeta!: any | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

SensitiveImage.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  // Use signed INTEGER for userId to match existing users.id type in production DB
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  imageUrl: { type: DataTypes.STRING(1024), allowNull: true, field: 'image_url' },
  imageHash: { type: DataTypes.STRING(255), allowNull: true, field: 'image_hash' },
  summary: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('clean', 'suspicious', 'explicit'), allowNull: false, defaultValue: 'clean' },
  rawMeta: { type: DataTypes.JSON, allowNull: true, field: 'raw_meta' },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'SensitiveImage',
  tableName: 'sensitive_images',
  timestamps: true,
  paranoid: true,
  underscored: true,
  indexes: [ { fields: ['user_id'] }, { fields: ['status'] }, { fields: ['image_hash'] } ],
});

export default SensitiveImage;
