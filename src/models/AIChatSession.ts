import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface AIChatSessionAttributes {
  id: number;
  userId: number;
  title: string | null;
  archived: boolean;
  lastActivityAt: Date;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type AIChatSessionCreationAttributes = Optional<
  AIChatSessionAttributes,
  'id' | 'title' | 'archived' | 'lastActivityAt' | 'metadata' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class AIChatSession extends Model<AIChatSessionAttributes, AIChatSessionCreationAttributes> implements AIChatSessionAttributes {
  public id!: number;
  public userId!: number;
  public title!: string | null;
  public archived!: boolean;
  public lastActivityAt!: Date;
  public metadata!: Record<string, any> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

AIChatSession.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    title: { type: DataTypes.STRING(200), allowNull: true },
    archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastActivityAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    metadata: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'AIChatSession',
    tableName: 'ai_chat_sessions',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'last_activity_at'] },
      { fields: ['archived'] },
    ],
  }
);

AIChatSession.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default AIChatSession;
