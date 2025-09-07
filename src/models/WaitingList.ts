import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IWaitingList {
  id: number;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type WaitingListCreationAttributes = Optional<IWaitingList, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

class WaitingList extends Model<IWaitingList, WaitingListCreationAttributes> implements IWaitingList {
  public id!: number;
  public email!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date | null;
}

WaitingList.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true,
        len: [5, 255],
      },
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
    modelName: 'WaitingList',
    tableName: 'waiting_list',
    timestamps: true,
    paranoid: true,
    underscored: true,
  // Note: unique index on email can be managed via a migration to avoid repeated ALTER during sync
  }
);

export default WaitingList;
