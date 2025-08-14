import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Group from './Group';

type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

interface GroupInviteAttributes {
  id: number; // uuid
  groupId: number;
  email: string | null;
  status: InviteStatus;
  code: string | null; // optional single-use
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type GroupInviteCreationAttributes = Optional<
  GroupInviteAttributes,
  'id' | 'email' | 'status' | 'code' | 'expiresAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class GroupInvite extends Model<GroupInviteAttributes, GroupInviteCreationAttributes> implements GroupInviteAttributes {
  public id!: number;
  public groupId!: number;
  public email!: string | null;
  public status!: InviteStatus;
  public code!: string | null;
  public expiresAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

GroupInvite.init(
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isEmail: true },
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'revoked', 'expired'),
      allowNull: false,
      defaultValue: 'pending',
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
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
    modelName: 'GroupInvite',
    tableName: 'group_invites',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['group_id'] },
      { fields: ['email'] },
      { unique: true, fields: ['code'] },
    ],
  }
);

GroupInvite.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });

export default GroupInvite;


