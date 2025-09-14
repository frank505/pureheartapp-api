import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface IUserFirsts {
  id: number;
  userId: number;
  hasCreatedFast: boolean;
  hasCreatedPrivateCommunity: boolean;
  hasJoinedReddit: boolean;
  hasAddedAPartner: boolean;
  hasMadeAPrayerRequest: boolean;
  hasSharedAVictory: boolean;
  hasSharedWithAFriend: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserFirstsCreation = Optional<
  IUserFirsts,
  | 'id'
  | 'hasCreatedFast'
  | 'hasCreatedPrivateCommunity'
  | 'hasJoinedReddit'
  | 'hasAddedAPartner'
  | 'hasMadeAPrayerRequest'
  | 'hasSharedAVictory'
  | 'hasSharedWithAFriend'
  | 'createdAt'
  | 'updatedAt'
>;

class UserFirsts extends Model<IUserFirsts, UserFirstsCreation> implements IUserFirsts {
  public id!: number;
  public userId!: number;
  public hasCreatedFast!: boolean;
  public hasCreatedPrivateCommunity!: boolean;
  public hasJoinedReddit!: boolean;
  public hasAddedAPartner!: boolean;
  public hasMadeAPrayerRequest!: boolean;
  public hasSharedAVictory!: boolean;
  public hasSharedWithAFriend!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserFirsts.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, references: { model: User, key: 'id' }, field: 'user_id' },
    hasCreatedFast: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_created_fast' },
    hasCreatedPrivateCommunity: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_created_private_community' },
    hasJoinedReddit: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_joined_reddit' },
    hasAddedAPartner: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_added_a_partner' },
    hasMadeAPrayerRequest: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_made_a_prayer_request' },
    hasSharedAVictory: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_shared_a_victory' },
    hasSharedWithAFriend: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'has_shared_with_a_friend' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    modelName: 'UserFirsts',
    tableName: 'user_firsts',
    timestamps: true,
    underscored: true,
  }
);

// Associations are defined centrally in src/models/index.ts to avoid duplicates

export default UserFirsts;
