import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IFastPrayerLog {
  id: number;
  fastId: number;
  userId: number;
  prayerTime?: string | null; // HH:mm when applicable
  loggedAt: Date;
  durationSeconds?: number | null; // from duration like PT10M
  type?: string | null; // e.g., deliverance
  notes?: string | null;
  verseUsed?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type FastPrayerLogCreation = Optional<IFastPrayerLog, 'id' | 'prayerTime' | 'durationSeconds' | 'type' | 'notes' | 'verseUsed' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

class FastPrayerLog extends Model<IFastPrayerLog, FastPrayerLogCreation> implements IFastPrayerLog {
  public id!: number;
  public fastId!: number;
  public userId!: number;
  public prayerTime!: string | null;
  public loggedAt!: Date;
  public durationSeconds!: number | null;
  public type!: string | null;
  public notes!: string | null;
  public verseUsed!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

FastPrayerLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fastId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'fasts', key: 'id' }, field: 'fast_id' },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    prayerTime: { type: DataTypes.STRING(5), allowNull: true, field: 'prayer_time' },
    loggedAt: { type: DataTypes.DATE, allowNull: false, field: 'logged_at' },
    durationSeconds: { type: DataTypes.INTEGER, allowNull: true, field: 'duration_seconds' },
    type: { type: DataTypes.STRING(50), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    verseUsed: { type: DataTypes.STRING(100), allowNull: true, field: 'verse_used' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'FastPrayerLog',
    tableName: 'fast_prayer_logs',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['fast_id'] },
      { fields: ['user_id'] },
      { fields: ['logged_at'] },
    ],
  }
);

export default FastPrayerLog;
