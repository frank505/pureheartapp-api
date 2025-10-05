import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { ICommitment, CommitmentType, CommitmentStatus } from '../types/commitment';
import User from './User';
import Action from './Action';

interface CommitmentCreationAttributes extends Optional<ICommitment, 'id' | 'status' | 'requirePartnerVerification' | 'allowPublicShare' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

class Commitment extends Model<ICommitment, CommitmentCreationAttributes> implements ICommitment {
  public id!: number;
  public userId!: number;
  public commitmentType!: CommitmentType;
  public actionId?: number;
  public customActionDescription?: string;
  public targetDate!: Date;
  public partnerId?: number;
  public requirePartnerVerification!: boolean;
  public allowPublicShare!: boolean;
  public status!: CommitmentStatus;
  public relapseReportedAt?: Date;
  public actionDeadline?: Date;
  public actionCompletedAt?: Date;
  public financialAmount?: number;
  public financialPaidAt?: Date;
  public charityId?: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;
}

Commitment.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    commitmentType: {
      type: DataTypes.ENUM(...Object.values(CommitmentType)),
      allowNull: false,
    },
    actionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'actions',
        key: 'id',
      },
    },
    customActionDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    targetDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    partnerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    requirePartnerVerification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    allowPublicShare: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CommitmentStatus)),
      allowNull: false,
      defaultValue: CommitmentStatus.ACTIVE,
    },
    relapseReportedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actionDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    actionCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    financialAmount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: 'Amount in cents',
    },
    financialPaidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    charityId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'charity_organizations',
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'commitments',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        name: 'idx_user_id',
        fields: ['user_id'],
      },
      {
        name: 'idx_partner_id',
        fields: ['partner_id'],
      },
      {
        name: 'idx_status',
        fields: ['status'],
      },
      {
        name: 'idx_target_date',
        fields: ['target_date'],
      },
      {
        name: 'idx_action_deadline',
        fields: ['action_deadline'],
      },
    ],
  }
);

// Associations
Commitment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Commitment.belongsTo(User, { foreignKey: 'partnerId', as: 'partner' });
Commitment.belongsTo(Action, { foreignKey: 'actionId', as: 'action' });

export default Commitment;
