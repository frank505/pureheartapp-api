import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import AccountabilityPartner from './AccountabilityPartner';

export interface IInvitationClick {
  id: number;
  invitationId: number;
  userAgent: string;
  ipAddress: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  invitation?: AccountabilityPartner;
}

interface InvitationClickCreationAttributes
  extends Optional<
    IInvitationClick,
    'id' | 'createdAt' | 'updatedAt' | 'invitation'
  > {}

class InvitationClick
  extends Model<IInvitationClick, InvitationClickCreationAttributes>
  implements IInvitationClick
{
  public id!: number;
  public invitationId!: number;
  public userAgent!: string;
  public ipAddress!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly invitation?: AccountabilityPartner;
}

InvitationClick.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invitationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'accountability_partners',
        key: 'id',
      },
      field: 'invitation_id',
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_agent',
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'ip_address',
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
  },
  {
    sequelize,
    modelName: 'InvitationClick',
    tableName: 'invitation_clicks',
    timestamps: true,
    underscored: true,
  }
);

export default InvitationClick;

