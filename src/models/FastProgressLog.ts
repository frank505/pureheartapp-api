import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IFastProgressLog {
  id: number;
  fastId: number;
  userId: number;
  hungerLevel?: number | null;
  spiritualClarity?: number | null;
  temptationStrength?: number | null;
  notes?: string | null;
  breakthrough?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type FastProgressCreation = Optional<IFastProgressLog, 'id' | 'hungerLevel' | 'spiritualClarity' | 'temptationStrength' | 'notes' | 'breakthrough' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

class FastProgressLog extends Model<IFastProgressLog, FastProgressCreation> implements IFastProgressLog {
  public id!: number;
  public fastId!: number;
  public userId!: number;
  public hungerLevel!: number | null;
  public spiritualClarity!: number | null;
  public temptationStrength!: number | null;
  public notes!: string | null;
  public breakthrough!: boolean | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

FastProgressLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fastId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'fasts', key: 'id' }, field: 'fast_id' },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    hungerLevel: { type: DataTypes.INTEGER, allowNull: true, field: 'hunger_level' },
    spiritualClarity: { type: DataTypes.INTEGER, allowNull: true, field: 'spiritual_clarity' },
    temptationStrength: { type: DataTypes.INTEGER, allowNull: true, field: 'temptation_strength' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    breakthrough: { type: DataTypes.BOOLEAN, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'FastProgressLog',
    tableName: 'fast_progress_logs',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['fast_id'] },
      { fields: ['user_id'] },
    ],
  }
);

export default FastProgressLog;
