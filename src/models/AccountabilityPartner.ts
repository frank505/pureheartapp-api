import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

/**
 * Interface for AccountabilityPartner model attributes.
 * This defines the shape of an accountability partner record in the database.
 */
export interface IAccountabilityPartner {
  id: number;
  userId: number; // The ID of the user who sent the invitation
  hash: string; // The unique invitation hash value
  receiverId?: number | null; // The ID of the user who accepted the invitation
  usedAt?: Date | null; // The timestamp when the invitation was used
}

/**
 * Interface for creating a new AccountabilityPartner.
 * Some fields are optional during creation.
 */
interface AccountabilityPartnerCreationAttributes extends Optional<IAccountabilityPartner, 'id' | 'receiverId' | 'usedAt'> {}

/**
 * AccountabilityPartner Model Class
 * Represents the 'accountability_partners' table in the database.
 */
class AccountabilityPartner extends Model<IAccountabilityPartner, AccountabilityPartnerCreationAttributes> implements IAccountabilityPartner {
  public id!: number;
  public userId!: number;
  public hash!: string;
  public receiverId!: number | null;
  public usedAt!: Date | null;

  // Timestamps are automatically managed by Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the AccountabilityPartner model with its schema definition
AccountabilityPartner.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // Foreign key for the user who sent the invitation
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // table name
        key: 'id',
      },
      field: 'user_id',
    },
    // The unique hash for the invitation
    hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Foreign key for the user who accepted the invitation
    receiverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users', // table name
        key: 'id',
      },
      field: 'receiver_id',
    },
    // Timestamp for when the invitation was used
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at',
    },
  },
  {
    sequelize,
    modelName: 'AccountabilityPartner',
    tableName: 'accountability_partners',
    timestamps: true,
    underscored: true, // Use snake_case for table columns
    indexes: [
      {
        name: 'uniq_accountability_partners_hash',
        unique: true,
        fields: ['hash'],
      },
    ],
  }
);

export default AccountabilityPartner;

