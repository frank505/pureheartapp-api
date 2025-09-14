import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import AccountabilityPartner from './AccountabilityPartner';

export type CheckInVisibility = 'private' | 'partner' | 'group';
export type CheckInStatus = 'victory' | 'relapse';

export interface IAccountabilityCheckIn {
  id: number; // uuid
  userId: number; // owner
  partnerIds?: number[] | null; // references accountability_partners.id
  groupIds?: number[] | null; // references groups.id
  mood: number; // 0..1
  note?: string | null;
  visibility: CheckInVisibility;
  status: CheckInStatus; // marks whether this check-in was a victory day or a relapse
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type AccountabilityCheckInCreation = Optional<
  IAccountabilityCheckIn,
  'id' | 'partnerIds' | 'groupIds' | 'note' | 'deletedAt' | 'createdAt' | 'updatedAt'
>;

class AccountabilityCheckIn
  extends Model<IAccountabilityCheckIn, AccountabilityCheckInCreation>
  implements IAccountabilityCheckIn
{
  public id!: number;
  public userId!: number;
  public partnerIds!: number[] | null;
  public groupIds!: number[] | null;
  public mood!: number;
  public note!: string | null;
  public visibility!: CheckInVisibility;
  public status!: CheckInStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;

  // Associations
  public static associate(models: any) {
    AccountabilityCheckIn.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    AccountabilityCheckIn.belongsTo(models.AccountabilityPartner, {
      foreignKey: 'partnerIds',
      as: 'partner',
    });
    AccountabilityCheckIn.belongsTo(models.Group, {
      foreignKey: 'groupIds',
      as: 'group',
    });
    AccountabilityCheckIn.hasMany(models.AccountabilityComment, {
      foreignKey: 'targetId',
      constraints: false,
      scope: {
        targetType: 'checkin',
      },
      as: 'comments',
    });
  }
}

AccountabilityCheckIn.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, field: 'user_id' },
    partnerIds: { type: DataTypes.JSON, allowNull: true, field: 'partner_ids' },
    groupIds: { type: DataTypes.JSON, allowNull: true, field: 'group_ids' },
    mood: { type: DataTypes.DECIMAL(3, 2), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    visibility: { type: DataTypes.ENUM('private', 'partner', 'group'), allowNull: false, defaultValue: 'private' },
  status: { type: DataTypes.ENUM('victory', 'relapse'), allowNull: false, defaultValue: 'victory' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    sequelize,
    modelName: 'AccountabilityCheckIn',
    tableName: 'accountability_checkins',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id', 'created_at'] },
    ],
  }
);

export default AccountabilityCheckIn;


