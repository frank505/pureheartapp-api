import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IUserProgress {
  id: number;
  userId: number;
  // rolling counters and streaks we can use for achievements/analytics
  checkInCount: number;
  prayerCount: number;
  victoryCount: number;
  commentCount: number;
  currentCheckInStreak: number;
  longestCheckInStreak: number;
  lastCheckInDate?: Date | null;
  lastRelapseDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type UserProgressCreation = Optional<
  IUserProgress,
  'id' | 'checkInCount' | 'prayerCount' | 'victoryCount' | 'commentCount' | 'currentCheckInStreak' | 'longestCheckInStreak' | 'lastCheckInDate' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

class UserProgress extends Model<IUserProgress, UserProgressCreation> implements IUserProgress {
  public id!: number;
  public userId!: number;
  public checkInCount!: number;
  public prayerCount!: number;
  public victoryCount!: number;
  public commentCount!: number;
  public currentCheckInStreak!: number;
  public longestCheckInStreak!: number;
  public lastCheckInDate!: Date | null;
  public lastRelapseDate!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

UserProgress.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    checkInCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'checkin_count' },
    prayerCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'prayer_count' },
    victoryCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'victory_count' },
    commentCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'comment_count' },
    currentCheckInStreak: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'current_checkin_streak' },
    longestCheckInStreak: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'longest_checkin_streak' },
    lastCheckInDate: { type: DataTypes.DATE, allowNull: true, field: 'last_checkin_date' },
  lastRelapseDate: { type: DataTypes.DATE, allowNull: true, field: 'last_relapse_date' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'UserProgress',
    tableName: 'user_progress',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['user_id'] },
    ],
  }
);

export default UserProgress;


