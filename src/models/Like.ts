import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export type LikeTargetType = 'message' | 'comment';

export interface ILike {
  id: number;
  userId: number; // who liked
  targetType: LikeTargetType;
  targetId: number; // id of message or comment
  createdAt: Date;
}

type LikeCreation = Optional<
  ILike,
  'id' | 'createdAt'
>;

class Like
  extends Model<ILike, LikeCreation>
  implements ILike
{
  public id!: number;
  public userId!: number;
  public targetType!: LikeTargetType;
  public targetId!: number;
  public readonly createdAt!: Date;
}

Like.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' } },
    targetType: { type: DataTypes.ENUM('message', 'comment'), allowNull: false },
    targetId: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Like',
    tableName: 'likes',
    timestamps: false, // only createdAt
    underscored: true,
    indexes: [
      { fields: ['user_id', 'target_type', 'target_id'], unique: true }, // prevent duplicate likes
      { fields: ['target_type', 'target_id', 'created_at'] },
    ],
  }
);

Like.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default Like;
