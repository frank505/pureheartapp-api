import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export type FastType = 'daily' | 'nightly' | 'weekly' | 'custom' | 'breakthrough';
export type FastStatus = 'upcoming' | 'active' | 'completed' | 'failed';

export interface IFast {
  id: number;
  userId: number;
  type: FastType;
  status: FastStatus;
  goal?: string | null;
  smartGoal?: string | null;
  prayerTimes?: string[] | null; // HH:mm strings in user's local time
  verse?: string | null;
  prayerFocus?: string | null;
  startTime: Date;
  endTime: Date;
  reminderEnabled: boolean;
  widgetEnabled: boolean;
  addAccountabilityPartners: boolean;
  completedAt?: Date | null;
  brokenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type FastCreation = Optional<
  IFast,
  | 'id'
  | 'status'
  | 'goal'
  | 'smartGoal'
  | 'prayerTimes'
  | 'verse'
  | 'prayerFocus'
  | 'reminderEnabled'
  | 'widgetEnabled'
  | 'addAccountabilityPartners'
  | 'completedAt'
  | 'brokenAt'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
>;

class Fast extends Model<IFast, FastCreation> implements IFast {
  public id!: number;
  public userId!: number;
  public type!: FastType;
  public status!: FastStatus;
  public goal!: string | null;
  public smartGoal!: string | null;
  public prayerTimes!: string[] | null;
  public verse!: string | null;
  public prayerFocus!: string | null;
  public startTime!: Date;
  public endTime!: Date;
  public reminderEnabled!: boolean;
  public widgetEnabled!: boolean;
  public addAccountabilityPartners!: boolean;
  public completedAt!: Date | null;
  public brokenAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Fast.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    type: {
      type: DataTypes.ENUM('daily', 'nightly', 'weekly', 'custom', 'breakthrough'),
      allowNull: false,
      defaultValue: 'custom',
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'active', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'upcoming',
    },
    goal: { type: DataTypes.TEXT, allowNull: true },
    smartGoal: { type: DataTypes.TEXT, allowNull: true, field: 'smart_goal' },
    prayerTimes: { type: DataTypes.JSON, allowNull: true, field: 'prayer_times' },
    verse: { type: DataTypes.TEXT, allowNull: true },
    prayerFocus: { type: DataTypes.STRING(255), allowNull: true, field: 'prayer_focus' },
    startTime: { type: DataTypes.DATE, allowNull: false, field: 'start_time' },
    endTime: { type: DataTypes.DATE, allowNull: false, field: 'end_time' },
    reminderEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'reminder_enabled' },
    widgetEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'widget_enabled' },
  addAccountabilityPartners: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'add_accountability_partners' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    brokenAt: { type: DataTypes.DATE, allowNull: true, field: 'broken_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'Fast',
    tableName: 'fasts',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['start_time'] },
      { fields: ['end_time'] },
    ],
  }
);

export default Fast;
