import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { IUserServiceStats } from '../types/commitment';
import User from './User';

interface UserServiceStatsCreationAttributes extends Optional<IUserServiceStats, 'id' | 'totalServiceHours' | 'totalMoneyDonated' | 'totalActionsCompleted' | 'redemptionStreak' | 'longestRedemptionStreak' | 'lastRedemptionAt' | 'createdAt' | 'updatedAt'> {}

class UserServiceStats extends Model<IUserServiceStats, UserServiceStatsCreationAttributes> implements IUserServiceStats {
  public id!: number;
  public userId!: number;
  public totalServiceHours!: number;
  public totalMoneyDonated!: number;
  public totalActionsCompleted!: number;
  public redemptionStreak!: number;
  public longestRedemptionStreak!: number;
  public lastRedemptionAt?: Date;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserServiceStats.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    totalServiceHours: {
      type: DataTypes.DECIMAL(8, 1),
      allowNull: false,
      defaultValue: 0,
    },
    totalMoneyDonated: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: 'Amount in cents',
    },
    totalActionsCompleted: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    redemptionStreak: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    longestRedemptionStreak: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    lastRedemptionAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'user_service_stats',
    timestamps: true,
    indexes: [
      {
        name: 'idx_user_id',
        fields: ['user_id'],
        unique: true,
      },
      {
        name: 'idx_total_service_hours',
        fields: ['total_service_hours'],
      },
      {
        name: 'idx_total_actions_completed',
        fields: ['total_actions_completed'],
      },
    ],
  }
);

// Associations
UserServiceStats.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default UserServiceStats;
