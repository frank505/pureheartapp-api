import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Victory from './Victory';
import PrayerRequest from './PrayerRequest';

export type GroupPrivacy = 'public' | 'private';

interface GroupAttributes {
  id: number; // uuid
  name: string;
  description?: string | null;
  privacy: GroupPrivacy;
  iconUrl?: string | null;
  ownerId: number;
  membersCount: number;
  aiEnabled: boolean;
  aiModes: string | null; // comma-separated
  aiDeliverTo: string | null;
  inviteCode?: string | null; // for quick join
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type GroupCreationAttributes = Optional<
  GroupAttributes,
  'id' | 'description' | 'iconUrl' | 'membersCount' | 'aiEnabled' | 'aiModes' | 'aiDeliverTo' | 'inviteCode' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class Group extends Model<GroupAttributes, GroupCreationAttributes> implements GroupAttributes {
  public id!: number;
  public name!: string;
  public description?: string | null;
  public privacy!: GroupPrivacy;
  public iconUrl?: string | null;
  public ownerId!: number;
  public membersCount!: number;
  public aiEnabled!: boolean;
  public aiModes!: string | null;
  public aiDeliverTo!: string | null;
  public inviteCode!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Group.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 120],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    privacy: {
      type: DataTypes.ENUM('public', 'private'),
      allowNull: false,
      defaultValue: 'public',
    },
    iconUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    membersCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    aiEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    aiModes: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    aiDeliverTo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    inviteCode: {
      type: DataTypes.STRING(64),
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
    modelName: 'Group',
    tableName: 'groups',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['invite_code'] },
      { fields: ['owner_id'] },
    ],
  }
);

Group.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });
User.hasMany(Group, { as: 'ownedGroups', foreignKey: 'ownerId' });

export default Group;


