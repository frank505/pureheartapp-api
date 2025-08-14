import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IUserAchievement {
  id: number;
  userId: number;
  achievementId: number;
  unlockedAt: Date;
  progressSnapshot?: Record<string, any> | null; // optional data used at unlock time
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type UserAchievementCreation = Optional<IUserAchievement, 'id' | 'unlockedAt' | 'progressSnapshot' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

class UserAchievement extends Model<IUserAchievement, UserAchievementCreation> implements IUserAchievement {
  public id!: number;
  public userId!: number;
  public achievementId!: number;
  public unlockedAt!: Date;
  public progressSnapshot!: Record<string, any> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

UserAchievement.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    achievementId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'achievements', key: 'id' }, field: 'achievement_id' },
    unlockedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'unlocked_at' },
    progressSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'progress_snapshot' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'UserAchievement',
    tableName: 'user_achievements',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id', 'achievement_id'] },
      { fields: ['user_id', 'unlocked_at'] },
    ],
  }
);

export default UserAchievement;


