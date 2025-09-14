import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';
import Group from './Group';

type JoinRequestStatus = 'pending' | 'approved' | 'declined';

interface GroupJoinRequestAttributes {
  id: number; // uuid
  groupId: number;
  userId: number;
  status: JoinRequestStatus;
  decidedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type GroupJoinRequestCreationAttributes = Optional<
  GroupJoinRequestAttributes,
  'id' | 'status' | 'decidedAt' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

class GroupJoinRequest extends Model<GroupJoinRequestAttributes, GroupJoinRequestCreationAttributes> implements GroupJoinRequestAttributes {
  public id!: number;
  public groupId!: number;
  public userId!: number;
  public status!: JoinRequestStatus;
  public decidedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

GroupJoinRequest.init(
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
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'declined'),
      allowNull: false,
      defaultValue: 'pending',
    },
    decidedAt: {
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
    modelName: 'GroupJoinRequest',
    tableName: 'group_join_requests',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['group_id', 'user_id'] },
      { fields: ['status'] },
    ],
  }
);

GroupJoinRequest.belongsTo(Group, { as: 'group', foreignKey: 'groupId' });
GroupJoinRequest.belongsTo(User, { as: 'user', foreignKey: 'userId' });

export default GroupJoinRequest;


