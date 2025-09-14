import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IUserBadge {
  id: number;
  userId: number;
  badgeId: number;
  unlockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type UserBadgeCreation = Optional<IUserBadge, 'id' | 'unlockedAt' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

class UserBadge extends Model<IUserBadge, UserBadgeCreation> implements IUserBadge {
  public id!: number;
  public userId!: number;
  public badgeId!: number;
  public unlockedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

UserBadge.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
    badgeId: { type: DataTypes.INTEGER, allowNull: false, field: 'badge_id' },
    unlockedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'unlocked_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'UserBadge',
    tableName: 'user_badges',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['badge_id'] },
      { unique: true, fields: ['user_id', 'badge_id'] },
    ],
  }
);

export default UserBadge;
