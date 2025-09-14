import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IFastMessage {
  id: number;
  fastId: number;
  senderId: number;
  recipientId: number;
  body: string;
  attachments?: Array<{ type: string; url: string; name?: string | null }> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type FastMessageCreation = Optional<IFastMessage, 'id' | 'attachments' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

class FastMessage extends Model<IFastMessage, FastMessageCreation> implements IFastMessage {
  public id!: number;
  public fastId!: number;
  public senderId!: number;
  public recipientId!: number;
  public body!: string;
  public attachments!: Array<{ type: string; url: string; name?: string | null }> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

FastMessage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fastId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'fasts', key: 'id' }, field: 'fast_id' },
    senderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'sender_id' },
    recipientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'recipient_id' },
    body: { type: DataTypes.TEXT, allowNull: false },
    attachments: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'FastMessage',
    tableName: 'fast_messages',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['fast_id', 'created_at'] },
      { fields: ['recipient_id', 'created_at'] },
      { fields: ['sender_id', 'created_at'] },
    ],
  }
);

export default FastMessage;
