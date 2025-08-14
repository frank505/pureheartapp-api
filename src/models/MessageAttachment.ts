import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Message from './Message';

export type AttachmentType = 'image' | 'file' | 'audio' | 'video' | 'other';

interface MessageAttachmentAttributes {
  id: number; // uuid
  messageId: number;
  type: AttachmentType;
  url: string;
  name: string | null;
  sizeBytes: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type MessageAttachmentCreationAttributes = Optional<
  MessageAttachmentAttributes,
  'id' | 'name' | 'sizeBytes' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class MessageAttachment extends Model<MessageAttachmentAttributes, MessageAttachmentCreationAttributes> implements MessageAttachmentAttributes {
  public id!: number;
  public messageId!: number;
  public type!: AttachmentType;
  public url!: string;
  public name!: string | null;
  public sizeBytes!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

MessageAttachment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'messages', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('image', 'file', 'audio', 'video', 'other'),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'MessageAttachment',
    tableName: 'message_attachments',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['message_id'] },
    ],
  }
);

MessageAttachment.belongsTo(Message, { as: 'message', foreignKey: 'messageId' });

export default MessageAttachment;


