import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IFastReminderLog {
  id: number;
  fastId: number;
  userId: number;
  dateKey: string; // YYYY-MM-DD
  timeKey: string; // HH:mm
  sentAt: Date;
}

type FastReminderCreation = Optional<IFastReminderLog, 'id' | 'sentAt'>;

class FastReminderLog extends Model<IFastReminderLog, FastReminderCreation> implements IFastReminderLog {
  public id!: number;
  public fastId!: number;
  public userId!: number;
  public dateKey!: string;
  public timeKey!: string;
  public sentAt!: Date;
}

FastReminderLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fastId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'fasts', key: 'id' }, field: 'fast_id' },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    dateKey: { type: DataTypes.STRING(10), allowNull: false, field: 'date_key' },
    timeKey: { type: DataTypes.STRING(5), allowNull: false, field: 'time_key' },
    sentAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'sent_at' },
  },
  {
    sequelize,
    modelName: 'FastReminderLog',
    tableName: 'fast_reminder_logs',
    timestamps: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['fast_id', 'date_key', 'time_key'] },
      { fields: ['user_id'] },
    ],
  }
);

export default FastReminderLog;
