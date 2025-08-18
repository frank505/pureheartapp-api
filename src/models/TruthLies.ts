import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';

export interface ITruthLies {
  id: number;
  userId: number;
  lie: string;
  biblicalTruth: string;
  explanation: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

type TruthLiesCreationAttributes = Optional<ITruthLies, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

class TruthLies extends Model<ITruthLies, TruthLiesCreationAttributes> implements ITruthLies {
  public id!: number;
  public userId!: number;
  public lie!: string;
  public biblicalTruth!: string;
  public explanation!: string;
  public isDefault!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

TruthLies.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    lie: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    biblicalTruth: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'truth_lies',
    paranoid: true,
  }
);

export default TruthLies;
