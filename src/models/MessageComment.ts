import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Message from './Message';

export interface IMessageComment {
  id: number;
  userId: number; // author
  messageId: number; // the message being commented on
  body: string;
  mentions?: number[] | null; // userId numbers
  attachments?: Array<{ type: string; url: string; name?: string | null }> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type MessageCommentCreation = Optional<
  IMessageComment,
  'id' | 'mentions' | 'attachments' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

class MessageComment
  extends Model<IMessageComment, MessageCommentCreation>
  implements IMessageComment
{
  public id!: number;
  public userId!: number;
  public messageId!: number;
  public body!: string;
  public mentions!: number[] | null;
  public attachments!: Array<{ type: string; url: string; name?: string | null }> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

MessageComment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
    messageId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'messages', key: 'id' } },
    body: { type: DataTypes.TEXT, allowNull: false },
    mentions: { type: DataTypes.JSON, allowNull: true },
    attachments: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'MessageComment',
    tableName: 'message_comments',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['message_id', 'created_at'] },
      { fields: ['user_id', 'created_at'] },
    ],
  }
);

MessageComment.belongsTo(User, { as: 'author', foreignKey: 'userId' });
MessageComment.belongsTo(Message, { as: 'message', foreignKey: 'messageId' });

export default MessageComment;
