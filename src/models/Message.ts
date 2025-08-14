import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Group from './Group';
import User from './User';

interface MessageAttributes {
  id: number; // uuid
  groupId: number;
  authorId: number | null; // null when authored by AI
  isAI: boolean;
  aiName: string | null;
  text: string | null;
  parentId: number | null;
  threadCount: number;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type MessageCreationAttributes = Optional<
  MessageAttributes,
  'id' | 'authorId' | 'isAI' | 'aiName' | 'text' | 'parentId' | 'threadCount' | 'pinned' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public groupId!: number;
  public authorId!: number | null;
  public isAI!: boolean;
  public aiName!: string | null;
  public text!: string | null;
  public parentId!: number | null;
  public threadCount!: number;
  public pinned!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'groups', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    isAI: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    aiName: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    threadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    pinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['group_id', 'created_at'] },
      { fields: ['parent_id'] },
      { fields: ['author_id'] },
    ],
  }
);

Message.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
Message.belongsTo(User, { as: 'author', foreignKey: 'authorId' });

export default Message;


