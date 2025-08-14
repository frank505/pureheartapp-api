import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type NotificationType =
  | 'group_message'
  | 'group_invite'
  | 'group_join_approved'
  | 'accountability_invite_accepted'
  | 'checkin_created'
  | 'prayer_request_created'
  | 'victory_created'
  | 'checkin_commented'
  | 'prayer_request_commented'
  | 'victory_commented'
  | 'generic';

export interface INotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, any> | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type NotificationCreationAttributes = Optional<INotification, 'id' | 'body' | 'data' | 'readAt' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

class Notification extends Model<INotification, NotificationCreationAttributes> implements INotification {
  public id!: number;
  public userId!: number;
  public type!: NotificationType;
  public title!: string;
  public body?: string | null;
  public data?: Record<string, any> | null;
  public readAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date | null;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true },
    },
    body: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    readAt: {
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
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['read_at'] },
      { fields: ['type'] },
    ],
  }
);

export default Notification;


