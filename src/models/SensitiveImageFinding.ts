import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ISensitiveImageFinding {
  id: number;
  imageId: number;
  label: string;
  category?: string | null;
  score?: number | null;
  raw?: any | null;
  createdAt: Date;
  updatedAt: Date;
}

type CreateAttrs = Optional<ISensitiveImageFinding, 'id' | 'category' | 'score' | 'raw' | 'createdAt' | 'updatedAt'>;

class SensitiveImageFinding extends Model<ISensitiveImageFinding, CreateAttrs> implements ISensitiveImageFinding {
  public id!: number;
  public imageId!: number;
  public label!: string;
  public category!: string | null;
  public score!: number | null;
  public raw!: any | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SensitiveImageFinding.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  // Match sensitive_images.id type (UNSIGNED)
  imageId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'image_id' },
  label: { type: DataTypes.STRING(255), allowNull: false },
  category: { type: DataTypes.STRING(100), allowNull: true },
  score: { type: DataTypes.FLOAT, allowNull: true },
  raw: { type: DataTypes.JSON, allowNull: true },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'SensitiveImageFinding',
  tableName: 'sensitive_image_findings',
  timestamps: true,
  underscored: true,
  indexes: [ { fields: ['image_id'] } ],
});

export default SensitiveImageFinding;
