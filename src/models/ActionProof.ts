import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { IActionProof, ProofMediaType, RejectionReason } from '../types/commitment';
import User from './User';
import Commitment from './Commitment';

interface ActionProofCreationAttributes extends Optional<IActionProof, 'id' | 'thumbnailUrl' | 'userNotes' | 'latitude' | 'longitude' | 'locationAddress' | 'partnerApproved' | 'verifiedAt' | 'verifiedBy' | 'rejectionReason' | 'rejectionNotes' | 'isLateSubmission' | 'isSuperseded' | 'createdAt' | 'updatedAt'> {}

class ActionProof extends Model<IActionProof, ActionProofCreationAttributes> implements IActionProof {
  public id!: number;
  public commitmentId!: number;
  public userId!: number;
  public mediaType!: ProofMediaType;
  public mediaUrl!: string;
  public thumbnailUrl?: string;
  public userNotes?: string;
  public latitude?: number;
  public longitude?: number;
  public locationAddress?: string;
  public capturedAt!: Date;
  public submittedAt!: Date;
  public partnerApproved?: boolean;
  public verifiedAt?: Date;
  public verifiedBy?: number;
  public rejectionReason?: RejectionReason;
  public rejectionNotes?: string;
  public isLateSubmission!: boolean;
  public isSuperseded!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ActionProof.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    commitmentId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
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
    mediaType: {
      type: DataTypes.ENUM(...Object.values(ProofMediaType)),
      allowNull: false,
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    userNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    locationAddress: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    partnerApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    verifiedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    rejectionReason: {
      type: DataTypes.ENUM(...Object.values(RejectionReason)),
      allowNull: true,
    },
    rejectionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isLateSubmission: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isSuperseded: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'action_proofs',
    timestamps: true,
    indexes: [
      {
        name: 'idx_commitment_id',
        fields: ['commitment_id'],
      },
      {
        name: 'idx_user_id',
        fields: ['user_id'],
      },
      {
        name: 'idx_verified_by',
        fields: ['verified_by'],
      },
      {
        name: 'idx_submitted_at',
        fields: ['submitted_at'],
      },
    ],
  }
);

// Associations
ActionProof.belongsTo(Commitment, { foreignKey: 'commitmentId', as: 'commitment' });
ActionProof.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ActionProof.belongsTo(User, { foreignKey: 'verifiedBy', as: 'verifier' });

export default ActionProof;
