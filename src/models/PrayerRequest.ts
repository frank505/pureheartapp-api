import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type Visibility = 'private' | 'partner' | 'group' | 'public';

export interface IPrayerRequest {
  id: number; // uuid
  userId: number;
  partnerIds?: number[] | null; // accountability partner id
  groupIds?: number[] | null; // references groups.id
  title: string;
  body?: string | null;
  visibility: Visibility;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type PrayerRequestCreation = Optional<IPrayerRequest, 'id' | 'body' | 'partnerIds' | 'groupIds' | 'deletedAt' | 'createdAt' | 'updatedAt'>;

class PrayerRequest extends Model<IPrayerRequest, PrayerRequestCreation> implements IPrayerRequest {
  public id!: number;
  public userId!: number;
  public partnerIds!: number[] | null;
  public groupIds!: number[] | null;
  public title!: string;
  public body!: string | null;
  public visibility!: Visibility;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

PrayerRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    partnerIds: { type: DataTypes.JSON, allowNull: true, field: 'partner_ids' },
    groupIds: { type: DataTypes.JSON, allowNull: true, field: 'group_ids' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: true },
    visibility: { type: DataTypes.ENUM('private', 'partner', 'group', 'public'), allowNull: false, defaultValue: 'partner' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'PrayerRequest',
    tableName: 'prayer_requests',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'created_at'] },
    ],
  }
);

export default PrayerRequest;


