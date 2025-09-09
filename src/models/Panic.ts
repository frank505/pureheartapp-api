import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IPanic {
  id: number;
  userId: number;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type PanicCreationAttributes = Optional<IPanic, 'id' | 'message' | 'createdAt' | 'updatedAt'>;

class Panic extends Model<IPanic, PanicCreationAttributes> implements IPanic {
  public id!: number;
  public userId!: number;
  public message?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Panic.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    message: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'Panic',
    tableName: 'panics',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['user_id'] }],
  }
);

export default Panic;
