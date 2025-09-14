import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Group from './Group';

export type GroupRole = 'owner' | 'moderator' | 'member';

interface GroupMemberAttributes {
  id: number; // uuid
  groupId: number;
  userId: number;
  role: GroupRole;
  mutedUntil?: Date | null;
  banned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type GroupMemberCreationAttributes = Optional<
  GroupMemberAttributes,
  'id' | 'mutedUntil' | 'banned' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class GroupMember extends Model<GroupMemberAttributes, GroupMemberCreationAttributes> implements GroupMemberAttributes {
  public id!: number;
  public groupId!: number;
  public userId!: number;
  public role!: GroupRole;
  public mutedUntil?: Date | null;
  public banned!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

GroupMember.init(
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
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM('owner', 'moderator', 'member'),
      allowNull: false,
      defaultValue: 'member',
    },
    mutedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    banned: {
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
    modelName: 'GroupMember',
    tableName: 'group_members',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['group_id', 'user_id'] },
      { fields: ['user_id'] },
      { fields: ['group_id'] },
    ],
  }
);

GroupMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });
GroupMember.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
User.belongsToMany(Group, { through: GroupMember, as: 'groups', foreignKey: 'userId', otherKey: 'groupId' });
Group.belongsToMany(User, { through: GroupMember, as: 'members', foreignKey: 'groupId', otherKey: 'userId' });

export default GroupMember;


