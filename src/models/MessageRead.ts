import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Message from './Message';
import User from './User';

interface MessageReadAttributes {
  messageId: number;
  userId: number;
  readAt: Date;
}

type MessageReadCreationAttributes = Optional<MessageReadAttributes, 'readAt'>;

class MessageRead extends Model<MessageReadAttributes, MessageReadCreationAttributes> implements MessageReadAttributes {
  public messageId!: number;
  public userId!: number;
  public readAt!: Date;
}

MessageRead.init(
  {
    messageId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'messages', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'MessageRead',
    tableName: 'message_reads',
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
    ],
  }
);

MessageRead.belongsTo(Message, { as: 'message', foreignKey: 'messageId' });
MessageRead.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default MessageRead;


