import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ISensitiveImageComment {
  id: number;
  imageId: number;
  authorUserId: number; // partner id
  targetUserId: number; // the user whose image it is
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

type CreateAttrs = Optional<ISensitiveImageComment, 'id' | 'createdAt' | 'updatedAt'>;

class SensitiveImageComment extends Model<ISensitiveImageComment, CreateAttrs> implements ISensitiveImageComment {
  public id!: number;
  public imageId!: number;
  public authorUserId!: number;
  public targetUserId!: number;
  public comment!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SensitiveImageComment.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  // Match sensitive_images.id type for imageId and users.id type for user references
  imageId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'image_id' },
  authorUserId: { type: DataTypes.INTEGER, allowNull: false, field: 'author_user_id' },
  targetUserId: { type: DataTypes.INTEGER, allowNull: false, field: 'target_user_id' },
  comment: { type: DataTypes.TEXT, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, {
  sequelize,
  modelName: 'SensitiveImageComment',
  tableName: 'sensitive_image_comments',
  timestamps: true,
  underscored: true,
  indexes: [ { fields: ['image_id'] }, { fields: ['author_user_id'] }, { fields: ['target_user_id'] } ],
});

export default SensitiveImageComment;
