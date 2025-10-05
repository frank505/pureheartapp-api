import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { IRedemptionWall } from '../types/commitment';
import User from './User';
import Commitment from './Commitment';
import Action from './Action';
import ActionProof from './ActionProof';

interface RedemptionWallCreationAttributes extends Optional<IRedemptionWall, 'id' | 'isAnonymous' | 'userReflection' | 'encouragementCount' | 'commentCount' | 'isVisible' | 'createdAt' | 'updatedAt'> {}

class RedemptionWall extends Model<IRedemptionWall, RedemptionWallCreationAttributes> implements IRedemptionWall {
  public id!: number;
  public commitmentId!: number;
  public userId!: number;
  public actionId!: number;
  public proofId!: number;
  public isAnonymous!: boolean;
  public userReflection?: string;
  public encouragementCount!: number;
  public commentCount!: number;
  public isVisible!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RedemptionWall.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    commitmentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true,
      references: {
        model: 'commitments',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    actionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'actions',
        key: 'id',
      },
    },
    proofId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'action_proofs',
        key: 'id',
      },
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    userReflection: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    encouragementCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    commentCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'redemption_wall',
    timestamps: true,
    indexes: [
      {
        name: 'idx_user_id',
        fields: ['user_id'],
      },
      {
        name: 'idx_action_id',
        fields: ['action_id'],
      },
      {
        name: 'idx_visible',
        fields: ['is_visible'],
      },
      {
        name: 'idx_created_at',
        fields: ['created_at'],
      },
    ],
  }
);

// Associations
RedemptionWall.belongsTo(Commitment, { foreignKey: 'commitmentId', as: 'commitment' });
RedemptionWall.belongsTo(User, { foreignKey: 'userId', as: 'user' });
RedemptionWall.belongsTo(Action, { foreignKey: 'actionId', as: 'action' });
RedemptionWall.belongsTo(ActionProof, { foreignKey: 'proofId', as: 'proof' });

export default RedemptionWall;
