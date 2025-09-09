import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface IPanicReply {
  id: number;
  panicId: number;
  userId: number; // replier id
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

type PanicReplyCreationAttributes = Optional<IPanicReply, 'id' | 'createdAt' | 'updatedAt'>;

class PanicReply extends Model<IPanicReply, PanicReplyCreationAttributes> implements IPanicReply {
  public id!: number;
  public panicId!: number;
  public userId!: number;
  public message!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PanicReply.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    panicId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'panic_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    message: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
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
    modelName: 'PanicReply',
    tableName: 'panic_replies',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['panic_id'] }, { fields: ['user_id'] }],
  }
);

export default PanicReply;
