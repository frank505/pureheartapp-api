import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import AIChatSession from './AIChatSession';

export interface AIChatMessageAttributes {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  safetyFlag: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type AIChatMessageCreationAttributes = Optional<
  AIChatMessageAttributes,
  'id' | 'safetyFlag' | 'metadata' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class AIChatMessage extends Model<AIChatMessageAttributes, AIChatMessageCreationAttributes> implements AIChatMessageAttributes {
  public id!: number;
  public sessionId!: number;
  public role!: 'user' | 'assistant' | 'system';
  public content!: string;
  public safetyFlag!: boolean;
  public metadata!: Record<string, any> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

AIChatMessage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ai_chat_sessions', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system'),
      allowNull: false,
    },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    safetyFlag: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    metadata: { type: DataTypes.JSON, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'AIChatMessage',
    tableName: 'ai_chat_messages',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['session_id', 'created_at'] },
      { fields: ['role'] },
    ],
  }
);

AIChatMessage.belongsTo(AIChatSession, { as: 'session', foreignKey: 'sessionId' });
AIChatSession.hasMany(AIChatMessage, { as: 'messages', foreignKey: 'sessionId' });

export default AIChatMessage;
