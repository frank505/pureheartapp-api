import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type FastJournalVisibility = 'private' | 'partner';

export interface IFastJournal {
  id: number;
  fastId: number;
  userId: number;
  title?: string | null;
  body: string;
  attachments?: Array<{ type: string; url: string; name?: string | null }> | null;
  visibility: FastJournalVisibility;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type FastJournalCreation = Optional<
  IFastJournal,
  'id' | 'title' | 'attachments' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

class FastJournal extends Model<IFastJournal, FastJournalCreation> implements IFastJournal {
  public id!: number;
  public fastId!: number;
  public userId!: number;
  public title!: string | null;
  public body!: string;
  public attachments!: Array<{ type: string; url: string; name?: string | null }> | null;
  public visibility!: FastJournalVisibility;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

FastJournal.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fastId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'fasts', key: 'id' }, field: 'fast_id' },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    title: { type: DataTypes.STRING(255), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: false },
    attachments: { type: DataTypes.JSON, allowNull: true },
    visibility: { type: DataTypes.ENUM('private', 'partner'), allowNull: false, defaultValue: 'private' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'FastJournal',
    tableName: 'fast_journals',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['fast_id', 'created_at'] },
      { fields: ['user_id', 'created_at'] },
    ],
  }
);

export default FastJournal;
